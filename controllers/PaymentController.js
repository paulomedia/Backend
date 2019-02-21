module.exports = {};
const models = require('../models'),
    Boom = require('boom'),
    config = require('config');


const Stripe = require('stripe')(config.stripe.api_key);


createNewCustomer = function (email) {
    return new Promise((resolve, reject) => {
        Stripe.customers.create({email: email})
            .then((customer) => {
                resolve(customer.id);
            })
            .catch((e) => {
                reject(manageErrors(e));
            });
    });
};

addCartToCustomer = async function (customerID, cardToken) {
    try {
        let source = await Stripe.customers.createSource(customerID, {source: cardToken});

        return source.id;

    } catch (e) {
        return manageErrors(e);
    }
};

removeCardToCustomer = async (customerID, cardID) => {
    try {
        let source = await Stripe.customers.deleteCard(customerID, cardID);

        return source.id;

    } catch (e) {
        return manageErrors(e);
    }
};

getInfoFromCustomer = async (customerID, cardID) => {
    try {
        let info = await Stripe.customers.retrieveCard(customerID, cardID);

        return info.last4;

    } catch (e) {
        return manageErrors(e);
    }
};

createNewCharge = async (amount, customerID, cardID, email, stripe_account) => {

    try {
        const fee = Math.round(amount*10);
        //const fee = 050;

        // Create customer payment token to avoid sharing data to the provider
        let customerToken = await Stripe.tokens.create({
                customer: customerID
            },
            {
                stripe_account: stripe_account,
            });

        let chargeData = {
            amount: Math.round(amount*100),
            currency: 'eur',
            //customer: customerID,
            //source: cardID,
            source: customerToken.id,
            description: 'Charge for ' + email,
            application_fee: fee
        };

        let charge = await Stripe.charges.create(chargeData,{
            stripe_account: stripe_account,
        });

        return charge.status;

    } catch (e) {
        return manageErrors(e);
    }
    
};

/**
 * Private Methods
 */

const manageErrors = function (err) {
    switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            err.message; // => e.g. "Your card's expiration year is invalid."
            return Boom.preconditionFailed(err.type);
            break;
        case 'StripeRateLimitError':
            // Too many requests made to the API too quickly
            return Boom.preconditionFailed(err.type);
            break;
        case 'StripeInvalidRequestError':
            // Invalid parameters were supplied to Stripe's API
            return Boom.preconditionFailed(err.type);
            break;
        case 'StripeAPIError':
            // An error occurred internally with Stripe's API
            return Boom.preconditionFailed(err.type);
            break;
        case 'StripeConnectionError':
            // Some kind of error occurred during the HTTPS communication
            return Boom.preconditionFailed(err.type);
            break;
        case 'StripeAuthenticationError':
            // You probably used an incorrect API key
            return Boom.preconditionFailed(err.type);
            break;
        default:
            return Boom.preconditionFailed('Stripe Error');
            // Handle any other types of unexpected errors
            break;
    }
}

module.exports.createNewCustomer = createNewCustomer;
module.exports.addCartToCustomer = addCartToCustomer;
module.exports.removeCardToCustomer = removeCardToCustomer;
module.exports.getInfoFromCustomer = getInfoFromCustomer;
module.exports.createNewCharge = createNewCharge;
