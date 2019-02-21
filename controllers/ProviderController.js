module.exports = {};
const models            = require('../models'),
      OrderController   = require('./OrderController'),
      MessageController = require('./MessageController'),
      WebPushController = require('./WebPushController'),
      constants         = require('./constants'),
      Boom              = require('boom'),
      Bcrypt            = require('bcrypt'),
      jwt               = require('jsonwebtoken'),
      config            = require('config'),
      settings          = require('config'),
      _                 = require('lodash'),
      moment            = require('moment'),
      AWS               = require('aws-sdk'),
      uuidv4            = require('uuid/v4'),
      Utils             = require('./utils'),
      geolib            = require('geolib');

AWS.config.update(config.aws.credentials);

const authenticate = async function (request, h) {

    try {
        let email = request.payload.email;
        const provider = await models.Provider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (provider === null) {
            throw Boom.notFound('');
        } else {
            // Check password
            const isValid = await Bcrypt.compare(request.payload.password, provider.get('password'));

            if (isValid) {
                let providerToken = jwt.sign({
                    provider_id: provider.get('provider_id'),
                    email: provider.get('email'),
                    scope: provider.get('scope')
                }, settings.jwtSecretKey, {algorithm: 'HS256', expiresIn: settings.jwtExpiresIn});

                // Uncomment to save cookie instead of being custom managed by client
                //request.cookieAuth.set({token: providerToken});

                return {
                    email: provider.get('email'),
                    scope: provider.get('scope'),
                    token: providerToken
                };

            } else {
                console.error('wrong credentials');
                throw Boom.unauthorized('provider credentials incorrect or session expired');
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

const subscribeToPush = async function (request, h) {
    try {
        let provider = await getProvider(request.auth.credentials.email);

        if ( !provider ) {
            throw Boom.conflict('Provider not found');
        }

        await models.Provider.updateAsync({email: provider.get('email') , pushSubscription: request.payload.subscription});

        return {result: 'ok'}

    } catch (e) {
        return e;
    }
};

const register = async (request, h) => {

    try {
        let email = request.payload.email;
        const provider = await models.Provider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (provider !== null) {
            throw Boom.conflict('email already exists');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);
        let newProviderData = {
            email: email.toLowerCase(),
            password: passwordHash,
            scope: 'provider',
            name: request.payload.name,
            description: request.payload.description,
            phoneNumber: request.payload.phoneNumber,
            address: request.payload.address,
            address2: request.payload.address2,
            location: {
                latitude: request.payload.location.latitude,
                longitude: request.payload.location.longitude
            },
            businessCalendar: {
                businessHours: {
                    monday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.monday.morning.open,
                            close: request.payload.businessCalendar.businessHours.monday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.monday.evening.open,
                            close: request.payload.businessCalendar.businessHours.monday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.monday.allDay
                    },
                    thursday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.thursday.morning.open,
                            close: request.payload.businessCalendar.businessHours.thursday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.thursday.evening.open,
                            close: request.payload.businessCalendar.businessHours.thursday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.thursday.allDay
                    },
                    wednesday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.wednesday.morning.open,
                            close: request.payload.businessCalendar.businessHours.wednesday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.wednesday.evening.open,
                            close: request.payload.businessCalendar.businessHours.wednesday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.wednesday.allDay
                    },
                    tuesday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.tuesday.morning.open,
                            close: request.payload.businessCalendar.businessHours.tuesday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.tuesday.evening.open,
                            close: request.payload.businessCalendar.businessHours.tuesday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.tuesday.allDay
                    },
                    friday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.friday.morning.open,
                            close: request.payload.businessCalendar.businessHours.friday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.friday.evening.open,
                            close: request.payload.businessCalendar.businessHours.friday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.friday.allDay
                    },
                    saturday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.saturday.morning.open,
                            close: request.payload.businessCalendar.businessHours.saturday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.saturday.evening.open,
                            close: request.payload.businessCalendar.businessHours.saturday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.saturday.allDay
                    },
                    sunday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.sunday.morning.open,
                            close: request.payload.businessCalendar.businessHours.sunday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.sunday.evening.open,
                            close: request.payload.businessCalendar.businessHours.sunday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.sunday.allDay
                    }
                },
                blacklist: request.payload.businessCalendar.blacklist,
                whitelist: request.payload.businessCalendar.whitelist
            }
        };

        let newProvider = await models.Provider.createAsync(newProviderData);

        return {result: 'ok'}

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
        const provider = await models.Provider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if ( !provider ) {
            throw Boom.conflict('Provider not found');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);
        let updateData = {
            email: provider.get('email'),
            password: passwordHash,
            name: request.payload.name,
            description: request.payload.description,
            phoneNumber: request.payload.phoneNumber,
            address: request.payload.address,
            address2: request.payload.address2,
            location: {
                latitude: request.payload.location.latitude,
                longitude: request.payload.location.longitude
            },
            businessCalendar: {
                businessHours: {
                    monday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.monday.morning.open,
                            close: request.payload.businessCalendar.businessHours.monday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.monday.evening.open,
                            close: request.payload.businessCalendar.businessHours.monday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.monday.allDay
                    },
                    thursday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.thursday.morning.open,
                            close: request.payload.businessCalendar.businessHours.thursday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.thursday.evening.open,
                            close: request.payload.businessCalendar.businessHours.thursday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.thursday.allDay
                    },
                    wednesday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.wednesday.morning.open,
                            close: request.payload.businessCalendar.businessHours.wednesday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.wednesday.evening.open,
                            close: request.payload.businessCalendar.businessHours.wednesday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.wednesday.allDay
                    },
                    tuesday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.tuesday.morning.open,
                            close: request.payload.businessCalendar.businessHours.tuesday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.tuesday.evening.open,
                            close: request.payload.businessCalendar.businessHours.tuesday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.tuesday.allDay
                    },
                    friday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.friday.morning.open,
                            close: request.payload.businessCalendar.businessHours.friday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.friday.evening.open,
                            close: request.payload.businessCalendar.businessHours.friday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.friday.allDay
                    },
                    saturday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.saturday.morning.open,
                            close: request.payload.businessCalendar.businessHours.saturday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.saturday.evening.open,
                            close: request.payload.businessCalendar.businessHours.saturday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.saturday.allDay
                    },
                    sunday: {
                        morning: {
                            open: request.payload.businessCalendar.businessHours.sunday.morning.open,
                            close: request.payload.businessCalendar.businessHours.sunday.morning.close
                        },
                        evening: {
                            open: request.payload.businessCalendar.businessHours.sunday.evening.open,
                            close: request.payload.businessCalendar.businessHours.sunday.evening.close
                        },
                        allDay: request.payload.businessCalendar.businessHours.sunday.allDay
                    }
                },
                blacklist: request.payload.businessCalendar.blacklist,
                whitelist: request.payload.businessCalendar.whitelist
            }
        };

        await models.Provider.updateAsync(updateData);

        return {result: 'ok'}

    } catch (e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }

};

