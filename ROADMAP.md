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

### Automatic payment to suppliers

Pay supplier bills in cummunity currency directly from Odoo with a Pay button. Automatically mark this payed orders accordingly.
