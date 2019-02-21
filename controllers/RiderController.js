module.exports = {};
const models            = require('../models'),
      OrderController   = require('./OrderController'),
      MessageController = require('./MessageController'),
      MailerController  = require('./MailerController'),
      AlertController   = require('./AlertController'),
      Boom              = require('boom'),
      Bcrypt            = require('bcrypt'),
      jwt               = require('jsonwebtoken'),
      settings          = require('config'),
      constants         = require('./constants'),
      _                 = require('lodash'),
      config            = require('config'),
      Utils             = require('./utils'),
      moment            = require('moment');

const register = async (request, h) => {

    try {
        const rider = await models.Rider.getAsync(request.payload.email, {ConsistentRead: true});

        if (rider !== null) {
            throw Boom.conflict('email already exists');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);
        let email = request.payload.email;

        let newRiderData = {
            email: email.toLowerCase(),
            password: passwordHash,
            rider_code: Utils.generateCode(8),
            scope: 'rider',
            enable: true,
            confirmationCode: 'OK',
            name: request.payload.name.toLowerCase(),
            phoneNumber: request.payload.phoneNumber,
            address: request.payload.address,
            address2: request.payload.address2,
            location: {
                latitude: request.payload.location.latitude,
                longitude: request.payload.location.longitude
            }
        };

        let newRider = await models.Rider.createAsync(newRiderData);

        return {result: 'ok'}

    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

/**
 * Validate rider credentials
 *
 * @param request
 * @param h
 * @returns {Promise<{email: *, scope: *, token: *}>}
 */
const authenticate = async function (request, h) {

    try {
        let email = request.payload.email;
        const rider = await models.Rider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (rider === null) {
            throw Boom.notFound('');
        } else {
            // Check password
            const isValid = await Bcrypt.compare(request.payload.password, rider.get('password'));

            if (isValid) {
                let riderToken = jwt.sign({
                    rider_id: rider.get('rider_id'),
                    email: rider.get('email'),
                    scope: rider.get('scope')
                }, settings.jwtSecretKey, {algorithm: 'HS256', expiresIn: settings.jwtExpiresIn});

                // Uncomment to save cookie instead of being custom managed by client
                //request.cookieAuth.set({token: riderToken});

                return {
                    email: rider.get('email'),
                    scope: rider.get('scope'),
                    rider_code: rider.get('rider_code'),
                    token: riderToken
                };

            } else {
                console.error('wrong credentials');
                throw Boom.unauthorized('rider credentials incorrect or session expired');
            }
        }
    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const update = async (request, h) => {

    try {
        let email = request.params.email;
        const rider = await models.Rider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if ( !rider ) {
            throw Boom.conflict('Rider not found');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);
        let updateData = {
            email: rider.get('email'),
            password: passwordHash,
            name: request.payload.name,
            phoneNumber: request.payload.phoneNumber,
            address: request.payload.address,
            address2: request.payload.address2,
            location: {
                latitude: request.payload.location.latitude,
                longitude: request.payload.location.longitude
            }
        };

        await models.Rider.updateAsync(updateData);

        return {result: 'ok'}

    } catch (e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }

};

const deleteRider = async (request, h) => {

    try {
        let email = request.params.email;
        const rider = await models.Rider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if ( !rider ) {
            throw Boom.notFound("Rider not found");
        }

        await models.Rider.destroy(rider.get('email'));

        return {result: 'ok'};

    } catch (e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const forgotPassword = async (request, h) => {

    try {
        let email = request.payload.email;
        const rider = await models.Rider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if ( !rider ) {
            throw Boom.conflict('Rider not found');
        }

        let updateData = {
            email: rider.get('email'),
            passwordCode: Utils.randomString()
        };

        let updateRider = await models.Rider.updateAsync(updateData);

        await MailerController.sendMail({
            email: rider.get('email'),
            subject: 'TelePharma - Reset password',
            templateFile: 'forgotPassword.hbs',
            templateData: {
                name: rider.get('name'),
                urlConfirm: config.externalUrl + '/rider/changePassword/' + updateData.passwordCode,
                urlLogo: config.aws.cloudfront.mail + '/Pharmacy.jpg'
            }
        });

        return {result: 'ok'}

    } catch(e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const changePassword = async (request, h) => {
    return h.redirect(config.aws.cloudfront.mail + '/rider/changePassword.html?token=' + request.params.passwordCode);
}; 

const resetPassword = async (request, h) => {
    try {
        let rider = await getRiderByPasswordCode(request.payload.passwordCode); 

        if ( !rider ) {
            throw Boom.conflict('Rider not found');
        }

        rider = rider.Items[0].attrs;

        if ( request.payload.passwordCode === rider.passwordCode ){

            let passwordHash = Utils.hashPassword(request.payload.password);
            let updateData = {
                email: rider.email,
                password: passwordHash,
                passwordCode: ' '
            };

            await models.Rider.updateAsync(updateData);

            return {result: 'ok'}
        }

        return {result: 'No match found to change password'};

    } catch(e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const getRiderByPasswordCode = async passwordCode => {
    return await models.Rider.scan()
        .where('passwordCode').equals(passwordCode)
        .execAsync();
};

const collectOrder = async (request, h) => {
    try {
        let rider = await getRider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.payload.order_id);

        let tracking = order.get('tracking');

        if ( _.last(tracking).status !== constants.ORDER_STATUS.READY_TO_SHIP ) {
             throw Boom.notAcceptable('Status not allowed to be changed');
        }

        tracking.push({
            status: constants.ORDER_STATUS.IN_DISTRIBUTION,
            dateTime: moment().format()
        });

        // Notification to user
        let dataToSend = {
            app_id: constants.APP_ID.CLIENT,
            user_id: order.get('user').user_id,
            param: order.get('order_id'),
            notificationType: constants.NOTIFICATION_TYPE.USER,
            type: constants.NOTIFICATION_TYPE.ORDER,
            title: 'Pedido en Distribuición',
            message: 'Informamos que su pedido se esta distribuyendo'
        };

        await MessageController.messageTo(dataToSend);

        return await models.Order.updateAsync({
            order_id: order.get('order_id'),
            tracking: tracking,
            lastStatus: constants.ORDER_STATUS.IN_DISTRIBUTION
        });

    } catch (e) {
        return e;
    }
};

const checkToFinishedOrder = async orderID => {
    try {
        let order = await OrderController.getOrder(orderID);
        let tracking = order.get('tracking');
            
        // if aldready don't have the FINISHED status we set the status
        if ( _.last(tracking).status !== constants.ORDER_STATUS.FINISHED && !order.get('isFinishedUser') ) {
            tracking.push({
                status: constants.ORDER_STATUS.FINISHED,
                dateTime: moment().format()
            });

            models.Order.updateAsync({
                order_id: orderID,
                tracking: tracking,
                isFinishedUser: true,
                lastStatus: constants.ORDER_STATUS.FINISHED
            });
        }
    } catch (e) {
        throw new Error(e);
    }
};

const deliveryOrder = async (request, h) => {
    try {
        let rider = await getRider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.payload.order_id);

        let tracking = order.get('tracking');
        if ( _.last(tracking).status !== constants.ORDER_STATUS.IN_DISTRIBUTION ) {
            return Boom.notAcceptable('Status not allowed to be changed');
        }

        let card = order.get('payment').card;
        if ( _.isNil(card) ) {
            return Boom.preconditionFailed('You cannot delivery an unpaid order');
        }

        tracking.push({
            status: constants.ORDER_STATUS.DELIVERED,
            dateTime: moment().format()
        });

        // Notification to user
        let dataToSend = {
            app_id: constants.APP_ID.CLIENT,  
            user_id: order.get('user').user_id,
            param: order.get('order_id'),
            notificationType: constants.NOTIFICATION_TYPE.USER,
            type: constants.NOTIFICATION_TYPE.ORDER,
            title: 'Pedido Entregado',
            message: 'Informamos que su pedido ha sido entregado'
        };

        await MessageController.messageTo(dataToSend);

        // when deliverd product we start the alarm
        await AlertController.startAlerts(order.get('order_id'), order.get('user').user_id);

        setTimeout(() => {
            checkToFinishedOrder(request.payload.order_id);
        }, constants.TIMEOUT.FINISHED_ORDER);
        
        return await models.Order.updateAsync({
            order_id: order.get('order_id'),
            tracking: tracking,
            isFinishedRider: true,
            lastStatus: constants.ORDER_STATUS.DELIVERED
        });

    } catch (e) {
        return e;
    }
};

const assignOrder = async (request, h) => {
    try {
        let rider = await getRider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.payload.order_id);

        if ( !_.isNil(order.get('rider').rider_id) && rider.get('rider_id') === order.get('rider').rider_id ) {
             throw Boom.notAcceptable('Rider not exist or already assigned to this Rider');
        }

        let tracking = order.get('tracking');
        let lastStatus = _.last(tracking).status;

        if ( lastStatus === constants.ORDER_STATUS.PENDING_APPROVAL && lastStatus === constants.ORDER_STATUS.IN_PREPARATION ) {
            throw Boom.notAcceptable('Rider cannot assign no valid or no prepared order');
        }

        return await models.Order.updateAsync({
            order_id: order.get('order_id'),
            rider: {
                rider_id: rider.get('rider_id'),
                name: rider.get('name'),
                phoneNumber: rider.get('phoneNumber')
            }
        });

    } catch (e) {
        return e;
    }
};

const unassignOrder = async (request, h) => {
    try {
        // TODO: Change to email
        //let rider = await getRider(request.params.email);
        let rider = await getRiderById(request.params.rider_id);
        rider = rider.Items[0].attrs;
 
        let order = await OrderController.getOrder(request.payload.order_id);

        if ( !_.isNil(order.get('rider').rider_id) && rider.rider_id !== order.get('rider').rider_id ) {
             throw Boom.notAcceptable('Cannot unassign a Rider for Order with destint id');
        }

        let tracking = order.get('tracking');
        let lastStatus = _.last(tracking).status;

        if ( lastStatus !== constants.ORDER_STATUS.CANCELLED && lastStatus !== constants.ORDER_STATUS.IN_PREPARATION ){
            tracking.push({
                status: constants.ORDER_STATUS.READY_TO_SHIP,
                dateTime: moment().format()
            });
        }
        
        return await models.Order.updateAsync({
            order_id: order.get('order_id'),
            tracking: tracking,
            rider: {},
            lastStatus: constants.ORDER_STATUS.READY_TO_SHIP
        });

    } catch (e) {
        return e;
    }
};

const getOrders = async (request, h) => {
    try {
        let rider = await getRider(request.auth.credentials.email);
        let orders = await OrderController.getOrdersFromRiderID(rider.get('rider_id'));
        let searchedItems = [];

        let data = request.payload;
        let elements = data.pagination.numElements;
        let page = data.pagination.page;

        let totalElements = elements * page;
        let min = totalElements;
        let max = totalElements + ( elements - 1 );

        let finalResults = [];

        orders.Items.forEach(order => {
            let lastStatus = _.last(order.attrs.tracking).status;
            if ( lastStatus !== constants.ORDER_STATUS.PENDING_APPROVAL && lastStatus !== constants.ORDER_STATUS.IN_PREPARATION ){
                searchedItems.push(_.omit(order.attrs, ['user', 'rider', 'payment', 'products.items']));
            }
        });

        searchedItems.forEach((item, index) => {
            if ( min <= index && index <= max ){
                finalResults.push(item);
            }
        });

        let sortKey = 'tracking';
        let sortValue = 'status'; 
        
        finalResults.sort((a, b) => {

            if ( !_.isUndefined(a[sortKey]) && !_.isUndefined(b[sortKey]) ){
                return _.last(b[sortKey])[sortValue].localeCompare(_.last(a[sortKey])[sortValue]);
            }

            return [];

        });
        
        return {
            Items: finalResults,
            Count: finalResults.length,
            ScannedCount: searchedItems.length
        };

    } catch (e) {
        return e;
    }
};

const getUnassignedOrders = async (request, h) => {
    try {
        let rider = await getRider(request.auth.credentials.email);
        let orders = await OrderController.getOrdersFromNullRider();
        let searchedItems = [];

        let data = request.payload;
        let elements = data.pagination.numElements;
        let page = data.pagination.page;

        let totalElements = elements * page;
        let min = totalElements;
        let max = totalElements + ( elements - 1 );

        let finalResults = [];
        
        orders.Items.forEach(order => {
            let lastStatus = _.last(order.attrs.tracking).status;
            if ( lastStatus === constants.ORDER_STATUS.READY_TO_SHIP ){
                searchedItems.push(_.omit(order.attrs, ['user', 'rider', 'payment', 'products.items']));
            }
        });

        searchedItems.forEach((item, index) => {
            if ( min <= index && index <= max ){
                finalResults.push(item);
            }
        });

        let sortKey = 'createdAt'; 
        
        finalResults.sort((a, b) => {

            if ( !_.isUndefined(a[sortKey]) && !_.isUndefined(b[sortKey]) ){
                return b[sortKey].localeCompare(a[sortKey]);
            }

            return [];

        });

        return {
            Items: finalResults,
            Count: finalResults.length,
            ScannedCount: searchedItems.length
        };
        
    } catch (e) {
        return e;
    }
};

const getOrderDetail = async (request, h) => {
    try {
        let rider = await getRider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.params.order_id);

        if (_.isNil(order)) {
            throw Boom.notFound('Order not found');
        }

        if ( !_.isNil(order.get('rider').rider_id) && rider.get('rider_id') !== order.get('rider').rider_id ) {
            throw Boom.notAcceptable('Order assigned to another Rider');
        }

        return order;
    } catch (e) {
        return e;
    }
};

const checkRiderExists = async function (user_id) {
    return new Promise((resolve) => {

        models.Rider.get(user_id, {ConsistentRead: true}, function (err, item) {
            if (err || _.isNull(item)) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

const getRiderById = async riderID => {
    return models.Rider.scan()
        .where('rider_id').equals(riderID)
        .execAsync();
};

const getRiders = async (request, h) => {

    try {
        let filterExp = '', expValues = {}, expNames = {};
        let queryOptions = [];

        let data = request.payload;

        let objFilters = data.filters;

        let sortObj = data.sort;
        let sortKey, sortValue;

        for ( let prop in sortObj ){
            sortKey = prop;
            sortValue = sortObj[prop];
        }

        let elements = data.pagination.numElements;
        let page = data.pagination.page;

        if (!_.isNil(objFilters)) {
            for ( let prop in objFilters ){
                queryOptions.push({name: prop, value: objFilters[prop]});
            }
        }

        let totalElements = elements * page;
        let min = totalElements;
        let max = totalElements + ( elements - 1 );

        queryOptions.forEach((val, index) => {
            if (index === 0) {
                filterExp = `contains(#${index}, :${index})`;
            } else {
                filterExp += ` AND contains(#${index}, :${index})`;
            }
            expValues[`:${index}`] = val.value.toLowerCase();
            expNames[`#${index}`] = val.name;
        });

        let result, tempResults = [], finalObjResults = [];

        let results = await models.Rider.scan().execAsync();

        if ( queryOptions.length > 0 ){
            result = await models.Rider.scan()
                .filterExpression(filterExp)
                .expressionAttributeValues(expValues)
                .expressionAttributeNames(expNames)
                .execAsync(); 
        } else {
            result = results;
        }
        
        result.Items.forEach((item, index) => {
            tempResults.push(item.attrs);
        });

        if ( !_.isUndefined(sortKey) && !_.isUndefined(sortValue) ){
            tempResults.sort((a, b) =>{

                if ( sortKey === 'phoneNumber' ){
                    return sortValue === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
                }

                if ( !_.isUndefined(a[sortKey]) && !_.isUndefined(b[sortKey]) ){
                    return sortValue === 'asc' ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
                }

                return [];

            });
        }

        tempResults.forEach((item, index) => {
            if ( min <= index && index <= max ){
                finalObjResults.push(item);
            }
        });

        return {
            Items: finalObjResults,
            Count: finalObjResults.length,
            ScannedCount: queryOptions.length > 0 ? result.Items.length : results.ScannedCount
        };

    } catch (e) {
        return e;
    }

};

/**
 * PRIVATE METHODS
 */
/**
* @function getRider Get a Rider
* @param {string} email Email corresponde to the rider
* @return {promise}
*/
const getRider = async email => {
    return new Promise((resolve, reject) => {

        models.Rider.get(email, {ConsistentRead: true}, (err, item) => {
            if (err || _.isNil(item)) {
                reject(Boom.notFound('Rider not found'));
            } else {
                resolve(item);
            }
        });

    });
};

module.exports.register = register;
module.exports.update = update;
module.exports.deleteRider = deleteRider;
module.exports.authenticate = authenticate;
module.exports.checkRiderExists = checkRiderExists;
module.exports.getOrders = getOrders;
module.exports.getOrderDetail = getOrderDetail;
module.exports.assignOrder = assignOrder;
module.exports.unassignOrder = unassignOrder;
module.exports.getRiders = getRiders;
module.exports.getUnassignedOrders = getUnassignedOrders;
module.exports.collectOrder = collectOrder;
module.exports.deliveryOrder = deliveryOrder;
module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword = resetPassword;
module.exports.changePassword = changePassword;
