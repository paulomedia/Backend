"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels-promisified');



const name = 'Admin';
const definition = {
    hashKey: 'email',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        admin_id: dynogels.types.uuid(),
        email: Joi.string().email(),
        password: Joi.string(),
        scope: Joi.string(),
        enable: Joi.boolean().default(true),
        pushSubscription: Joi.object(),
        name: Joi.string()
    },

    tableName: 'pharma-admins'
};


module.exports = {
    name: name,
    definition: definition
};
