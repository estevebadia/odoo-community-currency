# Roadmap

## Requirements

### Community currency in POS

Register payments with community currency in Point of Sale. The system should anotate this payments in a journal so that an employee can later manually use the community currency system to perform the charges and manually mark payments as done. The system should know which accounts are allowed to pay with community currency and list the community currency account along with the payment to ease the process of performing the charges.

### Community currency payments to suppliers

Register payments to suppliers with community currency. Output a list with all payments to be done to each supplier along with the supplier's community currency account number. Fulfilled payments are marked manually.

### Reconciliation of payments

From the community currency movements list, automatically mark the fulfilled payments to suppliers.

### Reconciliation of charges

From the community currency movements list, automatically mark the fulfilled charges from customers.

### Automatic charge from POS

From the Point of Sale, automatically charge the needed amount from the customer community currency amount, and mark the payment as fulfilled if it was so.

Use the [Komunitin accounting protocol](https://github.com/komunitin/komunitin-api/blob/master/accounting/README.md) for that, provided by [IntegralCES](https://integralces.net) platform. Note that the API allows to perform charges directly from the payee account. However, this charges may become commited, rejected or pending acceptance. In a first iteration, it is ok to just reject charges that are not immediately accepted by the payment gateway: customers will have to configure their account so that charges from the entity are automatically accepted.

### Automatic payment to suppliers

Pay supplier bills in cummunity currency directly from Odoo with a Pay button. Automatically mark this payed orders accordingly.

Use the Komunitin accounting protocol. Note that the protocol allows to perform payments in addition to charges, and that they may also be rejected or pending acceptance (although it is not common that accounts don't automatically accept payments).

### Accounting (spanish law)

Community currency is legally just a payment method so it only has to be taken in count when the transacion is commited and its value needs to be established against the national currency.

An account needs to be opened in supgroup 55: Other non-banking accounts (it is suggested to use _5521: Community currency account_). This account will be used only when the system needs to record actual payments, along with bank or cash accounts.

See _[Grama, tratamiento fiscal y contable](https://www.gramenet.cat/es/sites/moneda-local/normativa-y-documentos/tratamiento-fiscal-y-contable/)_ for more on community currency accounting.

