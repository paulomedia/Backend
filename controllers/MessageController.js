module.exports = {};
const models           = require('../models'),
      DeviceController = require('./DeviceController'),
      AppController    = require('./AppController'),
      Boom             = require('boom'),
      _                = require('lodash'),
      config           = require("config"),
      constants        = require('./constants'),
      AWS              = require('aws-sdk');

// Setup AWS
AWS.config.update(config.aws.credentials);

/**
 * Create iOS push payload
 *
 * @param data
 * @returns {{APNS: string}}
 */
const createIosPayload = function (data) {
    let payload = {
        aps: {
            alert: data.message || ""
        }
    };

    if (!_.isUndefined(data.badge)) {
        payload.badge = data.badge;
    }

    if (!_.isUndefined(data.sound)) {
        payload.sound = data.sound;
    }

    return {APNS: JSON.stringify(payload)};
};

/**
 * Create Android payload
 *
 * @param data
 * @returns {{GCM: string}}
 */
const createAndroidPayload = data => {
    let payload =  {
        collapseKey: "optional",
        data: {
            body: data.message || '', 
            message: data.message || ''
        }
    };

    if (!_.isUndefined(data.collapseKey)) {
        payload.collapseKey = data.collapseKey;
    }

    if (!_.isUndefined(data.param)) {
        payload.data.param = data.param;
    }

    if (!_.isUndefined(data.key)) {
        payload.data.key = data.key;
    }

    if (!_.isUndefined(data.title)) {
        payload.data.title = data.title;
    }

    if (!_.isUndefined(data.message)){
        payload.data.message = data.message;
    }  

    return {GCM: JSON.stringify(payload)};
};

/**
 * Send an array of messages
 *
 * @param messages[]
 * @returns {Promise<boolean>}  boolean indicates if any error found
 */
const sendMessages = async function (messages) {
    return new Promise((resolve) => {

        let errors = false;
        for (const message of messages) {
            sendMessage(message)
                .then(() => {
                })
                .catch((e) => {
                    console.log(e);
                    errors = true;
                    if (e.code === 'EndpointDisabled') {
                        // App uninstalled. Delete message
                        deleteDeviceReference(message);
                    }
                });
        }

        resolve(errors);
    });
};

/**
 * Send individual message
 *
 * @param msg
 * @returns {Promise<PromiseResult<D, E>>}
 */
const sendMessage = function (msg) {
    const snsClient = new AWS.SNS();

    return snsClient.publish({
        Message: msg.message,
        TargetArn: msg.endpointArn,
        MessageStructure: 'json'
    }).promise();
};

/**
 * Delete Device and associated AWS SNS EndpointArn
 *
 * @param msg
 */
const deleteDeviceReference = function (msg) {
    const snsClient = new AWS.SNS();
    const endpoint = msg.endpointArn;

    snsClient.deleteEndpoint({EndpointArn: endpoint}).promise()
        .then(() => {
            return DeviceController.removeDeviceById(msg.device_id);
        });

};

/**
 * Send message to all users or riders from a given app
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.sendMessageToAll = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else {
            // Get devices
            const devices = await DeviceController.getDevicesFromApp(request.payload.app_id);

            if (devices.Items.length === 0) {
                return Boom.notFound('No devices found for the given app');
            }

            // Create messages to save
            let messages = [];
            devices.Items.forEach(async d => {
                const payload = (d.get('platform') === 'ios') ? createIosPayload(request.payload) : createAndroidPayload(request.payload);
                console.log(payload);
                messages.push({
                    message: JSON.stringify(payload),
                    endpointArn: d.get('endpointArn'),
                    device_id: d.get('device_id')
                });
            });

            // Send messages
            let errors = await sendMessages(messages);

            return {status: 'ok', errors: errors};
        }
    } catch (e) {
        return e;
    }
};

/**
 * Send message to specific user from a given app
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.sendMessageToUser = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else {
            // Get devices
            const devices = await DeviceController.getDevicesFromAppAndUser(request.payload.app_id, request.payload.user_id);

            if (devices.Items.length === 0) {
                return Boom.notFound('No devices found for the given user-app');
            }

            // Create messages to save
            let messages = [];
            devices.Items.forEach(async (d) => {
                const payload = (d.get('platform') === 'ios') ? createIosPayload(request.payload) : createAndroidPayload(request.payload);
                console.log(payload);
                messages.push({
                    message: JSON.stringify(payload),
                    endpointArn: d.get('endpointArn'),
                    device_id: d.get('device_id')
                });
            });

            // Send messages
            let errors = await sendMessages(messages);

            return {status: 'ok', errors: errors};
        }
    } catch (e) {
        return e;
    }
};

module.exports.sendMessageToRider = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else {
            // Get devices
            const devices = await DeviceController.getDevicesFromAppAndUser(request.payload.app_id, request.payload.rider_id);

            if (devices.Items.length === 0) {
                return Boom.notFound('No devices found for the given rider-app');
            }

            // Create messages to save
            let messages = [];

            devices.Items.forEach(async (d) => {
                const payload = (d.get('platform') === 'ios') ? createIosPayload(request.payload) : createAndroidPayload(request.payload);
                console.log(payload);
                messages.push({
                    message: JSON.stringify(payload),
                    endpointArn: d.get('endpointArn'),
                    device_id: d.get('device_id')
                });

            });

            // Send messages
            let errors = await sendMessages(messages);

            return {status: 'ok', errors: errors};
        }
    } catch (e) {
        return e;
    }
};

/**
 * Send message to specific device
 *
 * @param request
 * @param h
 * @returns {Promise<*>}
 */
