var controllers = require('../controllers'),
    Joi         = require("joi");

module.exports = [

    // PROVIDER AUTH
    {
        method: 'POST',
        path: '/provider/authentication',
        config: {
            handler: controllers.ProviderController.authenticate,
            tags: ['api', 'Provider'],
            description: 'Provider Auth',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password")
                }
            }
        }
    },

    // WEB PUSH
    {
        method: 'POST',
        path: '/provider/subscribeToPush',
        config: {
            handler: controllers.ProviderController.subscribeToPush,
            tags: ['api', 'Provider'],
            description: 'Subscribe to receive Web Push',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
            },
            validate: {
                payload: {
                    subscription: Joi.object()
                }
            }
        }
    },

    // PROVIDER ORDERS
    {
        method: 'POST',
        path: '/provider/orders',
        config: {
            handler: controllers.ProviderController.getOrders,
            tags: ['api', 'Provider'],
            description: 'Get provider orders',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
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

    // PROVIDER ORDERS BY STATUS
    {
        method: 'POST',
        path: '/provider/orders/{status}',
        config: {
            handler: controllers.ProviderController.getOrdersByStatus,
            tags: ['api', 'Provider'],
            description: 'Get providers orders by status',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
            },
            validate: {
                params: {
                    status: Joi.any().description("Status of order")
                },
                payload: {
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // PROVIDER WEB PUSH
    {
        method: 'POST',
        path: '/provider/sendWebPush',
        config: {
            handler: controllers.ProviderController.sendWebPush,
            tags: ['api', 'Provider'],
            description: 'Send web push to provider',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
            },
            validate: {
                payload: {
                    title: Joi.string().description("Title"),
                    message: Joi.string().description("Message")
                }
            }
        }
    },

    // PROVIDER ORDER DETAIL
    {
        method: 'GET',
        path: '/provider/order/{order_id}',
        config: {
            handler: controllers.ProviderController.getOrderDetail,
            tags: ['api', 'Provider'],
            description: 'Get provider detail',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
            },
            validate: {
                params: {
                    order_id: Joi.string().required().description("Order ID"),
                }
            }
        }
    },

    // PROVIDER ORDER VALIDATE
    {
        method: 'POST',
        path: '/provider/order/validate',
        config: {
            handler: controllers.ProviderController.validateOrder,
            tags: ['api', 'Provider'],
            description: 'Validate order',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().required().description("Order ID"),
                    items: Joi.array().items(
                        Joi.object().keys({
                            reference_id: Joi.string().guid(),
                            prescriptionStatus: Joi.string(),
                            pvp: Joi.number().precision(2),
                            comments: Joi.string()
                        })
                    ),
                    accepted: Joi.boolean()
                }
            }
        }
    },

    // PROVIDER ORDER PREPARATE
    {
        method: 'PUT',
        path: '/provider/order/prepared/{order_id}',
        config: {
            handler: controllers.ProviderController.preparateOrder,
            tags: ['api', 'Provider'],
            description: 'Order Preparate',
            auth: {
                strategy: 'jwt',
                scope: ['provider', 'admin']
            },
            validate: {
                params: {
                    order_id: Joi.string().required().description("Order ID"),
                }
            }
        }
    }


];
