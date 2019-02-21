module.exports = {};
const models             = require('../models'),
      ProductController  = require('./ProductController'),
      MailerController   = require('./MailerController'),
      PaymentController  = require('./PaymentController'),
      ProviderController = require('./ProviderController'),
      OrderController    = require('./OrderController'),
      WebPushController  = require('./WebPushController'),
      AlertController    = require('./AlertController'),
      Utils              = require('./utils'),
      constants          = require('./constants'),
      Boom               = require('boom'),
      Bcrypt             = require('bcrypt'),
      jwt                = require('jsonwebtoken'),
      config             = require('config'),
      _                  = require('lodash'),
      AWS                = require('aws-sdk'),
      uuidv4             = require('uuid/v4'),
      moment             = require('moment'),
      geolib             = require('geolib');

AWS.config.update(config.aws.credentials);

const register = async (request, h) => {

    try {
        let email = request.payload.email;
        const user = await models.User.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if (user !== null) {
            throw Boom.conflict('email already exists');
        }

        let passwordHash = Utils.hashPassword(request.payload.password);
        
        let newUserData = {
            email: email.toLowerCase(),
            password: passwordHash,
            scope: 'user',
            enable: false,
            confirmationCode: Utils.randomString(),
            name: request.payload.name,
            phoneNumber: request.payload.phoneNumber,
            address: request.payload.address,
            address2: request.payload.address2,
            location: {
                latitude: request.payload.location.latitude,
                longitude: request.payload.location.longitude
            }
        };

        let newUser = await models.User.createAsync(newUserData);

        let provider = await assignProviderByClosest(newUser);

        await MailerController.sendMail({
            email: request.payload.email,
            subject: 'TelePharma - Confirmación de cuenta',
            templateFile: 'confirmAccount.hbs',
            templateData: {
                name: request.payload.name,
                urlConfirm: config.externalUrl + '/user/confirmation/' + newUserData.confirmationCode,
                urlLogo: config.aws.cloudfront.mail + '/Pharmacy.jpg'
            }
        });

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
        let user;

        if ( !request.params.email ){
            user = await getUser(request.auth.credentials.email);
        } else {
            user = await getUser(request.params.email);
        }

        if ( !user ) {
            throw Boom.conflict('User not found');
        }

        let updateData = {
            email: user.get('email')
        };

        if ( request.payload.password !== '' ){
            let passwordHash = Utils.hashPassword(request.payload.password);
            Object.assign(updateData, { password: passwordHash });
        }

        if ( request.payload.name !== '' ){
            Object.assign(updateData, { name: request.payload.name });
        }

        if ( request.payload.phoneNumber ){
            Object.assign(updateData, { phoneNumber: request.payload.phoneNumber });
        }

        if ( request.payload.address !== '' ){
            Object.assign(updateData, { address: request.payload.address });
        }

        if ( request.payload.address2 !== '' ){
            Object.assign(updateData, { address2: request.payload.address2 });
        }

        if ( !_.isNil(request.payload.location.latitude) && !_.isNil(request.payload.location.longitude) ){
            Object.assign(updateData, {
                location: {
                    latitude: request.payload.location.latitude,
                    longitude: request.payload.location.longitude
                }
            });
        }

        await models.User.updateAsync(updateData);

        return {result: 'ok'}

    } catch (e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }

};

