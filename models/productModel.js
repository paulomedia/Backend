"use strict";

const Joi = require('joi'),
    dynogels = require('dynogels-promisified');



const name = 'Product';
const definition = {
    hashKey: 'product_id',

    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,

    schema: {
        product_id: dynogels.types.uuid(),
        external_id: Joi.string(),      // id from BOT Plus
        name: Joi.string(),
        description: Joi.string(),
        image: Joi.object().keys({
            thumbnail: Joi.string(),
            full: Joi.string(),
        }),
        raw_category: Joi.string(),
        category: Joi.string(),     // constants - PRODUCT_CATEGORY
        subcategory: Joi.string(),  // constants - PRODUCT_SUBCATEGORY
        form: Joi.string(),         // product presentation. Format.
        lab: Joi.string(),          // Lab name
        pvp: Joi.number().precision(2),
        pvpVat: Joi.number().precision(2),
        prescriptionRequired: Joi.boolean().default(false),     // needs prescription?
        composition: Joi.array().items(
            Joi.object().keys({
                name: Joi.string(),
                qty: Joi.string(),
                units: Joi.string(),
            })
        ),
        dataSheet: Joi.string(),     // external URL
        leaflet: Joi.string()     // external URL
        // TODO: manage categories and subcategories

    },

    tableName: 'pharma-products'
};


module.exports = {
    name: name,
    definition: definition
};
