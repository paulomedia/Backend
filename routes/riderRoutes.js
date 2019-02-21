var controllers = require('../controllers'),
    Joi = require("joi");

module.exports = [

    // RIDER AUTH
    {
        method: 'POST',
        path: '/rider/authentication',
        config: {
            handler: controllers.RiderController.authenticate,
            tags: ['api', 'Rider'],
            description: 'Rider Auth',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password")
                }
            }
        }
    },

    // RIDER DEVICE
    {
        method: 'POST',
        path: '/rider/device/registerDevice',
        config: {
            handler: controllers.DeviceController.registerRiderDevice,
            tags: ['api', 'Rider'],
            description: 'Register new device',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    device_token: Joi.string().required().min(4).description("device token"),
                    model: Joi.string().description("Device model"),
                    platform: Joi.string().required().description("Platform type (ios - android)")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/rider/device/removeDevice',
        config: {
            handler: controllers.DeviceController.removeRiderDevice,
            tags: ['api', 'Rider'],
            description: 'Remove the device UUID for the given app',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    device_token: Joi.string().required().min(4).description("device token")
                }
            }
        }
    },

    // FORGOT PASSWORD
    {
        method: 'POST',
        path: '/rider/forgotPassword',
        config: {
            handler: controllers.RiderController.forgotPassword,
            tags: ['api', 'Rider'],
            description: 'Rider forgot password',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Rider Email")
                }
            }
        }
    },

    // CHANGE PASSWORD
    {
        method: 'GET',
        path: '/rider/changePassword/{passwordCode}',
        config: {
            handler: controllers.RiderController.changePassword,
            tags: ['api', 'Rider'],
            description: 'Rider change password',
            validate: {
                params: {
                    passwordCode: Joi.string().required().description("Password code")
                }
            }
        }
    },

    // RESET PASSWORD
    {
        method: 'POST',
        path: '/rider/resetPassword',
        config: {
            handler: controllers.RiderController.resetPassword,
            tags: ['api', 'Rider'],
            description: 'Rider reset password',
            validate: {
                payload: {
                    password: Joi.string().description("New Password"),
                    passwordCode: Joi.string().description("Confirmation code password")
                }
            }
        }
    },

    // RIDER ORDERS
    {
        method: 'POST',
        path: '/rider/orders',
        config: {
            handler: controllers.RiderController.getOrders,
            tags: ['api', 'Rider'],
            description: 'Get orders from Rider',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // RIDER UNASSIGNED ORDERS
    {
        method: 'POST',
        path: '/rider/orders/unassigned',
        config: {
            handler: controllers.RiderController.getUnassignedOrders,
            tags: ['api', 'Rider'],
            description: 'Get unassigned orders with status Accepted',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // RIDER ORDER DETAIL
    {
        method: 'GET',
        path: '/rider/order/{order_id}',
        config: {
            handler: controllers.RiderController.getOrderDetail,
            tags: ['api', 'Rider'],
            description: 'Get order detail',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                params: {
                    order_id: Joi.string().required().description("Order ID"),
                }
            }
        }
    },

    // ASSIGNED ORDER
    {
        method: 'POST',
        path: '/rider/order/assign',
        config: {
            handler: controllers.RiderController.assignOrder,
            tags: ['api', 'Rider'],
            description: 'Assign order to rider',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description("Order ID"),
                }
            }
        }
    },

    // COLLECT ORDER
    {
        method: 'POST',
        path: '/rider/order/collect',
        config: {
            handler: controllers.RiderController.collectOrder,
            tags: ['api', 'Rider'],
            description: 'Collect order to rider',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description("Order ID"),
                }
            }
        }
    },

    // DELIVERY ORDER
    {
        method: 'POST',
        path: '/rider/order/delivery',
        config: {
            handler: controllers.RiderController.deliveryOrder,
            tags: ['api', 'Rider'],
            description: 'Delivery order to rider',
            auth: {
                strategy: 'jwt',
                scope: ['rider', 'admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description("Order ID"),
                }
            }
        }
    }

];