const deleteUser = async (request, h) => {
    try {
        const user = await models.User.getAsync(request.params.email, {ConsistentRead: true});

        if ( !user ) {
            throw Boom.notFound("User not found");
        }

        await models.User.destroy(user.get('email'));

        return {result: 'ok'};

    } catch (e) {
        if ( e.isBoom ) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
};

const confirmAccount = async function (request, h) {
    try {
        let users = await models.User.scan()
            .where('confirmationCode')
            .equals(request.params.confirmationCode)
            .execAsync();
        if (users.Count === 0) {
            throw Boom.notFound("User confirmation code not found");
        }

        // Create user cart
        await models.User.updateAsync({
            email: users.Items[0].get('email'),
            enable: true,
            confirmationCode: 'OK',
            cart: {
                qty: 0,
                items: [],
                subtotal: 0
            }
        });

        return h.redirect(config.aws.cloudfront.mail + '/confirmationOK.html');
    } catch (e) {
        return h.redirect(config.aws.cloudfront.mail + '/confirmationKO.html');
    }
};

const forgotPassword = async (request, h) => {

    try {
        let email = request.payload.email;
        const user = await models.User.getAsync(email.toLowerCase(), {ConsistentRead: true});

        if ( !user ) {
            throw Boom.conflict('User not found');
        }

        let updateData = {
            email: user.get('email'),
            passwordCode: Utils.randomString()
        };

        let updateUser = await models.User.updateAsync(updateData);

        await MailerController.sendMail({
            email: user.get('email'),
            subject: 'TelePharma - Reset password',
            templateFile: 'forgotPassword.hbs',
            templateData: {
                name: user.get('name'),
                urlConfirm: config.externalUrl + '/user/changePassword/' + updateData.passwordCode,
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
    return h.redirect(config.aws.cloudfront.mail + '/user/changePassword.html?token=' + request.params.passwordCode);
}; 

const getUserByPasswordCode = async passwordCode => {
    return await models.User.scan()
        .where('passwordCode').equals(passwordCode)
        .execAsync();
};

const resetPassword = async (request, h) => {
    try {
        let user = await getUserByPasswordCode(request.payload.passwordCode);
        
        if ( !user ) {
            return Boomn.notFound('User not found');
        }

        if ( _.isUndefined(user.Items[0]) ){
            return Boom.preconditionFailed('No user found for this code');
        }

        user = user.Items[0].attrs;

        if ( request.payload.passwordCode === user.passwordCode ){

            let passwordHash = Utils.hashPassword(request.payload.password);
            let updateData = {
                email: user.email,
                password: passwordHash,
                passwordCode: ' '
            };

            await models.User.updateAsync(updateData);

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

/**
 * Validate user credentials
 *
 * @param request
 * @param h
 * @returns {Promise<{email: *, scope: *, token: *}>}
 */
const authenticate = async function (request, h) {

    try {
        let email = request.payload.email;
        let user = await models.User.query(email.toLowerCase()).filter('enable').equals(true).execAsync();

        if (_.isNil(user) || user.Count === 0) {
            throw Boom.notFound('');
        } else {
            user = user.Items[0];
            // Check password
            const isValid = await Bcrypt.compare(request.payload.password, user.get('password'));

            // TODO Check confirmation code
            if ( user.get('confirmationCode') !== 'OK' ){
                throw Boom.notFound('You have to activate your account to make loggin');
            }

            if (isValid) {
                let userToken = jwt.sign({
                    user_id: user.get('user_id'),
                    email: user.get('email'),
                    scope: user.get('scope')
                }, config.jwtSecretKey, {algorithm: 'HS256', expiresIn: config.jwtExpiresIn});

                // Uncomment to save cookie instead of being custom managed by client
                //request.cookieAuth.set({token: userToken});

                return {
                    email: user.get('email'),
                    scope: user.get('scope'),
                    token: userToken
                };

            } else {
                console.error('wrong credentials');
                throw Boom.unauthorized('user credentials incorrect or session expired');
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

const checkUserExists = async function (email) {
    return new Promise((resolve) => {
        models.User.get(email, {ConsistentRead: true}, function (err, item) {
            if (err || _.isNull(item)) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

const assignProviderByClosest = async user => {
    try {
        let request = {
            payload: {
                location: user.get('location')
            }
        };

        let provider = await getClosestProvider(request);

        return await models.User.updateAsync({
            email: user.get('email'),
            provider: {
                provider_id: provider.provider_id,
                name: provider.name,
                address: provider.address,
                address2: provider.address2,
                businessCalendar: provider.businessCalendar
            }
        });

    } catch (e) {
        return e;
    }
};

const assignProvider = async function (request, h) {
    try {
        let user = await getUser(request.auth.credentials.email);
        let provider = await ProviderController.getProviderByID(request.payload.provider_id);

        if ( _.isNil(provider.get('stripe_account')) ){
            throw Boom.preconditionFailed('Provider dont have a Stripe Account asigned');
        }

        return await models.User.updateAsync({
            email: user.get('email'),
            provider: {
                provider_id: provider.get('provider_id'),
                name: provider.get('name'),
                address: provider.get('address'),
                address2: provider.get('address2'),
                businessCalendar: provider.get('businessCalendar')
            }
        });

    } catch (e) {
        return e;
    }
};

const getClosestProvider = async (request, h) => {
    try {
        let providers = await models.Provider.scan()
            .where('enable').equals(true)
            .where('stripe_account').notNull()
            .execAsync();

        if ( providers.Items.length === 0 ){
            throw Boom.notFound('There is no providers avaliable'); 
        }

        let cordsObj = {};
    
        providers.Items.forEach(provider => {
            cordsObj[provider.attrs.name] = provider.attrs.location;
        });
    
        let obj = geolib.orderByDistance(
            {
                latitude: request.payload.location.latitude, 
                longitude: request.payload.location.longitude
            },
            cordsObj
        );

        let nameToSearch = obj[0].key;
        let provider =  await ProviderController.getProviderByName(nameToSearch);
    
        return _.omit(provider.Items[0].attrs, ['password', 'scope', 'enable', 'createdAt']);

    } catch (e) {
        return e;
    }
};

const isAnonymous = id => {
    return constants.PRODUCT.ANONYMOUS_ID === id;
}

const addProduct = async function (request, h) {
    try {
        let user = await getUser(request.auth.credentials.email);

        if (_.isNil(user)) { 
            return Boom.notFound('User not found'); 
        }

        let product = await ProductController.getProduct(request.payload.product_id);

        if(_.isNil(product)) {
            return Boom.notFound('Product not found')
        };

        let cart = user.get('cart');

        if( _.isNil(cart) ) {
            return Boom.preconditionFailed('User dont have cart associated');
        };

        // Search if product already in cart
        let index = cart.items.findIndex((i) => {
            return i.product_id === request.payload.product_id;
        });

        if (index !== -1 && !isAnonymous(request.payload.product_id) ) {
            cart.items[index].qty += request.payload.qty;
        } else {
            let item = {
                reference_id: uuidv4(),
                product_id: request.payload.product_id,
                name: product.get('name'),
                qty: isAnonymous(request.payload.product_id) ? 1 : request.payload.qty,
                pvp: product.get('pvp'),
                pvpVat: product.get('pvpVat'),
                prescriptionRequired: product.get('prescriptionRequired'),
                prescription: {} // add empty prescription data
            };
            cart.items.push(item);
            cart.qty++;
        }

        cart.subtotal += Utils.roundDecimal(request.payload.qty * product.get('pvpVat'));

        user = await models.User.updateAsync({email: user.get('email'), cart: cart});

        return user.get('cart');
    } catch (e) {
        return e;
    }
};

const removeProduct = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);
        let cart = user.get('cart');
        let items = [];

        cart.qty = 0;
        cart.subtotal = 0;

        cart.items.forEach(item => {
            if ( item.reference_id === request.params.reference_id ){
                item.qty = item.qty - request.payload.qty;
            }

            if ( item.qty !== 0 ){
                items.push(item);
                cart.qty++;
            }
            cart.subtotal += item.pvp * item.qty;
        });
        cart.items = items;

        user = await models.User.updateAsync({
            email: user.get('email'),
            cart: cart
        });

        return user.get('cart');

    } catch (e) {
        return e;
    }
};

const deleteImage = async (user, reference, image) => {
    let cart = user.get('cart');
    let images = [];

    if ( _.isString(image) ){
        images.push(image);
    }
    
    if ( images && images.length > 0 ){

        const s3 = new AWS.S3();

        let imagesToDelete = [], imgsDeleted = [];

        images = images.map(img => {
            return img.replace(config.aws.cloudfront.prescriptions + '/','');
        });

        images.forEach(img => {
            let key = {Key: img};
            imagesToDelete.push(key);
            imgsDeleted.push(img);
        });

        let objectToDelete = {
            Objects: imagesToDelete
        };

        let index = cart.items.findIndex(i => {
            return i.reference_id === reference;
        });
    
        if (index === -1) {
            return Boom.notFound("Product reference not found on user cart")
        }

        return s3.deleteObjects({
            Bucket: config.aws.s3.prescriptions,
            Delete: objectToDelete
        }).promise()
            .then(() => {
                return 'ok';
            })
            .then(() => {
                return {
                    imageDeleted: imgsDeleted
                }
            })
            .catch(() => {
                return Boom.badImplementation("Error deleting file");
        });

    } else {
        return Boom.expectationFailed('There are no image to delete');
    }

};

const uploadPrescription = async function (request, h) {

    const s3 = new AWS.S3({
        params: {Bucket: config.aws.s3.prescriptions}
    });

    let user = await getUser(request.auth.credentials.email);
    let cart = user.get('cart');
    let imageToRemove;

    let index = cart.items.findIndex(i => {
        return i.reference_id === request.payload.reference_id;
    });

    if (index === -1) {
        return Boom.notFound("Product reference not found on user cart")
    }

    // if already exist an prescription to this reference_id item we remove the last
    if ( index !== -1 ){
        imageToRemove = {
            payload: {
                image: cart.items[index].prescription.prescription_id
            }
        };
    }

    let data = request.payload;

    if (data.file) {

        let base64 = data.file;

        const base64Data = new Buffer(base64.replace(/^data:image\/\w+;base64,/, ""), constants.CONTENT_ENCODING.BASE64);

        let extension = base64.split(';')[0].split('/')[1];

        if ( !extension || extension === '' || extension === 'jpeg' ){
            extension = 'jpg';
        }

        let userPrefix = request.auth.credentials.user_id;
        let name = userPrefix + '/' + uuidv4() + '.' + extension;
        let contentType = Utils.getFileContentType(extension);

        return s3.upload({
            Key: name, 
            Body: base64Data,
            ContentEncoding: constants.CONTENT_ENCODING.BASE64,
            ContentType: contentType
        })
            .promise()
            .then(() => {

                if ( index !== -1 ){
                    deleteImage(user, request.payload.reference_id, imageToRemove.payload.image);
                }
                
                cart.items[index].prescription.prescription_id = config.aws.cloudfront.prescriptions + '/' + name;
                cart.items[index].prescription.status = constants.PRESCRIPTION_STATUS.PENDING_VALIDATION;
                cart.items[index].prescription.observation = request.payload.observation;

                // add the OCR data in  prescription object if exist
                cart.items[index].prescription.ocrData = request.payload.ocrData ? request.payload.ocrData : {};

                return models.User.updateAsync({email: request.auth.credentials.email, cart: cart});
            })
            .then(() => {
                return {
                    prescription_id: config.aws.cloudfront.prescriptions + '/' + name
                }
            })
            .catch((e) => {
                return Boom.badImplementation("Error uploading file");
            });
            
            
    } else {
        console.error('Cannot copy the data file to the server');
        return Boom.expectationFailed('Cannot copy the data file to the server');
    }

};

const deletePrescription = async (request, h) => {

    let user = await getUser(request.auth.credentials.email);
    let cart = user.get('cart');
    let images = [];

    if ( _.isString(request.payload.image) ){
        images.push(request.payload.image);
    }
    
    if ( images && images.length > 0 ){

        const s3 = new AWS.S3();

        let imagesToDelete = [], imgsDeleted = [];

        images = images.map(img => {
            return img.replace(config.aws.cloudfront.prescriptions + '/','');
        });

        images.forEach(img => {
            let key = {Key: img};
            imagesToDelete.push(key);
            imgsDeleted.push(img);
        });

        let objectToDelete = {
            Objects: imagesToDelete
        };

        let index = cart.items.findIndex(i => {
            return i.reference_id === request.payload.reference_id;
        });
    
        if (index === -1) {
            return Boom.notFound("Product reference not found on user cart")
        }

        return s3.deleteObjects({
            Bucket: config.aws.s3.prescriptions,
            Delete: objectToDelete
        }).promise()
            .then(() => {
                cart.items[index].prescription = {};
                return models.User.updateAsync({email: user.get('email'), cart: cart});
            })
            .then(() => {
                return {
                    imageDeleted: imgsDeleted
                }
            })
            .catch(() => {
                return Boom.badImplementation("Error deleting file");
        });

    } else {
        return Boom.expectationFailed('There are no image to delete');
    }

};

const getPrescription = async function (request, h) {

    let user = await getUser(request.auth.credentials.email);
    let cart = user.get('cart');

    let index = cart.items.findIndex((i) => {
        return i.reference_id === request.params.reference_id;
    });

    if (index === -1) {
        return Boom.notFound("Product reference not found on user cart")
    }

    return {
        prescription_url: config.aws.cloudfront.prescriptions + '/'
            + cart.items[index].prescription.prescription_id
    }
};

const processCart = async function (request, h) {

    try {
        let user = await getUser(request.auth.credentials.email);
        let cart = user.get("cart");

        if (_.isNil(user.get('provider'))) {
            throw Boom.preconditionFailed('Provider not assigned to user');
        }

        await checkCartReadyForValidation(cart);

        // Create new order
        let delivery = {
            name: (!_.isNil(request.payload.name)) ? request.payload.name : user.get('name'),
            address: (!_.isNil(request.payload.address)) ? request.payload.address : user.get('address'),
            address2: (!_.isNil(request.payload.address2)) ? request.payload.address2 : user.get('address2'),
            phoneNumber: (!_.isNil(request.payload.phoneNumber)) ? request.payload.phoneNumber : user.get('phoneNumber'),
            desiredTime: (!_.isNil(request.payload.desiredDeliveryTime)) ? request.payload.desiredDeliveryTime : 'NA',
            provider_id: (!_.isNil(request.payload.provider_id)) ? request.payload.provider_id : user.get('provider').provider_id
        };

        let order = await OrderController.createOrder(user, delivery);
        let provider = await ProviderController.getProviderByID(delivery.provider_id);

        if (_.isNil(provider.get('stripe_account'))) {
            throw Boom.preconditionFailed('Provider without account');
        }

        // send email to provider
        await MailerController.sendMail({
            email: provider.get('email'),
            subject: 'TelePharma - Ha sido creado un nuevo pedido',
            templateFile: 'createdOrder.hbs',
            templateData: {
                nameProvider: provider.get('name'),
                name: delivery.name,
                desiredTime: delivery.desiredTime,
                address: delivery.address,
                address2: delivery.address2,
                urlLogo: config.aws.cloudfront.mail + '/Pharmacy.jpg'
            }
        });

        // Push notification provider
        await ProviderController.sendToWebPush(provider.get('email'), 'TelePharma - Pedido creado ', 'Ha sido creado un nuevo pedido');

        // Reset user Cart
        user = await emptyUserCart(user.get('email'));

        user = omitUserSensitiveData(user);

        return {
            user: user,
            order_code: order.get('order_code'),
            order_id: order.get('order_id')
        };

    } catch (e) {
        return e;
    }
};

const getOrders = async function (request, h) {
    try {
        let user = await getUser(request.auth.credentials.email);
        let orders = await OrderController.getOrdersFromUserID(user.get('user_id'));
        orders.Items = orders.Items.map((o) => {
            return _.omit(o.attrs, ['user', 'rider', 'payment', 'products.items']);
        });

        return orders;
    } catch (e) {
        return e;
    }
};

const finishOrder = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.payload.order_id);
        let tracking = order.get('tracking');
        let actualStatus = _.last(tracking).status;

        if ( actualStatus !== constants.ORDER_STATUS.DELIVERED ){
            throw Boom.notAcceptable('Status not allowed to be changed');
        }

        let dataToUpdate = {
            order_id: order.get('order_id'),
            isFinishedUser: true
        };

        if ( actualStatus === constants.ORDER_STATUS.DELIVERED && order.get('isFinishedRider') ){             
            tracking.push({
                status: constants.ORDER_STATUS.FINISHED,
                dateTime: moment().format()
            });

            Object.assign(dataToUpdate, { tracking: tracking, lastStatus: constants.ORDER_STATUS.FINISHED });
        }

        return await models.Order.updateAsync(dataToUpdate);

    } catch (e) {
        return e;
    }


};

const getProviders = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);
        let providers = await ProviderController.getProviders();

        providers.Items = providers.Items.map(o => {
            return o;
        });

        return providers;
    } catch (e) {
        return e;
    }
};

const getOrderDetail = async function (request, h) {
    try {
        let user = await getUser(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.params.order_id);

        if (_.isNil(order)) {
            throw Boom.notFound('Order not found');
        }

        if (order.get('user').user_id !== user.get('user_id')) {
            throw Boom.notAcceptable('Order and User mismatch');
        }

        return order;
    } catch (e) {
        return e;
    }
};

const addCard = async function (request, h) {
    try {
        let user = await getUser(request.auth.credentials.email);

        if (_.isNil(user.get('customerID'))) {
            user = await assignStripeCustomerToUser(user.get('email'));
        }

        let cardID = await PaymentController.addCartToCustomer(user.get('customerID'), request.payload.cardToken);

        user = await models.User.updateAsync({email: user.get('email'), cardID: cardID});

        return omitUserSensitiveData(user);
    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.badData('Error processing card');
        }
    }
};


const removeCard = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);

        if (_.isNil(user.get('customerID'))) {
            return { result: 'You do not have any card to remove' };
        }

        let cardID = await PaymentController.removeCardToCustomer(user.get('customerID'), user.get('cardID') );

        user = await models.User.updateAsync({email: user.get('email'), cardID: ' ' });

        return omitUserSensitiveData(user);

    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.badData('Error processing card');
        }
    }
};

const payment = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);
        let order = await OrderController.getOrder(request.payload.order_id);
        let provider = await ProviderController.getProviderByID(order.get('provider').provider_id);

        // check if exist order
        if ( _.isNil(order) ){
            return Boom.notFound('Order not found');
        }

        // Check if already this order have been payed
        if ( order.get('payment').card ){
            return Boom.preconditionFailed('Order already been payment');
        }

        // Check if the userID match with the user id from order
        if ( user.get('user_id') !== order.get('user').user_id ){
            return Boom.notAcceptable('Order and User mismatch');   
        }

        // Check if the user have a customerID and cardID
        if ( _.isNil(user.get('customerID')) && _.isNil(user.get('cardID')) ){
            return Boom.preconditionFailed('No customerID or cardID found');
        }

        if (_.isNil(provider.get('stripe_account'))) {
            throw Boom.preconditionFailed('Provider without account');
        }

        let tracking = order.get('tracking');
        let actualStatus = _.last(tracking).status;

        if ( actualStatus === constants.ORDER_STATUS.PENDING_APPROVAL && actualStatus === constants.ORDER_STATUS.IN_PREPARATION ){
            throw Boom.preconditionFailed('Order status cannot be PENDING_APPROVAL or IN_PREPARATION');
        }

        let charge = await PaymentController.createNewCharge(order.get('products').subtotal, user.get('customerID'), user.get('cardID'), user.get('email'), provider.get('stripe_account'));
        let payment;

        if ( charge && charge === 'succeeded' ){

            // get the last four digits to update the payment info in order
            let lastFour = await PaymentController.getInfoFromCustomer(user.get('customerID'), user.get('cardID'));

            payment = {
                card: '****' + lastFour,
                dateTime: moment().format()
            };

            await models.Order.updateAsync({
                order_id: request.payload.order_id, 
                isPaid: true,
                payment: payment
            });
            
            return {
                result: 'ok'
            };
        }
        
        return { 
            result: 'Failed'
        };
        
    } catch (e) {
        return e;
    }
};

