module.exports = {};
const models            = require('../models'),
      WebPushController = require('./WebPushController'),
      AlertController   = require('./AlertController'),
      Boom              = require('boom'),
      Bcrypt            = require('bcrypt'),
      jwt               = require('jsonwebtoken'),
      settings          = require('config'),
      _                 = require('lodash'),
      Utils             = require('./utils');

const register = async (request, h) => {

    try {
        let email = request.payload.email;
        let admin = await models.Admin.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (admin !== null) {
            throw Boom.conflict('Email already exists');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);

        let newAdminData = {
            email: request.payload.email,
            password: passwordHash,
            scope: 'admin',
            enable: true,
            name: request.payload.name
        };

        let newAdmin = await models.Admin.createAsync(newAdminData);

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
 * Validate admin credentials
 *
 * @param request
 * @param h
 * @returns {Promise<{email: *, scope: *, token: *}>}
 */
const authenticate = async function (request, h) {

    try {
        let email = request.payload.email;
        const admin = await models.Admin.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (admin === null) {
            throw Boom.notFound('');
        } else {
            // Check password
            const isValid = await Bcrypt.compare(request.payload.password, admin.get('password'));

            if (isValid) {
                let adminToken = jwt.sign({
                    admin_id: admin.get('admin_id'),
                    email: admin.get('email'),
                    scope: admin.get('scope')
                }, settings.jwtSecretKey, {algorithm: 'HS256', expiresIn: settings.jwtExpiresIn});

                // Uncomment to save cookie instead of being custom managed by client
                //request.cookieAuth.set({token: adminToken});

                return {
                    email: admin.get('email'),
                    name: admin.get('name'),
                    scope: admin.get('scope'),
                    token: adminToken
                };

            } else {
                console.error('wrong credentials');
                throw Boom.unauthorized('admin credentials incorrect or session expired');
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
        const admin = await models.Admin.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (!admin) {
            throw Boom.conflict('Admin not found');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);
        let updateData = {
            email: admin.get('email'),
            password: passwordHash,
            name: request.payload.name
        };

        await models.Admin.updateAsync(updateData);

        return {result: 'ok'}

    } catch (e) {
        if (e.isBoom) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }

};

const deleteAdmin = async (request, h) => {
    try {
        let email = request.params.email;
        const admin = await models.Admin.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (!admin) {
            throw Boom.conflict('Admin not found');
        }

        if (request.auth.credentials.email === admin.get('email')) {
            return {result: 'you cannot delete your own user'};
        }

        await models.Admin.destroy(admin.get('email'));

        return {result: 'ok'};

    } catch (e) {
        if (e.isBoom) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const getAdmin = async email => {
    return new Promise((resolve, reject) => {
        models.Admin.get(email, {ConsistentRead: true}, (err, item) => {
            if (err || _.isNil(item)) {
                reject(Boom.notFound('Admin not found'));
            } else {
                resolve(item);
            }
        });

    });
};

const getAdmins = async (request, h) => {

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
                filterExp = `#${index} = :${index}`;
            } else {
                filterExp += ` AND #${index} = :${index}`;
            }
            expValues[`:${index}`] = val.value;
            expNames[`#${index}`] = val.name;
        });

        let result, tempResults = [], finalObjResults = [];

        let results = await models.Admin.scan().execAsync();

        if ( queryOptions.length > 0 ){
            result = await models.Admin.scan()
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
                return sortValue === 'asc' ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
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

const sendWebPush = async (request, h) => {
    try {
        let admin = await getAdmin(request.payload.email);
        let title = request.payload.title;
        let message = request.payload.message;

        if ( !admin ) {
            throw Boom.conflict('Admin not found');
        }

        await WebPushController.sendWebPush(title, message, admin.get('pushSubscription'));

        return {status: 'ok'};
    } catch (e) {
        return e;
    }
};

const subscribeToPush = async (request, h) => {
    try {
        let admin = await getAdmin(request.auth.credentials.email);

        if ( !admin ) {
            throw Boom.conflict('Admin not found');
        }

        await models.Admin.updateAsync({email: admin.get('email') , pushSubscription: request.payload.subscription});

        return {result: 'ok'}

    } catch (e) {
        return e;
    }
};

const getAlerts = async (request, h) => {
    try {
        return await AlertController.getAlertsByOrderID(request.params.order_id);
    
    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.badData('Error geting the alarms');
        }
    }
};

const getUserAlerts = async (request, h) => {
    try {
        return await AlertController.getAlertsByUserID(request.params.user_id);
    
    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.badData('Error geting the alarms from user');
        }
    }
};

const getProducts = async (request, h) => {
    let pagination = request.payload.pagination;
    let elements = pagination.numElements;
    let lastKey = pagination.lastKey;

    try {
        // elements have to be distinct of zero otherwise dispatch an error
        if ( elements === 0 || _.isUndefined(elements) || !_.isNumber(elements) ){
            elements = 1;
        }

        if ( lastKey === '' || lastKey === ' ' || typeof lastKey !== 'string' ){
            lastKey = undefined;
        }

        let data = request.payload;
        let lastObjects = [];
        let results, result, tempResults = [], finalObjResults = [];
    
        let filterExp = '', expValues = {}, expNames = {};
        let queryOptions = [];
    
        let objFilters = data.filters;
        let page = pagination.page;
        
        if (!_.isNil(objFilters)) {
            for ( let prop in objFilters ){
                queryOptions.push({name: prop, value: objFilters[prop]});
            }
        }

        // ordenation
        let sortObj = data.sort;
        let sortKey, sortValue;

        for ( let prop in sortObj ){
            sortKey = prop;
            sortValue = sortObj[prop];
        }

        let totalElements = elements * page;
        let min = totalElements;
        let max = totalElements + ( elements - 1 );

        queryOptions.forEach((val, index) => {

            if (index === 0) {
                if ( val.name === 'prescriptionRequired' ){
                    filterExp = `#${index} = :${index}`;
                } else if ( val.name === 'pvpVat' ){
                    filterExp = `#${index} = :${index}`;
                    // TODO
                    //filterExp = `#${index} BETWEEN  :${index} AND :${index2}`;
                } else {
                    filterExp = `contains(#${index}, :${index})`;
                }
            } else {
                if ( val.name === 'prescriptionRequired' ){
                    filterExp += ` AND #${index} = :${index}`;
                } else if ( val.name === 'pvpVat' ){
                    filterExp = `#${index} = :${index}`;
                } else {
                    filterExp += ` AND contains(#${index}, :${index})`;
                }
            }
            if ( val.name === 'name' ){
                expValues[`:${index}`] = val.value.toUpperCase();
            } else {
                expValues[`:${index}`] = val.value;
            }
            expNames[`#${index}`] = val.name;
        });

        if ( queryOptions.length > 0 ){
            
            results = await models.Product.scan()
                .filterExpression(filterExp)
                .expressionAttributeValues(expValues)
                .expressionAttributeNames(expNames)
                .execAsync(); 

            results.Items.forEach((item, index) => {
                tempResults.push(item.attrs);
            });

            if ( !_.isUndefined(sortKey) && !_.isUndefined(sortValue) ){
                tempResults.sort((a, b) =>{
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
                ScannedCount: queryOptions.length > 0 ? results.Items.length : results.ScannedCount
            };

        } else {

            if ( _.isUndefined(lastKey) ){
                
                result = await models.Product.scan()
                    .limit(elements)
                    .execAsync(); 

            } else {
                
                result = await models.Product.scan()
                    .startKey(lastKey)
                    .limit(elements)
                    .execAsync(); 
            }

            if ( !_.isUndefined(sortKey) && !_.isUndefined(sortValue)  ){
                
                result.Items.forEach((item, index) => {
                    tempResults.push(item.attrs);
                });
    
                tempResults.sort((a, b) =>{
                    if ( !_.isUndefined(a[sortKey]) && !_.isUndefined(b[sortKey]) ){
                        return sortValue === 'asc' ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
                    }
                    return [];
                });

                let finalObject = {
                    Items: tempResults,
                    Count: tempResults.length,
                    ScannedCount: queryOptions.length > 0 ? result.Items.length : result.ScannedCount
                };

                if ( result.Items.length >= elements ){
                    Object.assign(finalObject, { LastEvaluatedKey: { product_id: _.last(tempResults).product_id } } );
                }

                return finalObject;

            } else {
                
                return result;
            }
           
        }

    } catch (e) {
        return e;
    }
    
};

module.exports.authenticate = authenticate;
module.exports.register = register;
module.exports.update = update;
module.exports.deleteAdmin = deleteAdmin;
module.exports.getAdmins = getAdmins;
module.exports.subscribeToPush = subscribeToPush;
module.exports.sendWebPush = sendWebPush;
module.exports.getAlerts = getAlerts;
module.exports.getUserAlerts = getUserAlerts;
module.exports.getProducts = getProducts;