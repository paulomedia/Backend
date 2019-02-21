var HapiSwagger = require('hapi-swagger'),
    Inert = require("inert"),
    Vision = require("vision"),
    pack = require("../package"),
    authJwt2 = require('hapi-auth-jwt2'),
    Blipp = require('blipp'),
    settings = require('config');

module.exports = [
    //set up good to log every kind of event.
    {
        plugin: require('good'),
        options: {
            ops: {
                interval: 300000
            },
            reporters: {
                myConsoleReporter: [{
                    module: 'good-console'
                }, 'stdout']
            }
        }
    },
    // Blipp log routes in console
    {
        plugin: Blipp,
        options: {
            showAuth: true,
            showStart: true
        }
    },
    // Auth jwt2
    {
        plugin: authJwt2
    },
    // Hapi Swagger
    Inert,
    Vision,
    {
        plugin: HapiSwagger,
        options: {
            info: {
                title: pack.description,
                version: pack.version
            },
            grouping: 'tags',
            schemes: ['http'],
            host: settings.externalSwaggerUrl,
            securityDefinitions: {
                'jwt': {
                    'type': 'apiKey',
                    'name': 'Authorization',
                    'in': 'header'
                }
            },
            security: [{'jwt': []}],
            auth: false
        }
    },

];
