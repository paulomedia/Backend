"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels');


const name = 'Message';
const definition = {

    hashKey: 'message_id',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        message_id: dynogels.types.uuid(),
        message: Joi.string(),
        endpointArn: Joi.string()
    },

    tableName: 'pharma-messages'

};


module.exports = {
    name: name,
    definition: definition
};