/**
 * PRIVATE METHODS
 */

const getUser = async function (email) {
    return new Promise((resolve, reject) => {
        models.User.get(email, {ConsistentRead: true}, function (err, item) {
            if (err || _.isNil(item)) {
                reject(Boom.notFound('User not found'));
            } else {
                resolve(item);
            }
        });

    });
};

const getUsers = async (request, h) => {

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

        let results = await models.User.scan().execAsync();

        if ( queryOptions.length > 0 ){
            result = await models.User.scan()
                .filterExpression(filterExp)
                .expressionAttributeValues(expValues)
                .expressionAttributeNames(expNames)
                .execAsync(); 
        } else {
            result = results;
        }

        result.Items.forEach((item, index) => {
            tempResults.push(_.omit(item.attrs, ['provider.businessCalendar']));
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

const omitUserSensitiveData = function (user) {
    return _.omit(user.attrs, ['password', 'scope', 'enable', 'cardID']);
};

const emptyUserCart = function (email) {
    return models.User.updateAsync({
        email: email,
        cart: {
            qty: 0,
            items: [],
            subtotal: 0
        }
    });
};

const checkCartReadyForValidation = function (cart) {
    return new Promise((resolve, reject) => {

        if (cart.items.length === 0) {
            reject(Boom.preconditionFailed('Empty cart'));
        }

        let index = cart.items.findIndex((i) => {
            return i.prescriptionRequired === true && _.isNil(i.prescription.prescription_id);
        });

        if (index !== -1) { // Pending prescriptions
            reject(Boom.preconditionFailed('Prescriptions pending to upload'));
        } else {
            resolve();
        }
    });

};

const assignStripeCustomerToUser = async function (email) {
    let customerID = await PaymentController.createNewCustomer(email);
    return models.User.updateAsync({email: email, customerID: customerID});
};

const getAlerts = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);

        if ( !user ) {
            throw Boom.conflict('User not found');
        }

        return await AlertController.getAlertsByUserID(user.get('user_id'));
    
    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.badData('Error geting the alarms');
        }
    }
};

