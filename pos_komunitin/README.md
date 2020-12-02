# Odoo Point of Sale integration of Komunitin accounting protocol
**This addon is a proof of Concept, don't use it in prodyuction environment**

Odoo addon providing a new payment method in Point of Sale for Community Currencies. It uses the [Komunitin accounting protocol](https://github.com/komunitin/komunitin-api/blob/master/accounting/) to communicate with your community currency provider to instantly perform payments in community currencies. That is currently only implemented in [IntegralCES](https://integralces.net) community exchange system.

## Set up
Before installing this addon, you need a working instance of Odoo 12 with the Point of Sale App. Alternatively, and just for test purposes, you may quickly setup a testing environment using Docker and the docker-compose file provided at the top directory of this repository.

### 1. Environment
Test environment with docker:

1. Go to the root forlder of this repository and execute `docker-compose up -d`
2. Install your new Odoo instance at `http://localhost:8069`
3. Go to *Apps* and install *Point of Sale*. You may also need to install a localization package.

Classic environment:

1. Download the folder `pos_komunitin` from this repository and place it in the addons directory, usually `/mnt/extra-addons/`.

In any case, enable the addon:

4. Go to *Apps* and in the search bar remove the `Apps` tag and search for `komunitin`. Then install the *Komunitin Payments* addon.

### 2. Create the company bank account
1. Go to *Settings* and click the link *Activate the developer mode*.
1. Click the *Set up* button under your company section.  
2. Click on the *Partner* value. If you don't see this value you probably aren't in developer mode.
3. Click the *Edit* button, then select the tab *Invoicing*.
4. Under *Bank accounts* section, click *Add a line*.
5. Under *Bank*, chose *Create and Edit...* to create a new bank.
6. Set a descriptive name for the bank record such as *Springfield city local currency*. You may fill the other fields or leave them blank.
7. Click *Save* to save the new Bank. Community currency accounts will be related to rhis bank.
8. Under *Account Number*, set the account number of your company. In test environments, you may use the account *NET20003*.
9. Click *Save* to commit your changes.

![Gif info at /doc showing how to configure this section](../doc/2%20create%20the%20company%20bank%20account.gif)

### 3. Create the Komunitin configuration

1. Go to *Point of Sale* > *Configuration* > *Komunitin Configurations*. If you don't see this menu item then the addon has not been properly installed or you are not in developer mode.
2. Click the *Create* button. You need to be a Point of Sale Manager to see this button.
3. Fill all the fields and save. Ask your community currency administration in case of doubt. If you're just testing, you may want to use the *demo* integralces instance. In this case use:

| Field              | Value |
| ---                | --- |
| Auth API URL       | `https://demo.integralces.net/oauth2` |
| Accounting API URL | `https://demo.integralces.net/ces/api/accounting` |
| Merchand email     | `fermat@integralces.net` |
| Merchand password  | `integralces` |
| Merchand currency  | `NET2` |
| Currency value     | `100` |

![Gif info at /doc showing how to configure this section](../doc/3%20create%20the%20komunitin%20configuration.gif)

### 4. Create the Point of Sale payment method
1. Go to *Point of Sale* and edit the *Settings* of your shop instance.
2. Under *Payment methods*, choose *Create and Edit...*.
3. Set a short but descriptive name for the payment method. That will be shown to PoS users as a payment method. For example: *Springfield talents*.
4. Choose type *Bank* and check that *Use in Point of Sale* is marked. Set a short code.
5. At *Bank account* tab, select the bank account for your company we've created before.
6. At *Point of Sale* tab, select the Komunitin configuration you've just created. That will tell this addon to make online payments when this payment method is chosen.
7. Save the new payment method and the Shop.

![Gif info at /doc showing how to configure this section](../doc/4%20create%20the%20point%20of%20sale%20mapyment%20method.gif)

### 5. Try it and add customer accounts
1. When you start a new point of sale session in the configured shop, the new payment method should appear.
2. On validating a payment using this new method, you will need to create or choose a customer.
3. The first time it will ask you to add their community currency account number. It will be saved as a partner bank account. In testing environments, you may use the demo accounts `NET20001` and `NET20002`.
4. Then it will trigger an actual transaction using the Komunitin accounting protocol API and you will immediately receive the payment in community currency units.
5. The next time you choose this customer, the system will remember their account.
6. In case you need to update or delete a community currency account from a customer, you have to do it from *Point of Sale* > *Customers*, as the shop interface doesn't have these features.

![Gif info at /doc showing how to configure this section](../doc/5%20try%20it%20and%20add%20customer%20accounts.gif)