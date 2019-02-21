module.exports = {};
const models = require('../models'),
    Boom = require('boom'),
    _ = require('lodash');

/**
 * Check id App bundle exists in database
 *
 * @param bundle    ext.domain.identifier
 * @returns {Promise<*>}
 */
const checkAppExists = async function (bundle) {
    return new Promise((resolve) => {

        models.App.get(bundle, {ConsistentRead: true}, function (err, item) {
            if (err || _.isNull(item)) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

/**
 * Returns App model (dynogels format) for a given bundle
 *
 * @param bundle    ext.domain.identifier
 * @returns {Promise<*>}
 */
const getAppByBundle = async function (bundle) {
    return await models.App.getAsync(bundle, {ConsistentRead: true});
};


module.exports.checkAppExists = checkAppExists;

/**
 * Return all existing apps
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.getAllApps = async function (request, h) {
    const apps = await models.App.scan().loadAll().execAsync();
    return apps;
};

/**
 * Create a new App
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.createApp = async function (request, h) {

    try {
        const appExists = await checkAppExists(request.payload.bundle);

        if (appExists) {
            return Boom.conflict('App bundle already exists');
        } else {
            return await models.App.createAsync({
                name: request.payload.name,
                version: request.payload.version || 'ND',
                bundle: request.payload.bundle,
                icon: request.payload.icon || 'ND',
            });
        }
    } catch (e) {
        return e;
    }
};

/**
 * Returns app model
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.getAppInfo = async function (request, h) {
    try {
        const appExists = await checkAppExists(request.params.app_id);

        if (!appExists) {
            return Boom.notFound('App not found');
        } else {
            return await getAppByBundle(request.params.app_id);
        }
    } catch (e) {
        return e;
    }
};

/**
 * Modify App
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.editApp = async function (request, h) {
    try {
        const appExists = await checkAppExists(request.params.app_id);

        if (!appExists) {
            return Boom.notFound('App not found');
        } else {
            return await models.App.updateAsync({
                name: request.payload.name,
                version: request.payload.version || 'ND',
                bundle: request.params.app_id,
                icon: request.payload.icon || 'ND',
            });
        }
    } catch (e) {
        return e;
    }
};

/**
 * Remove App
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.deleteApp = async function (request, h) {
    try {
        const appExists = await checkAppExists(request.params.app_id);

        if (!appExists) {
            return Boom.notFound('App not found');
        } else {
            // TODO: Delete first messages and devices for that app
            return await models.App.destroyAsync(request.params.app_id, {ReturnValues: 'ALL_OLD'});
        }
    } catch (e) {
        return e;
    }
};