module.exports.sendMessageToDevice = async function (request, h) {
    try {
        const appExists = await AppController.checkAppExists(request.payload.app_id);

        if (!appExists) {
            return Boom.notFound('App bundle not found');
        } else {
            // Get device
            const device = await DeviceController.getDevice(request.payload.device_id);

            if (_.isNil(device)) {
                return Boom.notFound('Device not found');
            }

            // Create messages to save
            let messages = [];

            const payload = (device.get('platform') === 'ios') ? createIosPayload(request.payload) : createAndroidPayload(request.payload);
            console.log(payload);
            messages.push({
                message: JSON.stringify(payload),
                endpointArn: device.get('endpointArn'),
                device_id: device.get('device_id')
            });

            // Send messages
            let errors = await sendMessages(messages);

            return {status: 'ok', errors: errors};
        }
    } catch (e) {
        return e;
    }
};

// Generic method for all notifications
const messageTo = async data => {
    try {
        const appExists = await AppController.checkAppExists(data.app_id);

        if ( !appExists ) {

            return Boom.notFound('App bundle not found');

        } else {

            // Get deivce or devices
            let devices;

            if ( data.notificationType === constants.NOTIFICATION_TYPE.DEVICE ){

                devices = await DeviceController.getDevice(data.device_id);

                if (_.isNil(devices)) {
                    return Boom.notFound('Device not found');
                }

            } else if ( data.notificationType === constants.NOTIFICATION_TYPE.RIDER ){

                devices = await DeviceController.getDevicesFromAppAndUser(data.app_id, data.rider_id);

                if (devices.Items.length === 0) {
                    return Boom.notFound('No devices found for the given rider-app');
                }

            } else if ( data.notificationType === constants.NOTIFICATION_TYPE.USER ){

                devices = await DeviceController.getDevicesFromAppAndUser(data.app_id, data.user_id);

                if (devices.Items.length === 0) {
                    return Boom.notFound('No devices found for the given user-app');
                }

            } else if ( data.notificationType === constants.NOTIFICATION_TYPE.ALL ){

                devices = await DeviceController.getDevicesFromApp(data.app_id);

                if (devices.Items.length === 0) {
                    return Boom.notFound('No devices found for the given app');
                }

            }

            // Create messages to save
            let messages = [];

            devices.Items.forEach(async d => {
                const payload = d.get('platform') === 'ios' ? createIosPayload(data) : createAndroidPayload(data);
                console.log(payload);
                messages.push({
                    message: JSON.stringify(payload),
                    endpointArn: d.get('endpointArn'),
                    device_id: d.get('device_id')
                });
            });

            /*
            for the case of device if foreach don't result
            messages.push({
                message: JSON.stringify(payload),
                endpointArn: device.get('endpointArn'),
                device_id: device.get('device_id')
            });
            */

            // Send messages
            let errors = await sendMessages(messages);

            return {status: 'ok', errors: errors};
        }
    } catch (e) {
        return e;
    }
};

module.exports.messageTo = messageTo;