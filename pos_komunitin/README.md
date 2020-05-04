# Odoo Point of Sale integration of Komunitin accounting protocol
**This addon is a proof of Concept, don't use it in prodyuction environment**

This Odoo addon allows to add a new payment method in Point of Sale so that it instantly charges the required amount from the customer using the [Komunitin accounting protocol](https://github.com/komunitin/komunitin-api/blob/master/accounting/).

## Set up
Before installing this addon, you must have a working instance of Odoo 12 with the Point of Sale App.

### 1. Install the addon
1. Download the folder `pos_komunitin` from this repository and place its contents in the addons folder, usually `/mnt/extra-addons/`.
2. Go to *Apps* and in the search bar remove the `Apps` tag and search for `komunitin`. Then install the *Komunitin Payments* addon.

### 2. Create the company bank account
1. Go to *Settings* and click the *Set up* button under your company section.  
2. Click on the *Partner* value.
3. Click the *Edit* button, then select the tab *Invoicing*.
4. Under *Bank accounts* section, click *Add a line*.
5. Under *Bank*, chose *Create and Edit...* to create a new bank.
6. Set a descriptive name for the bank record such as *Springfield city local currency*. You may fill the other fields or leave them blank.
7. Click *Save* to save the new Bank. Community currency accounts will be related to rhis bank.
8. Under *Account Number*, set the account number of your company. For example *ABCD0123*.
9. Click *Save* to commit your changes.

### 3. Create the Komunitin configuration
1. Go to *Settings* and click the link *Activate the developer mode*.
2. Go to *Point of Sale* > *Configuration* > *Komunitin Configurations*. If you don't see this menu item then the addon has not been properly installed or you are not in developer mode.
3. Click the *Create* button. You need to be a Point of Sale Manager to see this button.
4. Fill all the fields and save. Ask your community currency administration in case of doubt.

### 4. Create the Point of Sale payment method
1. Go to *Point of Sale* and edit the *Settings* of your shop instance.
2. Under *Payment methods*, choose *Create and Edit...*.
3. Set a short but descriptive name for the payment method. That will be shown to PoS users as a payment method. For example: *Springfield talents*.
4. Choose type *Bank* and check that *Use in Point of Sale* is marked. Set a short code.
5. At *Bank account* tab, select the bank account for your company we've created before.
6. At *Point of Sale* tab, select the Komunitin configuration you've just created. That will tell this addon to make online payments when this payment method is chosen.
7. Save the new payment method and the Shop.

### 5. Define customer accounts
1. Go to *Point of Sale* > *Orders* > *Customers*
2. For each customer, click *Edit* and go to its *Invoicing* tab
3. Under *Bank Accounts*, add their account number. The bank must be the same bank created before.

That's all! When you start a new point of sale session in the configured shop, a new payment method should appear. When validating a payment using this new method, it will trigger an actual transaction using the Komunitin accounting protocol API and you will immediately receive the payment in community currency units.
