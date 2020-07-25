import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    setup_requires=['setuptools-odoo'],
    odoo_addon=True,
    name='odoo-community-currency',  
    version='0.1',
    author="Esteve Badia",
    author_email="badia.orive@gmail.com",
    description="Community currency management for Odoo. The first goal of this project is to provide the required features for the future cooperative food shop Super Coop Manresa to be able to use the currency from Ecoxarxa del Bages hosted at IntegralCES. The development should be done in a sufficiently modularized way so it is also useful for other organizations and community currencies.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/estevebadia/odoo-community-currency",
    packages=setuptools.find_packages(),
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
    ],
)
