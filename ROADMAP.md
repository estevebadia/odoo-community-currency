# Roadmap

## Requirements

The following are the detailed requirements for community currency management in SuperCoop Manresa, in no particular order.

### [R1] Community currency in POS

Register payments with community currency in Point of Sale. The system should anotate this payments in a journal so that an employee can later manually use the community currency system to perform the charges and manually mark payments as done. The system should know which accounts are allowed to pay with community currency and list the community currency account along with the payment to ease the process of performing the charges.

### [R2] Community currency payments to suppliers

Register payments to suppliers with community currency. Output a list with all payments to be done to each supplier along with the supplier's community currency account number. Fulfilled payments are marked manually.

### [R3] Export payments to suppliers

Export a CSV file from Odoo that can be imported to the Community Currency system so that it performs the transactions in batch mode.

Note that the current community currency system does not support this feature but it could be developed as well.

### [R4] Export of payments from customers

Like [R3], export a file with all charges to be done to customers, that can later be processed in batch by the community currency system.

### [R5] Reconciliation of payments to suppliers

Export a file from the community currency system with last movements. Import this list to Odoo and automatically mark the fulfilled payments to suppliers. Alternatively, use the Komunitin protocol API to get the list of transactions from the community currency system and perform the reconciliation of payments to suppliers.

### [R6] Reconciliation of payments from customers

Like [R5], take the exported file with last movements and reconcile the payments from customers, or fetch teh list directly from the community currency system API.

### [R7] Automatic charge from POS

From the Point of Sale, automatically charge the needed amount from the customer community currency amount, and mark the payment as fulfilled if it was so.

Use the [Komunitin accounting protocol](https://github.com/komunitin/komunitin-api/blob/master/accounting/README.md) for that, provided by [IntegralCES](https://integralces.net) platform. Note that the API allows to perform charges directly from the payee account. However, this charges may become commited, rejected or pending acceptance. In the pending case, a dialog should appear with options "Check again" or "Cancel". In the first case, the TPV will ask the API again (since the user may have just accepted the payment though their phone). In the second case the transaction will be rejected and the payment will need to be done with another method.

### [R8] Automatic payment to suppliers

Pay supplier bills in cummunity currency directly from Odoo with a Pay button. Automatically mark this payed orders accordingly.

Use the Komunitin accounting protocol. Note that the protocol allows to perform payments in addition to charges, and that they may also be rejected or pending acceptance (although it is not common that accounts don't automatically accept payments).

### [R9] Accounting (spanish law)

Community currency is legally just a payment method so it only has to be taken in count when the transacion is commited and its value needs to be established against the national currency.

An account needs to be opened in supgroup 55: Other non-banking accounts (it is suggested to use _5521: Community currency account_). This account will be used only when the system needs to record actual payments, along with bank or cash accounts.

See _[Grama, tratamiento fiscal y contable](https://www.gramenet.cat/es/sites/moneda-local/normativa-y-documentos/tratamiento-fiscal-y-contable/)_ for more on community currency accounting.

## Priorization

### [P1] Phase 1

In the first phase, define a way to record incoming and outgoing payments in community currency in the system, so users can manually keep track on them.
 - **[R1] Community currency in POS**
 - **[R2] Community currency payments to suppliers**
 - **[R9] Accounting (spanish law)**

That is the **Minimal Viable Product**. It is sufficient for the activity to start, though it is error prone, time consuming for workers and it does not give immediate feedback to customers. Furthermore, some payments may be rejected by the system (insufficient funds, for example) when the worker performs them, so it will carry an extra work to contact with customers and balance the debt. The [R7] in this phase actually means that the accounting for community currency does not give extra work compared to other conventional curency accounts.

### [P2] Phase 2

The second phase is the automatic payment from Point of Sale:
 - **[R7] Automatic charge from POS**

 That would give a good user experience for customers and significantly reduce the amount of work and errors by the workers. That would be the so-called **Minimum Lovable Product**. Payments to suppliers are still done manually.

### [P2b] Phase 2b

If the [P2] Phase 2 is too difficult for any reason, it may be replaced by this alternative:
 - **[R4] Export of payments from customers**
 - **[R6] Reconciliation of payments from customers**

This alternative doesn't provide immediate feedback to customer and still there may be payments that are not possible to fulfill since the process is asynchronous, but will remove most human errors and reduce the workload.

### [P3] Phase 3

Automatize payments to suppliers, either with a direct pay button or with a file export of payments list being able to be imported into the community currency system and automatic reconciliation of this payments.
 - **[R8] Automatic payment to suppliers**

 or
 - **[R3] Export payments to suppliers**
 - **[R6] Reconciliation of payments from customers**

It still needs to be analyzed which of these alternatives is better, but it can be done at the end of the previous phase.