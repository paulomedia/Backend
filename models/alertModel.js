"use strict";

const Joi      = require('joi'),
      dynogels = require('dynogels-promisified');


const name = 'Alert';
const definition = {

    hashKey: 'alert_id',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        alert_id: dynogels.types.uuid(),
        user_id: Joi.string(),
        order_id: Joi.string(),
        reference_id: Joi.string(),
        product_id: Joi.string(),
        title: Joi.string(),
        message: Joi.string(),
        periodicity: Joi.number(),                 // termina cada x dias
        warningEndAlert: Joi.number(),             // en cuantos dias avisar antes de terminar
        alertHour: Joi.string(),                   // la hora para disparar la alarma
        alertRepeat: Joi.boolean().default(false), // repetir al alarma
        status: Joi.string()
    },

    tableName: 'pharma-alerts'

};


module.exports = {
    name: name,
    definition: definition
};