const deleteProvider = async (request, h) => {

    try {
        let email = request.params.email;
        const provider = await models.Provider.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if ( !provider ) {
            throw Boom.notFound("Provider not found");
        }

        await models.Provider.destroy(provider.get('email'));

        return {result: 'ok'};

    } catch (e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const deleteImages = async (request, h) => {

    let images = [];

    if ( _.isString(request.payload.images) ){
        images.push(request.payload.images);
    }

    if ( _.isArray(request.payload.images) ){
        images = request.payload.images;
    }
    
    if ( images && images.length > 0 ){

        const s3 = new AWS.S3();

        let imagesToDelete = [];

        let provider = await getProvider(request.payload.email);
        let providerImages = provider.get('images');
        let auxImages = [];

        for ( let i = 0; i < providerImages.length; ++i ){
            for ( let j = 0; j < images.length; ++j ){
                if ( images[j] === providerImages[i] ){
                    let index = providerImages.indexOf(providerImages[i]);
                    providerImages.splice(index, 1);
                }
            }
        }
        
        auxImages = images;

        images = images.map(img => {
            return img.replace(config.aws.cloudfront.prescriptions + '/','');
        });

        images.forEach(img => {
            let key = { Key: img };
            imagesToDelete.push(key);
        });

        let objectToDelete = {
            Objects: imagesToDelete
        }

        // TODO Añadir la carpeta correspondiente para providers config.aws.s3.provider
        return s3.deleteObjects({
            Bucket: config.aws.s3.prescriptions,
            Delete: objectToDelete
        }).promise()
            .then(() => {
                return models.Provider.updateAsync({email: provider.get('email') , images: providerImages});
            })
            .then(() => {
                return {
                    images: auxImages
                }
            })
            .catch(() => {
                return Boom.badImplementation("Error deleting file");
        });

    } else {
        return Boom.expectationFailed('There are no image to delete');
    }

};

const uploadImage = async (request, h) => {

    // TODO Añadir la carpeta correspondiente para providers config.aws.s3.providers
    const s3 = new AWS.S3({
        params: {Bucket: config.aws.s3.prescriptions}
    });

    let provider = await getProvider(request.payload.email);

    let data = request.payload;

    if ( data.file ) {

        let base64 = data.file;
        
        const base64Data = new Buffer(base64.replace(/^data:image\/\w+;base64,/, ""), constants.CONTENT_ENCODING.BASE64);

        let extension = base64.split(';')[0].split('/')[1];

        if ( !extension || extension === '' || extension === 'jpeg' ){
            extension = 'jpg';
        }

        let providerPrefix = provider.get('provider_id');
        let name = providerPrefix + '/' + uuidv4() + '.' + extension;
        let contentType = Utils.getFileContentType(extension);

        let providerImages = provider.get('images');
        if ( _.isNil(providerImages) ){
            providerImages = [];
        }
        providerImages.push(config.aws.cloudfront.prescriptions + '/' + name);

        return s3.upload({
            Key: name, 
            Body: base64Data,
            ContentEncoding: constants.CONTENT_ENCODING.BASE64,
            ContentType: contentType
        })
            .promise()
            .then(() => {
                return models.Provider.updateAsync({email: provider.get('email') , images: providerImages});
            })
            .then(() => {
                return {
                    image: config.aws.cloudfront.prescriptions + '/' + name
                };
            })
            .catch((e) => {
                return Boom.badImplementation("Error uploading file");
        });

    } else {
        console.error('Cannot copy the data file to the server');
        return Boom.expectationFailed('Cannot copy the data file to the server');
    }
};

const getProviderByID = async function (provider_id) {
    return new Promise((resolve, reject) => {
        models.Provider.scan()
            .where('provider_id')
            .equals(provider_id)
            .execAsync()
            .then((providers) => {
                if (providers.Items.length === 0) {
                    reject(Boom.notFound('Provider not found'));
                }
                resolve(providers.Items[0]);
            })
            .catch((e) => {
                reject(Boom.notFound('Provider not found'));
            });

    });
};

const getOrders = async (request, h) => {

    try {
        let provider = await getProvider(request.auth.credentials.email);
        let orders = await OrderController.getOrdersFromProviderID(provider.get('provider_id'));

        let data = request.payload;
        let elements = data.pagination.numElements;
        let page = data.pagination.page;

        let totalElements = elements * page;
        let min = totalElements;
        let max = totalElements + ( elements - 1 );

        let finalResults = [], finalObjResults = [];

        orders.Items.forEach((order, index) => {
            finalResults.push(_.omit(order.attrs, ['provider', 'products.items']));
        });

        let sortKey = 'createdAt';

        finalResults.sort((a, b) => {

            if ( !_.isUndefined(a[sortKey]) && !_.isUndefined(b[sortKey]) ){
                return b[sortKey].localeCompare(a[sortKey]);
            }

            return [];

        });

        finalResults.forEach((item, index) => {
            if ( min <= index && index <= max ){
                finalObjResults.push(item);
            }
        });
        
        return {
            Items: finalObjResults,
            Count: finalObjResults.length,
            ScannedCount: orders.Items.length
        };

    } catch (e) {
        return e;
    }
};


const getOrdersByStatus = async (request, h) => {
    try {
        let provider = await getProvider(request.auth.credentials.email);
        let orders = await OrderController.getOrdersFromProviderID(provider.get('provider_id'));

        let searchedItems = [], status = request.params.status;

        status = status.toUpperCase();

        let data = request.payload;
        let elements = data.pagination.numElements;
        let page = data.pagination.page;

        let totalElements = elements * page;
        let min = totalElements;
        let max = totalElements + ( elements - 1 );
        
        let finalResults = [], finalObjResults = [], numOrders = 0;   

        orders.Items.forEach((order, index) => {
            let lastStatus = _.last(order.attrs.tracking).status;
            if ( status === lastStatus || ( status === 'NULL' && lastStatus !== constants.ORDER_STATUS.PENDING_APPROVAL ) ){
                searchedItems.push(_.omit(order.attrs, ['user', 'rider', 'payment', 'products.items']));
            } 
        });

        searchedItems.forEach((item, index) => {
            finalResults.push(item);
        });

        let sortKey = 'createdAt';
        
        finalResults.sort((a, b) => {

            if ( !_.isUndefined(a[sortKey]) && !_.isUndefined(b[sortKey]) ){
                return b[sortKey].localeCompare(a[sortKey]);
            }

            return [];

        });

        finalResults.forEach((item, index) => {
            if ( min <= index && index <= max ){
                finalObjResults.push(item);
            }
        });
        
        return {
            Items: finalObjResults,
            Count: finalObjResults.length,
            ScannedCount: searchedItems.length
        };

    } catch (e) {
        return e;
    }
};

const getOrderDetail = async function (request, h) {
    try {
        let provider = await getProvider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.params.order_id);

        if (_.isNil(order)) {
            throw Boom.notFound('Order not found');
        }

        if (order.get('provider').provider_id !== provider.get('provider_id')) {
            throw Boom.notAcceptable('Order and Provider mismatch');
        }

        return order;
    } catch (e) {
        return e;
    }
};

const validateOrder = async function (request, h) {
    try {
        let provider = await getProvider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.payload.order_id);

        if (_.isNil(order)) {
            throw Boom.notFound('Order not found');
        }

        if (order.get('provider').provider_id !== provider.get('provider_id')) {
            throw Boom.notAcceptable('Order and Provider mismatch');
        }

        let tracking = order.get('tracking');
        if (_.last(tracking).status !== constants.ORDER_STATUS.PENDING_APPROVAL) {
            throw Boom.preconditionFailed('Order status not pending to approval');
        }

        let orderStatus = (request.payload.accepted === true) ?
            constants.ORDER_STATUS.IN_PREPARATION :
            constants.ORDER_STATUS.CANCELLED;

        tracking.push({
            status: orderStatus,
            dateTime: moment().format()
        });

        let orderProducts = order.get('products');
        let orderItems = orderProducts.items;

        request.payload.items.forEach((i) => {
            let index = orderItems.findIndex((itm) => {
                return itm.reference_id === i.reference_id
            });

            if (index === -1) {
                throw Boom.badData('Bad Items data');
            }

            orderItems[index].pvp = i.pvp;
            orderItems[index].comments = i.comments;
            orderItems[index].prescription.status = i.prescriptionStatus;
        });

        orderProducts.items = orderItems;

        // Send notification to user
        let dataToSend = {
            app_id: constants.APP_ID.CLIENT,
            user_id: order.get('user').user_id,
            param: order.get('order_id'),
            notificationType: constants.NOTIFICATION_TYPE.USER,     
            type: constants.NOTIFICATION_TYPE.ORDER,
            title: 'Pedido Validado',
            message: 'Informamos que su pedido ha sido validado'
        };

        await MessageController.messageTo(dataToSend); 

        return await OrderController.updateOrder(order.get('order_id'), {
            tracking: tracking,
            lastStatus: orderStatus,
            products: recalculateOrder(orderProducts)
        })

    } catch (e) {
        return e;
    }
};