const desactivateAlert = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email);

        if ( !user ) {
            return Boom.conflict('User not found');
        }

        let alert = await AlertController.getAlert(request.payload.alert_id);

        if ( !alert ) {
            return Boom.conflict('Alert not found');
        }

        if ( user.get('user_id') !== alert.get('user_id') ){
            return Boom.notAcceptable('Alert and User mismatch');
        }

        let updateAlert = await models.Alert.updateAsync( { alert_id: alert.get('alert_id'), status: constants.ALARM_STATUS.DISABLED } );

        return { result: 'ok' };

    } catch (e) {
        if (e.isBoom === true) {
            throw e;
        } else {
            throw Boom.badData('Error desactivating the alert');
        }
    }
};

module.exports.register = register;
module.exports.update = update;
module.exports.deleteUser = deleteUser;
module.exports.confirmAccount = confirmAccount;
module.exports.forgotPassword = forgotPassword;
module.exports.changePassword = changePassword;
module.exports.resetPassword = resetPassword;
module.exports.authenticate = authenticate;
module.exports.checkUserExists = checkUserExists;
module.exports.getUserInfo = async (request, h) => {
    try {
        let user = await getUser(request.auth.credentials.email), lastFour;

        if ( user.get('customerID') && user.get('cardID') ){
            lastFour = await PaymentController.getInfoFromCustomer(user.get('customerID'), user.get('cardID'));
        }

        user = omitUserSensitiveData(user);

        if ( _.isString(lastFour) ){
            user = Object.assign(user, { lastFour: lastFour });
        }

        return user;
    } catch (e) {
        return e;
    }
};
module.exports.assignProvider = assignProvider;
module.exports.addProduct = addProduct;
module.exports.removeProduct = removeProduct;
module.exports.uploadPrescription = uploadPrescription;
module.exports.deletePrescription = deletePrescription;
module.exports.getPrescription = getPrescription;
module.exports.processCart = processCart;
module.exports.getOrders = getOrders;
module.exports.getOrderDetail = getOrderDetail;
module.exports.getProviders = getProviders;
module.exports.getUsers = getUsers;
module.exports.addCard = addCard;
module.exports.removeCard = removeCard;
module.exports.finishOrder = finishOrder;
module.exports.payment = payment;
module.exports.getClosestProvider = getClosestProvider;
module.exports.getAlerts = getAlerts;
module.exports.desactivateAlert = desactivateAlert;