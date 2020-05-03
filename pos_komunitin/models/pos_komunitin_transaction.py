# -*- coding: utf-8 -*-

from pprint import pprint
import logging
import datetime

import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry


from odoo import models, api, service, exceptions

_logger = logging.getLogger(__name__)


class KomunitinTransaction(models.Model):
    """This class contains the business logic of this module, encapsulated in the public function
    do_payment. This function is called from the Point of Sale frontend to perform payments on
    sale orders.
    """
    _name = 'pos_komunitin.komunitin_transaction'
    _description = 'Point of Sale Komunitin Transaction API'
    _http = None

    OAUTH_CLIENT_ID = "odoo-pos-komunitin"

    # komunitin_accounting to be able to operate with komunitin accounting protocol
    OAUTH_SCOPE = "komunitin_accounting"

    def _get_http_session(self):
        """Return an HTTP session with cofigured retry scheme.
        :rtype: requests.Session
        """
        if (self._http is None):
            adapter = HTTPAdapter(max_retries=Retry(
                total=3,
                status_forcelist=[429, 502, 503, 504],
                backoff_factor=1,
                method_whitelist=["GET", "POST", "DELETE",
                                  "PUT", "PATCH", "OPTIONS", "HEAD"]
            ))
            self._http = requests.Session()
            self._http.mount("http://", adapter)
            self._http.mount("https://", adapter)
        return self._http

    def _get_pos_session(self):
        """Return an opened Point of Sale session for the current user.
        """
        pos_session = self.env['pos.session'].search(
            [('state', '=', 'opened'), ('user_id', '=', self.env.uid)], limit=1)
        if not pos_session:
            raise exceptions.UserError(
                "No opened point of sale session for user %s found." % self.env.user.name)

        pos_session.login()

        return pos_session

    def _get_pos_komunitin_config(self, journal_id):
        """Get the configuration related to the given account journal id. 
        :rtype: PosKomunitinConfiguration
        """
        pos_session = self._get_pos_session()
        config = pos_session.config_id
        journal = config.journal_ids.filtered(lambda r: r.id == journal_id)
        if journal and journal.pos_komunitin_config:
            return journal.pos_komunitin_config.sudo()
        raise exceptions.UserError(
            "No Komunitin configuration associated with current account journal.")

    def _log_request_error(self, title, method, url, body, code, response):
        _logger.error("""%s
                %s %s
                BODY:
                %s
                RESPONSE %d:
                %s
                """, title, method, url, pprint(body), code, response)

    def _get_authorization(self, config):
        """Obtain an access token from the credentials stored in Komunitin configuration.
        :rtype: PosKomunitinAuthorization
        """

        # If there exists a saved and still valid access_token, return it!
        auth_model = self.env['pos_komunitin.authorization'].sudo()
        auth = auth_model.search([('configuration', '=', config.id)], limit=1)

        # renew token if it expires during the next 5 minutes.
        if (auth and auth.acess_token_expiry < (datetime.datetime.now() + datetime.timedelta(minutes=5))):
            return auth

        # Otherwise get a new token using the stored credentials
        token_url = config.auth_url + '/token'
        params = {
            "grant_type": "password",
            "username": config.email,
            "password": config.password,
            "client_id": self.OAUTH_CLIENT_ID,
            "scope": self.OAUTH_SCOPE
        }

        try:
            http = self._get_http_session()
            response = http.post(token_url, params, timeout=5)
            # raise exception on error http status code.
            response.raise_for_status()
            content = response.json()
        except requests.exceptions.ConnectionError:
            # DNS problem, SSL problem, etc.
            raise exceptions.UserError(
                "Komunitin authorization connection error at %s." % token_url)
        except requests.exceptions.HTTPError:
            if (response.status_code == 401):
                raise exceptions.UserError(
                    "Incorrect credentials. Check the Komunitin configuration.")
            if (response.status_code == 404):
                raise exceptions.UserError(
                    "Authorization service not found at %s. Check the Komunitin configuration." % token_url)
            # Log error.
            self._log_request_error("KOMUNITIN AUTH API ERROR", 'POST',
                                    token_url, params, response.status_code, response.text)

            # Extract info from OAuth2 Error Response.
            # See https://tools.ietf.org/html/rfc6749#section-5.2
            error_obj = response.json()
            if (error_obj and ("error" in error_obj)):
                message = "[" + error_obj["error"] + "]"
                if ("error_description" in error_obj):
                    message = message + " " + error_obj["error_description"]
            else:
                # Or maybe the server failed to provide a well-formed error object
                message = "Server didn't provide details."

            if (400 <= response.status_code < 500):
                raise exceptions.UserError(
                    "Invalid request to Komunitin authorization. %s" % message)

            # Must be a 500 error.
            raise exceptions.UserError(
                "Komunitin authorization server error. %s" % message)

        # Save token for later use.
        authorization = {
            'configuration': config.id,
            'access_token': content["access_token"],
            'acess_token_expiry': datetime.datetime.now() + datetime.timedelta(seconds=content['expires_in']),
            'created': datetime.datetime.now()
        }
        if (auth):
            auth.write(authorization)
        else:
            auth = auth_model.create(authorization)

        # finally return the authorization object
        return auth

    @classmethod
    def _get_transactions_url(cls, config):
        return config.accounting_url + '/' + config.currency + "/transactions"

    @classmethod
    def _get_transaction_url(cls, config, id):
        return KomunitinTransaction._get_transactions_url(config) + '/' + id

    @classmethod
    def _get_account_url(cls, config, account):
        return config.accounting_url + '/' + config.currency + '/accounts/' + account

    def _komunitin_request(self, config, method, url, body=None):
        """Helper method to connect with Komunitin accounting service and handle possible
        errors.
        """
        auth = self._get_authorization(config)
        http = self._get_http_session()
        headers = {
            'Content-Type': 'application/vnd.api+json',
            'Authorization': 'Bearer ' + auth.access_token
        }
        try:

            response = http.request(
                method, url, headers=headers, timeout=15, json=body)
            response.raise_for_status()
        except requests.exceptions.ConnectionError:
            raise exceptions.UserError(
                "Error connecting to Komunitin accounting service.")
        except requests.exceptions.HTTPError:
            if (response.status_code == 404):
                if (method.upper() == 'DELETE'):
                    # Resource not deleted because it does not exist. All ok.
                    return True

            if (response.status_code == 401):
                # Unauthorized: the access token may have just expired. retry if it is old enough (so we repeat just once)
                if (datetime.datetime.now() - auth.created > datetime.timedelta(minutes=30)):
                    # Expire token.
                    auth.write({
                        'acess_token_expiry': datetime.datetime.now() + datetime.timedelta(hours=1),
                        'created': datetime.datetime.now()
                    })
                    return self._komunitin_request(config, method, url, body)

            if (response.status_code == 409 and method.upper() == 'POST'):
                # Conflict. Attempting to create a transaction with an id that already exists.
                # In this case we can return the already existent transaction.
                return self._komunitin_request(config, 'GET', self._get_transaction_url(config, body['data']['id']))

            # Log errors.
            self._log_request_error("KOMUNITIN ACCOUNTING API ERROR", method.upper(
            ), url, body, response.status_code, response.text)

            # JSON:API error object
            error_obj = response.json()
            if (error_obj and ("errors" in error_obj) and len(error_obj["errors"]) > 0 and "title" in error_obj["errors"][0]):
                message = error_obj["errors"][0]["title"]
                if ("detail" in error_obj["errors"][0]):
                    message = message + " " + error_obj["errors"][0]["detail"]
            else:
                # Or maybe the server failed to provide a well-formed error object
                message = "Server didn't provide details."

            if (400 <= response.status_code < 500):
                raise exceptions.UserError(
                    "Invalid request to Komunitin accounting service. %s" % message)

            # Must be a 500 error.
            raise exceptions.UserError(
                "Komunitin accounting service server error. %s" % message)

        if (response.status_code == 204):
            # No Content.
            return True
        else:
            return response.json()

    @api.model
    def do_payment(self, data):
        """Perform a payment using the Komunitin accounting protocol API.
        Return the komunitin accountin api result JSON object.
        """
        config = self._get_pos_komunitin_config(data['journal_id'])

        # Compute amount to send.
        if (data['amount'] <= 0):
            raise exceptions.UserError("Amount must be positive")

        body = {
            "data": {
                "id": data['transaction_id'],
                "type": "transactions",
                "attributes": {
                    "transfers": [{
                        "payer": self._get_account_url(config, data['payer']),
                        "payee": self._get_account_url(config, config.account),
                        "amount": data['amount'],
                        "meta": data['meta'],
                    }],
                    "state": "committed",
                }
            }
        }
        url = self._get_transactions_url(config)
        return self._komunitin_request(config, 'POST', url, body)

    @api.model
    def delete_payment(self, data):
        """Delete a payment created with do_payment
        Return True
        """
        config = self._get_pos_komunitin_config(data['journal_id'])
        url = self._get_transaction_url(config, data['transaction_id'])

        return self._komunitin_request(config, 'DELETE', url)

    @api.model
    def get_payment(self, data):
        "Fetches a payment JSON object from the Komunitin service"

        config = self._get_pos_komunitin_config(data['journal_id'])
        url = self._get_transaction_url(config, data['transaction_id'])

        return self._komunitin_request(config, 'GET', url)
