# -*- coding: utf-8 -*-

{
    'name': 'Komunitin Payments',
    'version': '0.1',
    'category': 'Point of Sale',
    'summary': 'Community currency payments support for Point Of Sale through Komunitin accounting protocol',
    'author': 'Esteve Badia',
    'description': """
Community Currency POS payments
===============================

This module allows customers to pay for their orders in point of sale
using community currencies that implement the Komunitin accounting protocol.
    """,
    'depends': ['web', 'point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/pos_komunitin_views.xml',
        'views/pos_komunitin_templates.xml',
    ],
    'demo': [
        'data/pos_komunitin_demo.xml',
    ],
    'qweb': [
        'static/src/xml/pos_komunitin.xml',
    ],
    'installable': True,
    'auto_install': False
}
