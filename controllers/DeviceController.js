module.exports = {};
const models = require('../models'),
    AppController = require('./AppController'),
    UserController = require('./UserController'),
    RiderController = require('./RiderController'),
    Boom = require('boom'),
    _ = require('lodash'),
    config = require("config"),
    AWS = require('aws-sdk');

// Setup AWS
AWS.config.update(config.aws.credentials);

/**
 * Create an AWS SNS EndpointArn for each device added.
 * This endpoint is used to send push to a device, instead of
 * using UUID
 *
 * @param platform
 * @param deviceId
 * @param token
 * @returns {Promise<PromiseResult<SNS.CreateEndpointResponse, AWSError>>}
 */
const createSNSPlatformEndpoint = (platform, deviceId, token, userType) => {
    const snsClient = new AWS.SNS();

    let applicationArn = '';
    if (platform.toLowerCase() === 'ios') {
        applicationArn = config.aws.sns[userType].iosPlatformApplicationARN;
    } else if (platform.toLowerCase() === 'android') {
        applicationArn = config.aws.sns[userType].andPlatformApplicationARN;
    }

    let snsParams = {
        Token: token,
        PlatformApplicationArn: applicationArn,
        CustomUserData: deviceId
    };

    return snsClient.createPlatformEndpoint(snsParams).promise();
};

/**
 * Get all devices available from a given app
 *
 * @param app_id
 * @returns {Promise<*>}
 */
const getDevicesFromApp = async (app_id) => {
    return await models.Device.scan()
        .filterExpression('#a = :a')
        .expressionAttributeNames({'#a': 'app_id'})
        .expressionAttributeValues({':a': app_id})
        .execAsync();

};

/**
 * Get all user devices from a given app
 *
 * @param app_id
 * @param user_id
 * @returns {Promise<*>}
 */
const getDevicesFromAppAndUser = async (app_id, user_id) => {
    return await models.Device.scan()
        .filterExpression('#a = :a AND #u = :u')
        .expressionAttributeNames({'#a': 'app_id', '#u': 'user_id'})
        .expressionAttributeValues({':a': app_id, ':u': user_id})
        .execAsync();

};

/**
 * Get device Model
 *
 * @param device_id
 * @returns {Promise<*>}
 */
const getDevice = async (device_id) => {
    return await models.Device.getAsync(device_id, {ConsistentRead: true});

};

const registerDevice = async (request, userType) => {
    const endpoint = await createSNSPlatformEndpoint(request.payload.platform, request.payload.user_id, request.payload.device_token, userType);
    console.log(endpoint);
    return await models.Device.createAsync({
        app_id: request.payload.app_id,
        user_id: request.auth.credentials.email,
        model: request.payload.model || 'ND',
        platform: request.payload.platform,
        device_token: request.payload.device_token,
        endpointArn: endpoint.EndpointArn
    });
};

const removeDevice = async (request) => {
    const deviceToDelete = await models.Device.scan()
        .filterExpression('#d = :d AND #a = :a AND #u = :u')
        .expressionAttributeNames({
            '#d': 'device_token',
            '#a': 'app_id',
            '#u': 'user_id'
        })
        .expressionAttributeValues({
            ':d': request.payload.device_token,
            ':a': request.payload.app_id,
            ':u': request.auth.credentials.email
        })
        .execAsync();

    if (deviceToDelete.Items.length === 0) {
        return Boom.notFound('Device not found');
    } else {
        return await models.Device
            .destroyAsync(deviceToDelete.Items[0].get('device_id'), {ReturnValues: 'ALL_OLD'});
    }
};

const removeDeviceById = async (device_id) => {
    const deviceToDelete = await models.Device.scan()
        .filterExpression('#i = :i')
        .expressionAttributeNames({
            '#i': 'device_id'
        })
        .expressionAttributeValues({
            ':i': device_id
        })
        .execAsync();

    if (deviceToDelete.Items.length === 0) {
        return Boom.notFound('Device not found');
    } else {
        return await models.Device
            .destroyAsync(device_id, {ReturnValues: 'ALL_OLD'});
    }
};


/**
 * Add new User device
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.registerUserDevice = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);
        const userExists = await UserController.checkUserExists(request.auth.credentials.email);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else if (!userExists) {
            return Boom.notFound('User not found');
        } else {
            return await registerDevice(request, 'user');
        }
    } catch (e) {
        return e;
    }
};

module.exports.registerRiderDevice = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);
        const riderExists = await RiderController.checkRiderExists(request.auth.credentials.email);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else if (!riderExists) {
            return Boom.notFound('Rider not found');
        } else {
            return await registerDevice(request, 'rider');
        }
    } catch (e) {
        return e;
    }
};

/**
 * Delete User device
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.removeUserDevice = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);
        const userExists = await UserController.checkUserExists(request.auth.credentials.email);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else if (!userExists) {
            return Boom.notFound('User not found');
        } else {

            return await removeDevice(request);

        }
    } catch (e) {
        return e;
    }
};

module.exports.removeRiderDevice = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);
        const riderExists = await RiderController.checkRiderExists(request.auth.credentials.email);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else if (!riderExists) {
            return Boom.notFound('Rider not found');
        } else {

            return await removeDevice(request);

        }
    } catch (e) {
        return e;
    }
};

module.exports.removeDeviceById = removeDeviceById;

/**
 * Get all devices.
 * Can be filtered by app_id, user_id and/or platform type
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.getAllDevices = async function (request, h) {
    try {

        let filterExp = '',
            expValues = {},
            expNames = {};

        const queryOptions = [];

        // Query options
        if (!_.isNil(request.payload.app_id)) {
            const appExists = await AppController.checkAppExists(request.payload.app_id);

            if (!appExists) {
                return Boom.notFound('App bundle not found');
            } else {
                queryOptions.push({name: 'app_id', value: request.payload.app_id});
            }
        }

        if (!_.isNil(request.payload.user_id)) {
            queryOptions.push({name: 'user_id', value: request.payload.user_id});
        }

        if (!_.isNil(request.payload.platform)) {
            queryOptions.push({name: 'platform', value: request.payload.platform});
        }

        // Generate Query expression
        queryOptions.forEach((val, index) => {
            if (index === 0) {
                filterExp = `#${index} = :${index}`;
            } else {
                filterExp += ` AND #${index} = :${index}`;
            }
            expValues[`:${index}`] = val.value;
            expNames[`#${index}`] = val.name;
        });

        // Launch query
        if (queryOptions.length === 0) { // All devices. no Filter
            return await models.Device.scan()
                .loadAll()
                .execAsync();
        } else {

            return await models.Device.scan()
                .filterExpression(filterExp)
                .expressionAttributeValues(expValues)
                .expressionAttributeNames(expNames)
                .execAsync();
        }

    } catch (e) {
        return e;
    }
};

module.exports.getDevicesFromApp = getDevicesFromApp;
module.exports.getDevicesFromAppAndUser = getDevicesFromAppAndUser;
module.exports.getDevice = getDevice;
