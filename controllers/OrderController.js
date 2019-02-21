module.exports = {};
const models             = require('../models'),
      ProductController  = require('./ProductController'),
      ProviderController = require('./ProviderController'),
      Boom               = require('boom'),
      Bcrypt             = require('bcrypt'),
      jwt                = require('jsonwebtoken'),
      settings           = require('config'),
      _                  = require('lodash'),
      moment             = require('moment'),
      constants          = require('./constants'),
      Utils              = require('./utils');

const createOrder = async function (user, delivery) {

    let cart = user.get("cart");
    let provider = await ProviderController.getProviderByID(delivery.provider_id);

    // Create new order
    let orderData = {
        orderDate: moment().format(),
        order_code: Utils.generateCode(8),
        isPaid: false,
        isProcess: false,
        user: {
            user_id: user.get("user_id"),
            name: user.get("name"),
            phoneNumber: user.get("phoneNumber"),
            address: user.get("address"),
            address2: user.get("address2")
        },
        provider: {
            provider_id: provider.get("provider_id"),
            name: provider.get("name"),
            phoneNumber: provider.get("phoneNumber"),
            address: provider.get("address"),
            address2: provider.get("address2")
        },
        rider: {},
        tracking: [{
            status: constants.ORDER_STATUS.PENDING_APPROVAL,
            dateTime: moment().format()
        }],
        delivery: delivery,
        payment: {},
        products: cart,
        lastStatus: constants.ORDER_STATUS.PENDING_APPROVAL
    };

    return models.Order.createAsync(orderData);

};

const getOrdersFromUserID = async function (user_id) {
    return models.Order.scan()
        .where('user.user_id')
        .equals(user_id)
        .execAsync();
};

const getOrdersFromProviderID = async function (provider_id) {
    return models.Order.scan()
        .where('provider.provider_id')
        .equals(provider_id)
        .execAsync();
};

const getOrdersFromRiderID = async rider_id => {
    return models.Order.scan()
        .where('rider.rider_id')
        .equals(rider_id)
        .execAsync();
};

const getOrdersFromNullRider = async () => {
    return models.Order.scan()
        .where('rider.rider_id')
        .null()
        .execAsync();
};