const preparateOrder = async (request, h) => {
    try {
        let provider = await getProvider(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.params.order_id);
        
        if (_.isNil(order)) {
            throw Boom.notFound('Order not found');
        }

        if (order.get('provider').provider_id !== provider.get('provider_id')) {
            throw Boom.notAcceptable('Order and Provider mismatch');
        }

        let tracking = order.get('tracking');
        if (_.last(tracking).status !== constants.ORDER_STATUS.IN_PREPARATION) {
            throw Boom.preconditionFailed('Order status not pending to be prepared');
        }

        tracking.push({
            status: constants.ORDER_STATUS.READY_TO_SHIP,
            dateTime: moment().format()
        });

        // Notification for all riders 
        let dataSendToRiders = {
            app_id: constants.APP_ID.RIDER, 
            notificationType: constants.NOTIFICATION_TYPE.ALL,
            title: 'Pedido Preparado',
            message: 'Informamos que hay un nuevo pedido disponible para poder ser assignado'
        };

        await MessageController.messageTo(dataSendToRiders);
        
        return await models.Order.updateAsync({
            order_id: order.get('order_id'),
            tracking: tracking,
            lastStatus: constants.ORDER_STATUS.READY_TO_SHIP
        });

    } catch (e) {
        return e;
    }
};

