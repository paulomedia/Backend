"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels-promisified');


const name = 'Device';
const definition = {

    hashKey: 'device_id',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        device_id: dynogels.types.uuid(),
        app_id: Joi.string(),
        user_id: Joi.string(),
        model: Joi.string(),
        platform: Joi.string(),
        device_token: Joi.string(),
        endpointArn: Joi.string()
    },

    tableName: 'pharma-devices'

};


module.exports = {
    name: name,
    definition: definition
};
