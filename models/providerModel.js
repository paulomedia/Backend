"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels-promisified');



const name = 'Provider';
const definition = {
    hashKey: 'email',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        provider_id: dynogels.types.uuid(),
        email: Joi.string().email(),
        password: Joi.string(),
        scope: Joi.string(),
        enable: Joi.boolean().default(true),
        pushSubscription: Joi.object(),
        name: Joi.string(),
        description: Joi.any(),
        phoneNumber: Joi.number(),
        address: Joi.string(),
        address2: Joi.any(),
        location: Joi.object().keys({
            latitude: Joi.number(),
            longitude: Joi.number()
        }),
        businessCalendar: Joi.object().keys({
            businessHours: Joi.object().keys({
                monday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                }),
                thursday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                }),
                wednesday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                }),
                tuesday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                }),
                friday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                }),
                saturday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                }),
                sunday: Joi.object().keys({
                    morning: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    evening: Joi.object().keys({
                        open: Joi.string(),
                        close: Joi.string()
                    }),
                    allDay: Joi.boolean().default(false)
                })
            }),
            blacklist: Joi.array().items(
                Joi.string()
            ),
            whitelist: Joi.array().items(
                Joi.string()
            )
        }),
        images: Joi.array().items(
            Joi.string()
        ),
        stripe_account: Joi.string()
    },

    tableName: 'pharma-providers'
};


module.exports = {
    name: name,
    definition: definition
};