const getProviders = async (request, h) => {
    try {
        let providers = await models.Provider.scan()
            .where('enable').equals(true)
            .where('stripe_account').notNull()
            .execAsync();
        let cordsObj = {};
        let tempList = [], filtredList = [];
    
        providers.Items.forEach(provider => {
            cordsObj[provider.attrs.name] = provider.attrs.location;
        });
    
        let obj = geolib.orderByDistance(
            {
                latitude: request.payload.location.latitude, 
                longitude: request.payload.location.longitude
            },
            cordsObj
        ).map(item => {
            item.distance = geolib.convertUnit('km', item.distance, 1);
            return item;
        }).forEach(item => {
            if ( item.distance <= request.payload.numKms || request.payload.numKms === 0 ){
                item.distance = String(item.distance + ' km');
                tempList.push(item);
            }
        });

        tempList.forEach(item => {
            providers.Items.forEach(provider => {
                if ( item.key === provider.attrs.name ){
                    provider.attrs.distance = item.distance;
                    filtredList.push(_.omit(provider.attrs, ['password', 'scope', 'enable', 'createdAt']));
                }
            });
        });

        return {
            Items: filtredList,
            Count: filtredList.length,
            ScannedCount: providers.Items.length
        };

    } catch (e) {
        return e;
    }
};

