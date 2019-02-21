"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels');

const constants = require('../controllers/constants');

const name = 'Order';
const definition = {

    hashKey: 'order_id',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        order_id: dynogels.types.uuid(),
        order_code: Joi.string(),
        orderDate: Joi.string(),
        isFinishedRider: Joi.boolean().default(false),
        isFinishedUser: Joi.boolean().default(false),
        isPaid: Joi.boolean().default(false),
        lastStatus: Joi.string(),
        isProcess: Joi.boolean().default(false),
        user: Joi.object().keys({
            user_id: dynogels.types.uuid(),
            name: Joi.string(),
            phoneNumber: Joi.number(),
            address: Joi.string(),
            address2: Joi.string()
        }),
        provider: Joi.object().keys({
            provider_id: dynogels.types.uuid(),
            name: Joi.string(),
            phoneNumber: Joi.number(),
            address: Joi.string(),
            address2: Joi.string()
        }),
        rider: Joi.object().keys({
            rider_id: Joi.string(),
            name: Joi.string(),
            phoneNumber: Joi.number() //.min(9)
        }),
        tracking: Joi.array().items(
            Joi.object().keys({
                status: Joi.string(),       // constants - ORDER_STATUS
                dateTime: Joi.string(),
            })
        ),
        delivery: Joi.object().keys({
            name: Joi.string(),
            address: Joi.string(),
            address2: Joi.string(),
            phoneNumber: Joi.number(),
            desiredTime: Joi.string(),
            provider_id: dynogels.types.uuid()
        }),
        payment: Joi.object().keys({
            card: Joi.string(),      // card data -> **** 4343
            dateTime: Joi.string(),
        }),
        products: Joi.object().keys({
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
                        status: Joi.string(),              // constants - PRESCRIPTION_STATUS
                        observation: Joi.string(),
                        ocrData: Joi.object()              // data from OCR
                    }),
                    comments: Joi.string()
                })
            ),
            subtotal: Joi.number(),
            totalAmount: Joi.number().precision(2),
        })
    },

    tableName: 'pharma-orders'

};


module.exports = {
    name: name,
    definition: definition
};
