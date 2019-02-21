"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels-promisified');


const name = 'User';
const definition = {
    hashKey: 'email',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        user_id: dynogels.types.uuid(),
        email: Joi.string().email(),
        password: Joi.string(),
        scope: Joi.string(),
        enable: Joi.boolean().default(true),
        confirmationCode: Joi.string(),
        passwordCode: Joi.string(),
        name: Joi.string(),
        phoneNumber: Joi.number().min(9),
        address: Joi.string(),
        address2: Joi.any(),
        location: Joi.object().keys({
            latitude: Joi.number(),
            longitude: Joi.number()
        }),
        customerID: Joi.string(),       // Stripe
        cardID: Joi.string(),           // Stripe
        provider: Joi.object().keys({
            provider_id: dynogels.types.uuid(),
            name: Joi.string(),
            address: Joi.string(),
            address2: Joi.string(),
            businessCalendar: Joi.object()
        }),
        cart: Joi.object().keys({
            qty: Joi.number(),
            items: Joi.array().items(
                Joi.object().keys({
                    reference_id: dynogels.types.uuid(),
                    product_id: Joi.string(),
                    name: Joi.string(),
                    qty: Joi.number(),
                    pvp: Joi.number().precision(2),
                    pvpVat: Joi.number().precision(2),
                    prescriptionRequired: Joi.boolean().default(false),
                    prescription: Joi.object().keys({
                        prescription_id: Joi.string(),     // used as S3 filename
                        observation: Joi.string(),
                        status: Joi.string(),
                        ocrData: Joi.object()
                    }),
                })
            ),
            subtotal: Joi.number()

        })
    },

    tableName: 'pharma-users'
};


module.exports = {
    name: name,
    definition: definition
};
