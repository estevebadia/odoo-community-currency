# Odoo Point of Sale integration of Komunitin accounting protocol
**This addon is a proof of Concept, don't use it in prodyuction environment**

This Odoo addon allows to add a new payment method in Point of Sale so that it instantly charges the required amount from the customer using the [Komunitin accounting protocol](https://github.com/komunitin/komunitin-api/blob/master/accounting/).

## Configuration
1. Activate the developer mode
2. While in developer mode, go to Point of Sale > Configuration > Komunitin Configuration
3. Enter your credentials for accessing the Komunitin accounting protocol.
4. Go to Pomint of Sale > Configuration > Payemnt Methods and create a new one.
5. Under *Point of sale*, select Use in point of Sale and then select the Komunitin credentials.
6. Now you have a new option to pay by Community Currency in a sale.
