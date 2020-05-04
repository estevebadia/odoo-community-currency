odoo.define("pos_komunitin.pos_komunitin", function (require) {
    "use strict";

    // Import other modules.
    var rpc = require("web.rpc");
    var screens = require("point_of_sale.screens");
    var models = require("point_of_sale.models");
    var gui = require("point_of_sale.gui");
    var PopupWidget = require("point_of_sale.popups");

    /**
     * This function creates a random UUID. I've not been able to use sucha a function in Odoo JS imported
     * libraries and don't want to create a dependency just for that.
     */
    var createUUID = (function (uuidRegEx, uuidReplacer) {
        return function () {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                uuidRegEx,
                uuidReplacer
            );
        };
    })(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 3) | 8;
        return v.toString(16);
    });

    /**
     * This is a reimplementation of PoS TextInputPopupWidget just to overcome a bug
     * with keyboard events in payments screen.
     */
    var PosPaymentsScreenTextInputPopupWidget = PopupWidget.extend({
        template: "PosPaymentsScreenTextInputPopupWidget",
        show: function (options) {
            options = options || {};
            this._super(options);

            this.renderElement();
            this.$("input").focus();

            // The Point of Sale PaymentScreenWidget intercepts all keyboard events and
            // prevents the default action, the text field in the popup does not work.
            // Preventing default is not a best practice, so we'll probably be able to
            // get rid of this 'patch' widget in future releases of PoS.
            var stop = function (event) {
                event.stopPropagation();
            };
            this.$("input").keypress(stop).keydown(stop);
        },
        click_confirm: function () {
            var value = this.$("input").val();
            this.gui.close_popup();
            if (this.options.confirm) {
                this.options.confirm.call(this, value);
            }
        },
    });

    gui.define_popup({
        name: "paymentstextinput",
        widget: PosPaymentsScreenTextInputPopupWidget,
    });

    /**
     * This is a basic loading alert.
     */
    var PosLoadingPopupWidget = PopupWidget.extend({
        template: "PosLoadingPopupWidget",
    });

    gui.define_popup({
        name: "loading",
        widget: PosLoadingPopupWidget,
    });

    /**
     * This is a confirm popup with some added features to the standard Pos confirm dialog.
     */
    var PosPaymentConfirmPopupWidget = PopupWidget.extend({
        template: "ConfirmPopupWidget",
    });

    gui.define_popup({
        name: "paymentconfirm",
        widget: PosPaymentConfirmPopupWidget,
    });

    // For some reason POS models (still) don't use the standard Odoo JS
    // framework that allows the _super call, so we have to directly work
    // with the prototype here. I'll probably change on future releases of
    // POS.
    var paymentlineSuper = models.Paymentline.prototype;
    /**
     * Extend Paymentline model so that when it is exported/imported to/from
     * JSON it also includes the komunitin extra fields, so they get sent to
     * the backend when the order is fulfilled.
     */
    models.Paymentline = models.Paymentline.extend({
        init_from_JSON: function (json) {
            paymentlineSuper.init_from_JSON.apply(this, arguments);

            this.komunitin_transaction_id = json.komunitin_transaction_id;
            this.komunitin_payer = json.komunitin_payer;
            this.komunitin_amount = json.komunitin_amount;
            this.komunitin_paid = json.komunitin_paid;
        },
        export_as_JSON: function () {
            // See comment in init_from_JSON().
            var json = paymentlineSuper.export_as_JSON.apply(this, arguments);
            json.komunitin_transaction_id = this.komunitin_transaction_id;
            json.komunitin_payer = this.komunitin_payer;
            json.komunitin_amount = this.komunitin_amount;
            json.komunitin_paid = this.komunitin_paid;
            return json;
        },
    });

    // Load the field pos_komunitin_config in account.journal objects so we can
    // know if the journal is related to this module.
    models.load_fields("account.journal", ["pos_komunitin_config", "bank_id"]);
    // Load pos_komunitin_config objects.
    models.load_models(
        {
            model: "pos_komunitin.configuration",
            label: "Komunitin configuration",
            ids: function (self) {
                return self.journals.map(function (journal) {
                    // The field journal.pos_komunitin_config is an array [id, name].
                    return journal.pos_komunitin_config[0];
                });
            },
            loaded: function (self, configs) {
                self.pos_komunitin_configs = configs;
            },
        },
        {
            after: "account.journal",
        }
    );
    // Load the komunitin bank accounts in res.partner objects.
    models.load_fields("res.partner", "bank_ids");
    // Load bank account objects for clients
    models.load_models(
        {
            model: "res.partner.bank",
            label: "Komunitin bank accounts",
            fields: ["bank_id", "partner_id", "acc_number"],
            // Get only the records related to loaded partners and to the banks
            domain: function (self) {
                return [
                    [
                        "partner_id",
                        "in",
                        self.partners.map(function (partner) {
                            return partner.id;
                        }),
                    ],
                    [
                        "bank_id",
                        "in",
                        self.journals
                            .filter(function (journal) {
                                return journal.pos_komunitin_config;
                            })
                            .map(function (journal) {
                                return journal.bank_id[0];
                            }),
                    ],
                ];
            },
            loaded: function (self, bankAccounts) {
                // Put bankaccount to partner.komunitin_bank_account.
                bankAccounts.forEach(function (bankAccount) {
                    // Find the partner associated with this bank account.
                    var partner = _.find(self.partners, function (partner) {
                        return partner.id === bankAccount.partner_id[0];
                    });
                    // Save the bankAccount as a partner property.
                    if (partner.komunitin_bank_accounts === undefined) {
                        partner.komunitin_bank_accounts = [];
                    }
                    partner.komunitin_bank_accounts.push(bankAccount);
                });
            },
        },
        {
            // we need both account.journal and res.partner, but account.journal
            // loads after res.partner and we can set only one.
            after: "account.journal",
        }
    );

    /**
     * Extend the PaymentsScreenWidged so when the user has a Komunitin
     * paymentline and clicks validate, the payment is actually performed
     * using teh API.
     */
    screens.PaymentScreenWidget.include({
        get_config: function (paymentline) {
            var id = paymentline.cashregister.journal.pos_komunitin_config[0];
            return _.find(this.pos.pos_komunitin_configs, function (config) {
                return config.id === id;
            });
        },
        get_client_bank_accounts(journal) {
            var client = this.pos.get_client();
            if (client && client.komunitin_bank_accounts) {
                return client.komunitin_bank_accounts.filter(function (
                    account
                ) {
                    return account.bank_id[0] === journal.bank_id[0];
                });
            }
            return [];
        },
        /**
         * Performs the remote payment when user clicks on the [ Validate >> ] button.
         *
         * @param forceValidation Param used by the parent function.
         */
        validate_order: function (forceValidation) {
            // Check if there is a payment line with this module.
            var order = this.pos.get_order();
            var lines = order.get_paymentlines();
            var self = this;

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].cashregister.journal.pos_komunitin_config) {
                    // This is a line associated to a komunitin journal.
                    if (!lines[i].komunitin_paid) {
                        this.do_payment(lines[i]).then(function () {
                            self.validate_order(forceValidation);
                        });
                        // Still don't validate the order. However validate_order function will be
                        // called again after do_payment() with lines[i].komunitin_paid = true.
                        return;
                    }
                }
            }

            return this._super(forceValidation);
        },
        /**
         * Return the account to be used to charge the givent paymentline.
         *
         * This function is asynchronous because it depends on user choice if
         * there are more than one defined accounts.
         *
         * @param {models.Paymentline} paymentline
         *
         * @return {$.Deferred} Promise with the payer account number.
         *
         */
        get_payer_account: function (paymentline) {
            var def = new $.Deferred();
            var client = this.pos.get_client();
            if (!client) {
                this.gui.show_popup("error", {
                    title: "Missing client",
                    body:
                        "Set a customer with a valid account before validating this payment.",
                    cancel: function () {
                        // Delete pending payment.
                        def.reject("Mising client");
                    },
                });
                return def;
            }

            // Get the account numbers related to this client and payment method.
            var accounts = this.get_client_bank_accounts(
                paymentline.cashregister.journal
            ).map(function (account) {
                return account.acc_number;
            });

            if (accounts.length === 0) {
                this.gui.show_popup("error", {
                    title: "Missing Community Currency account",
                    body:
                        "The selected client does not have a Community Currency bank account for this payment method.",
                    cancel: function () {
                        // Delete pending payment.
                        def.reject("Mising proper bank account client");
                    },
                });
                return def;
            }

            if (accounts.length > 1) {
                // The customer has more than one account. Choose only one.
                this.gui.show_popup("selection", {
                    title:
                        "Choose the Community Currency account from where to pay",
                    list: accounts.map(function (account) {
                        return { label: account, item: account };
                    }),
                    confirm: function (item) {
                        def.resolve(item);
                    },
                    cancel: function () {
                        // user chose nothing
                        def.reject("Bank account not chosen.");
                    },
                });
                return def;
            }

            // There is only one available account for the selected client.
            def.resolve(accounts[0]);
            return def;
        },
        /**
         * Perform a payment using the Komunitin accounting protocol.
         *
         * @param {models.Paymentline} paymentline
         *
         * @return {$.Deferred} It is resolved on a committed payment, and rejected on a cancelled one.
         */
        do_payment: function (paymentline) {
            var self = this;

            // Payer account.
            if (!paymentline.komunitin_payer) {
                return this.get_payer_account(paymentline).then(function (
                    account
                ) {
                    paymentline.komunitin_payer = account;
                    return self.do_payment(paymentline).fail(function (error) {
                        paymentline.komunitin_payer = undefined;
                    });
                });
            }

            // Build transaction description text.
            var receipt = this.pos.get_order().export_for_printing();
            var description = receipt.orderlines.reduce(function (
                text,
                orderline
            ) {
                return (
                    text +
                    orderline.quantity +
                    " " +
                    orderline.product_name_wrapped +
                    "\n"
                );
            },
            "");

            // Transaction definition.
            if (!paymentline.komunitin_transaction_id) {
                // Transaction id must be created on client side to avoid duplicates.
                paymentline.komunitin_transaction_id = createUUID();
                // Compute the amount in komunitin currency units.
                var config = this.get_config(paymentline);
                paymentline.komunitin_amount = Math.round(
                    paymentline.get_amount() * config.currency_value
                );
            }

            // Open informative popup. It will be closed after handling the payment.
            this.gui.show_popup("loading", {
                body: _.str.sprintf(
                    "Charging %s to the community currency account %s...",
                    self.format_currency(paymentline.get_amount()),
                    paymentline.komunitin_payer
                ),
            });

            var data = {
                journal_id: paymentline.cashregister.journal.id,
                payer: paymentline.komunitin_payer,
                amount: paymentline.komunitin_amount,
                transaction_id: paymentline.komunitin_transaction_id,
                meta: description,
            };

            return rpc
                .query({
                    model: "pos_komunitin.komunitin_transaction",
                    method: "do_payment",
                    args: [data],
                })
                .fail(function (error) {
                    return self.handle_payment_error(
                        error.data.message,
                        paymentline
                    );
                })
                .then(function (response) {
                    return self.handle_payment_response(response, paymentline);
                });
        },
        /**
         * Fetches a payment using the Komunitin accounting protocol.
         *
         * @param {models.Paymentline} paymentline
         *
         * @return {$.Deferred} promise. It is resolved on a committed payment, and rejected on a cancelled one.
         */
        get_payment: function (paymentline) {
            var self = this;
            var data = {
                journal_id: paymentline.cashregister.journal.id,
                transaction_id: paymentline.komunitin_transaction_id,
            };
            // Open informative popup.
            this.gui.show_popup("loading", {
                body: _.str.sprintf(
                    "Getting transaction %s...",
                    paymentline.komunitin_transaction_id
                ),
            });

            return rpc
                .query({
                    model: "pos_komunitin.komunitin_transaction",
                    method: "get_payment",
                    args: [data],
                })
                .fail(function (error) {
                    return self.handle_payment_error(
                        error.data.message,
                        paymentline
                    );
                })
                .then(function (response) {
                    return self.handle_payment_response(response, paymentline);
                });
        },
        /**
         * Deletes a payment using the Komunitin accounting protocol.
         * @param {models.Paymentline} paymentline
         */
        delete_payment: function (paymentline) {
            var self = this;
            var data = {
                journal_id: paymentline.cashregister.journal.id,
                transaction_id: paymentline.komunitin_transaction_id,
            };
            // Open informative popup.
            this.gui.show_popup("loading", {
                body: _.str.sprintf(
                    "Deleting transaction %s...",
                    paymentline.komunitin_transaction_id
                ),
            });
            return rpc
                .query({
                    model: "pos_komunitin.komunitin_transaction",
                    method: "delete_payment",
                    args: [data],
                })
                .fail(function (error) {
                    return self.handle_payment_error(
                        error.data.message,
                        paymentline
                    );
                })
                .then(function () {
                    return self.handle_payment_deleted(paymentline);
                });
        },

        /**
         * Async function. Handles the response of a komunitin transaction
         * opertion (dp_payment or get_payment) using the user input through
         * popup windows.
         *
         * The promise gets resolved on a successful payment acknowledged by the user.
         * The promise gets rejected on a deleted payment acknowledged by the user.
         * The promise does not get resolved nor rejected in cases of error or pending,
         * state, since it waits for user interaction.
         *
         * @param {json} response
         * @param {models.Paymentline} paymentline
         */
        handle_payment_response: function (response, paymentline) {
            var def = new $.Deferred();

            var self = this;
            var result = response.data;
            var state = result.attributes.state;

            // Save transaction values to paymentline object.
            paymentline.komunitin_transaction_id = result.id;

            var transfer = result.attributes.transfers[0];
            // Get just the last element in payer URL.
            var payer = transfer.payer.split("/").pop();
            paymentline.komunitin_payer = payer;
            // Update komunitin_amount
            paymentline.komunitin_amount = transfer.amount;

            if (state === "committed") {
                // All right! The payment has been successfully performed!
                paymentline.komunitin_paid = true;

                // Acknowledge and resolve promise.
                var config = this.get_config(paymentline);
                var amount =
                    paymentline.komunitin_amount / config.currency_value;

                this.gui.show_popup("alert", {
                    title: "Payment successful",
                    body: _.str.sprintf(
                        "Sucessfully charged %s from %s",
                        self.format_currency(amount),
                        payer
                    ),
                    cancel: function () {
                        // Closes popup.
                        def.resolve(result);
                    },
                });
            } else if (state === "pending") {
                // The payment is pending acceptance. Show a popup to let the user decide.
                this.gui.show_popup("paymentconfirm", {
                    error: true,
                    title: "Payment pending acceptance",
                    body:
                        "The customer needs to manually accept the payment. They may do it right now or otherwise delete this transaction and pay by other means.",
                    confirmLabel: "Refresh",
                    cancelLabel: "Delete",
                    confirm: function () {
                        // Get the updated state of the payment.
                        self.get_payment(paymentline)
                            .then(function (result) {
                                def.resolve(result);
                            })
                            .fail(function (error) {
                                def.reject(error);
                            });
                    },
                    cancel: function () {
                        // Delete pending payment.
                        self.delete_payment(paymentline)
                            .then(function (result) {
                                def.resolve(result);
                            })
                            .fail(function (error) {
                                def.reject(error);
                            });
                    },
                });
            } else if (state === "rejected") {
                this.gui.show_popup("paymentconfirm", {
                    error: true,
                    title: "Payment rejected",
                    body: _.str.sprintf(
                        "Payment from account %s has been rejected. You can delete this payment or pay by other means.",
                        paymentline.komunitin_payer
                    ),
                    confirmLabel: "OK",
                    cancelLabel: "Delete",
                    confirm: function () {
                        // Closes popup.
                        def.reject("Payment rejected");
                    },
                    cancel: function () {
                        self.delete_payment(paymentline)
                            .then(function (result) {
                                def.resolve(result);
                            })
                            .fail(function (error) {
                                def.reject(error);
                            });
                    },
                });
            } else if (state === "deleted") {
                return this.handle_payment_deleted(paymentline);
            } else {
                return this.handle_payment_error(
                    "Unexpected transaction state",
                    paymentline
                );
            }
            return def;
        },
        /**
         * Show acknowledge message to the user for a deleted/rejected transaction and allow
         * them to retry or cancel.
         *
         * @param {models.Paymentline} paymentline
         * @returns {$.Deferred} Resolves on a successful payment after retry.
         */
        handle_payment_deleted: function (paymentline) {
            var def = new $.Deferred();
            paymentline.komunitin_transaction_id = undefined;
            this.gui.show_popup("alert", {
                title: "Payment deleted",
                body: _.str.sprintf(
                    "Payment from account %s has been deleted. You can retry the payment or pay by other means.",
                    paymentline.komunitin_payer
                ),
                cancel: function () {
                    def.reject("Payment deleted");
                },
            });
            return def;
        },

        /**
         * Handle errors just by showing an informative popup.
         */
        handle_payment_error: function (error, paymentline) {
            var def = new $.Deferred();

            console.error(error);
            console.error(paymentline);

            this.gui.show_popup("error", {
                title: "Error occurred",
                body: error,
                cancel: function () {
                    // Delete pending payment.
                    def.reject("Payment error");
                },
            });

            return def;
        },
    });
});
