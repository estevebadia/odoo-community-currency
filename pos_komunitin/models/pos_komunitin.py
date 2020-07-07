# -*- coding: utf-8 -*-
"""Define and extend models for the Komunitin Point Of Sale addon.
"""
from odoo import models, fields, api


class PosKomunitinConfiguration(models.Model):
    """Merchand configuration parameters for the Community Currency payment gateway integration
    using the Komunitin API.
    """
    _name = 'pos_komunitin.configuration'
    _description = 'Point of Sale Komunitin Configuration'

    name = fields.Char(
        required=True, help='Name of this Komunitin Configuration')
    auth_url = fields.Char(string='Auth API URL', required=True, default='https://integralces.net/oauth2',
                           help='URL where to find the Komunitin authorization API.')
    accounting_url = fields.Char(string='Accounting API URL', required=True, default='https://integralces.net/ces/api/accounting',
                                 help='URL where to find the Komunitin accounting protocol API.')
    # Email & password have restricted access.
    email = fields.Char(string='Merchand email', required=True, groups='point_of_sale.group_pos_manager',
                        help='Email of the merchant to authenticate them on the payment provider server.')
    password = fields.Char(string='Merchant Password', required=True, groups='point_of_sale.group_pos_manager',
                           help='Password of the merchant to authenticate them on the payment provider server.')
    currency = fields.Char(string="Merchand currency", required=True,
                        help='The code of the merchand currency. Usually the first 4 letters of the account. Ex: "ABCD".')
    currency_value = fields.Float(string="Currency value", required=True, default=100,
                                  help='Constant to apply to currency amounts before sending to komunitin API. Includes the currency value and the currency scale.')


class PosKomunitinAuthorization(models.Model):
    """Saved authorization tokens.
    """
    _name = 'pos_komunitin.authorization'
    _description = 'Komunitin API OAuth2 authorization tokens'
    
    configuration = fields.Many2one(
        'pos_komunitin.configuration', string='Komunitin configuration', required=True, ondelete='cascade')
    access_token = fields.Char(string='OAuth2 access token', required=True)
    acess_token_expiry = fields.Datetime(string='Access token expire time', required=True)
    created = fields.Datetime(string='Token creatin time', required=True)

# This class is replaced in Odoo 13+ by PosPayment.
class AccountBankStatementLine(models.Model):
    """Point of Sale payment object identifying the transaction in the Komunitin API.
    """
    _inherit = "account.bank.statement.line"

    komunitin_transaction_id = fields.Char(
        string='Transaction id', size=36, help='The transaction unique identifier.')
    komunitin_payer = fields.Char(
        string='Payer account', help='The payer account code.')
    komunitin_amount = fields.Integer(string='Community Currency Amount',
                                      help='The amount in community currency scaled as appearing in transaction.')

# This class is replaced in Odoo 13+ by PosPaymentMethod.
class AccountJournal(models.Model):
    """Add a reference to the Komunitin configuration object to this Account Journal. The existence of an
    Account Journal linked with a Komunitin configuration and enabled to be used in Point of Sale is
    what makes the Community Currency option available.
    """
    _inherit = 'account.journal'

    pos_komunitin_config = fields.Many2one(
        'pos_komunitin.configuration', string='Komunitin configuration', help='The configuration of Komunitin used for this journal')


class PosOrder(models.Model):
    """Extend features of PosOrder so they include Komunitin payments data.
    """
    _inherit = "pos.order"

    def _payment_fields(self, ui_paymentline):
        """Add komunitin fields to the arguments of add_payment function.
        """
        payment_fields = super(PosOrder, self)._payment_fields(ui_paymentline)

        payment_fields.update({
            'komunitin_transaction_id': ui_paymentline.get('komunitin_transaction_id'),
            'komunitin_payer': ui_paymentline.get('komunitin_payer'),
            'komunitin_amount': ui_paymentline.get('komunitin_amount')
        })

        return payment_fields

    def _prepare_bank_statement_line_payment_values(self, data):
        """Add komunitin fields to the statement_line to be created by add_payment function.
        """
        args = super(PosOrder, self)._prepare_bank_statement_line_payment_values(data)
        args.update({
            'komunitin_transaction_id': data['komunitin_transaction_id'],
            'komunitin_payer': data['komunitin_payer'],
            'komunitin_amount': data['komunitin_amount']
        })
        return args
