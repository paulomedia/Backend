"use strict";

const Joi = require('joi');



const name = 'App';
const definition = {
    hashKey: 'bundle',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        name: Joi.string(),
        version: Joi.string(),
        bundle: Joi.string(),
        icon: Joi.string(),
    },

    tableName: 'pharma-apps'
};


module.exports = {
    name: name,
    definition: definition
};
