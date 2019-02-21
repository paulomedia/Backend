"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels-promisified');



const name = 'Rider';
const definition = {
    hashKey: 'email',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        rider_id: dynogels.types.uuid(),
        rider_code: Joi.string(),
        email: Joi.string().email(),
        password: Joi.string(),
        scope: Joi.string(),
        enable: Joi.boolean().default(true),
        confirmationCode: Joi.string(),
        passwordCode: Joi.any(),
        name: Joi.string(),
        phoneNumber: Joi.number(),
        address: Joi.any(),
        address2: Joi.any(),
        actualStatus: Joi.number(),     // constants - RIDER_STATUS
        location: Joi.object().keys({
            latitude: Joi.number(),
            longitude: Joi.number()
        })
    },

    tableName: 'pharma-riders'
};


module.exports = {
    name: name,
    definition: definition
};