const getOrders = async (request, h) => {

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

            let valor = val.value;
            
            if ( val.name === 'user.name' || val.name === 'rider.name' ){

                valor = valor.toLowerCase();
                
                if ( valor.split(' ').length === 1 ){
                    let first = valor.split('');
                    first[0] = first[0].toUpperCase();

                    let res = '';
                    for ( let i = 0; i < first.length; ++i ){
                        res += first[i];
                    }

                    valor = res;
                }

                if ( valor.split(' ').length === 2 ){
                    let first = valor.split(' ')[0].split('');
                    first[0] = first[0].toUpperCase();

                    let second = valor.split(' ')[1].split('');
                    second[0] = second[0].toUpperCase();

                    let resFirst = '';
                    for ( let i = 0; i < first.length; ++i ){
                        resFirst += first[i];
                    }

                    let resSecond = '';
                    for ( let i = 0; i < second.length; ++i ){
                        resSecond += second[i];
                    }
                    valor = resFirst + ' ' + resSecond;
                }                
            
            }

            let prefix = val.name;
            let suffix = '';

            if( val.name.indexOf('.') != -1 ) {
                prefix = val.name.split('.')[0];
                suffix ='.#' +  val.name.split('.')[1];
            }

            if ( val.name.indexOf('orderDate') != -1 ){
                suffix = '';
            }

            if (index === 0) {
                filterExp = val.name.indexOf('products') != -1 || val.name.indexOf('orderDate') != -1 ? `#${index}${suffix} > :${index}` : `#${index}${suffix} = :${index}`;
            } else {
                filterExp += val.name.indexOf('products') != -1 || val.name.indexOf('orderDate') != -1 ? ` AND #${index}${suffix} < :${index}` : ` AND #${index}${suffix} = :${index}`;
            }
            
            expNames[`#${index}`] = prefix;
            expValues[`:${index}`] = valor;

            if( suffix.length !== 0 ){
                let tmp = val.name.split('.')[1];
                expNames[`#${tmp}`] = tmp;
            }

        });

        let result, tempResults = [], finalObjResults = [];

        let results = await models.Order.scan().execAsync();

        if ( queryOptions.length > 0 ){
            result = await models.Order.scan()
                .filterExpression(filterExp)
                .expressionAttributeValues(expValues)
                .expressionAttributeNames(expNames)
                .execAsync();
        } else {
            result = results;
        }

        let totalPrice = [];

        let process = data.alerts && data.alerts.isProcess;
        let prescriptionRequired = data.prescription && data.prescription.required;

        result.Items.forEach((item, index) => {
            if ( !_.isUndefined(process) ){
                if ( item.attrs.lastStatus === constants.ORDER_STATUS.READY_TO_SHIP 
                    || item.attrs.lastStatus === constants.ORDER_STATUS.IN_DISTRIBUTION 
                    || item.attrs.lastStatus === constants.ORDER_STATUS.DELIVERED 
                    || item.attrs.lastStatus === constants.ORDER_STATUS.FINISHED ) {
                    if ( process === item.attrs.isProcess ){
                        tempResults.push(item.attrs);
                    } 
                }
            } else {
                if ( !_.isUndefined(prescriptionRequired) ){
                    let numProducts = item.attrs.products.items.length;
                    item.attrs.products.items.forEach((product, index) => {
                        if ( prescriptionRequired === product.prescriptionRequired ){
                            if ( index === numProducts - 1 ){
                                tempResults.push(item.attrs);
                            }   
                        }
                    });
                } else {
                    tempResults.push(item.attrs);
                }
            }
        });

        if ( !_.isUndefined(sortKey) && !_.isUndefined(sortValue) ){
    
            let prefix;
    
            if ( sortKey.indexOf('.') != -1 ){
                prefix = sortKey.split('.')[0];
                sortKey = sortKey.split('.')[1];
            }

            tempResults.sort((a, b) => {

                if ( sortKey === 'phoneNumber' ){
                    return sortValue === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
                }

                if ( _.isUndefined(prefix) ){
                    return sortValue === 'asc' ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
                }

                if ( prefix.indexOf('tracking') != -1 ){
                    return sortValue === 'asc' ? _.last(a[prefix])[sortKey].localeCompare(_.last(b[prefix])[sortKey]) : _.last(b[prefix])[sortKey].localeCompare(_.last(a[prefix])[sortKey]);
                }

                if ( !_.isUndefined(a[prefix][sortKey]) && !_.isUndefined(b[prefix][sortKey]) ){
                    return sortValue === 'asc' ? a[prefix][sortKey].localeCompare(b[prefix][sortKey]) : b[prefix][sortKey].localeCompare(a[prefix][sortKey]);
                }

                return [];

            });
 
        }

        tempResults.forEach((item, index) => {
            if ( min <= index && index <= max ){
                finalObjResults.push(item);
                totalPrice.push(item.products.subtotal);
            }
        });

        let scannedCount = 0;

        if ( !_.isUndefined(prescriptionRequired) || !_.isUndefined(process) ) {
            scannedCount = tempResults.length;
        } else {
            scannedCount = queryOptions.length > 0 ? result.Items.length : results.ScannedCount;
        }

        return {
            minSubtotal: tempResults.length > 0 ? _.min(totalPrice) : 0,
            maxSubtotal: tempResults.length > 0 ? _.max(totalPrice) : 1,
            Items: finalObjResults,
            Count: finalObjResults.length,
            ScannedCount: scannedCount
        };

    } catch (e) {
        return e;
    }

};

const getOrder = async function (order_id) {
    return models.Order.getAsync(order_id, {ConsistentRead: true});
};

const cancelOrder = async (request, h) => {
    try {
        let order = await getOrder(request.params.order_id);
        let tracking = order.get('tracking');

        tracking.push({
            status: constants.ORDER_STATUS.CANCELLED,
            dateTime: moment().format()
        });

        return await models.Order.updateAsync({
            order_id: order.get('order_id'),
            tracking: tracking
        });
    } catch (e) {
        return (e);
    }
};

const updateOrder = async function (order_id, data) {
    let order = await getOrder(order_id);
    let newData = Object.assign({}, {order_id: order.get('order_id')}, data);

    return models.Order.updateAsync(newData);
};

const processOrder = async (request, h) => {
    try {
        let order = await getOrder(request.payload.order_id);
        let dataToUpdate = {
            isProcess: request.payload.process
        }
        return await updateOrder(request.payload.order_id, dataToUpdate);
    } catch (e) {
        return (e);
    }
};

module.exports.createOrder = createOrder;
module.exports.getOrdersFromUserID = getOrdersFromUserID;
module.exports.getOrdersFromProviderID = getOrdersFromProviderID;
module.exports.getOrdersFromRiderID = getOrdersFromRiderID;
module.exports.getOrdersFromNullRider = getOrdersFromNullRider;
module.exports.getOrder = getOrder;
module.exports.getOrders = getOrders;
module.exports.updateOrder = updateOrder;
module.exports.cancelOrder = cancelOrder;
module.exports.processOrder = processOrder;