const getProviderByName = async name => {
    return models.Provider.scan()
        .where('name').equals(name)
        .execAsync();
};

const getProvidersForAdmin = async (request, h) => {

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
            expValues[`:${index}`] = val.value;
            expNames[`#${index}`] = val.name;
        });

        let result, tempResults = [], finalObjResults = [];

        let results = await models.Provider.scan().execAsync();

        if ( queryOptions.length > 0 ){
            result = await models.Provider.scan()
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

const getAllProviders = async () => {
    return models.Provider.scan()
        .execAsync();
};

const sendWebPush = async function (request, h) {
    try {
        let provider = await getProvider(request.auth.credentials.email);

        let title = request.payload.title;
        let message = request.payload.message;

        if ( !provider ) {
            throw Boom.conflict('Provider not found');
        }

        await WebPushController.sendWebPush(title, message, provider.get('pushSubscription'));

        return {status: 'ok'};
    } catch (e) {
        return e;
    }
};

const sendToWebPush = async function (email, title, message) {
        try {
            let provider = await getProvider(email);
    
            let title = title;
            let message = message;
    
            if ( !provider ) {
                throw Boom.conflict('Provider not found');
            }
    
            await WebPushController.sendWebPush(title, message, provider.get('pushSubscription'));
    
            return {status: 'ok'};
        } catch (e) {
            return e;
        }
    };

/**
 * PRIVATE METHODS
 */

const getProvider = async function (email) {
    return new Promise((resolve, reject) => {
        models.Provider.get(email, {ConsistentRead: true}, function (err, item) {
            if (err || _.isNil(item)) {
                reject(Boom.notFound('Provider not found'));
            } else {
                resolve(item);
            }
        });
    });
};

// TODO Recalcular
const recalculateOrder = function (products) {
    products.qty = products.items.length;
    let subtotal = 0;
    products.items.forEach((i) => {
        subtotal += i.qty * i.pvp;
    });

    products.subtotal = subtotal;
    // TODO: totalAmount calculation

    return products;
};

module.exports.authenticate = authenticate;
module.exports.register = register;
module.exports.update = update;
module.exports.deleteProvider = deleteProvider;
module.exports.getProviderByID = getProviderByID;
module.exports.getOrdersByStatus = getOrdersByStatus;
module.exports.getOrders = getOrders;
module.exports.getOrderDetail = getOrderDetail;
module.exports.validateOrder = validateOrder;
module.exports.getProviders = getProviders;
module.exports.getProvidersForAdmin = getProvidersForAdmin;
module.exports.getProviderByName = getProviderByName;
module.exports.uploadImage = uploadImage;
module.exports.deleteImages = deleteImages;
module.exports.subscribeToPush = subscribeToPush;
module.exports.sendWebPush = sendWebPush;
module.exports.sendToWebPush = sendToWebPush;
module.exports.preparateOrder = preparateOrder;
module.exports.getAllProviders = getAllProviders;
