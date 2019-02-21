"use strict";

const config = require("config"),
    dynogels = require('dynogels-promisified'),
    requireDirectory = require('require-directory'),
    models = {};

// Setup dynogels
dynogels.AWS.config.update(config.aws.credentials);

// Save reference for future access
models.dynogels = dynogels;

// Load all files and define the models
const moduleImports = requireDirectory(module);

Object.values(moduleImports).forEach(mod => {
    models[mod.name] = dynogels.define(mod.name, mod.definition);
});


module.exports = models;


