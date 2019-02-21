var controllers = require('../controllers'),
    Joi = require("joi");

module.exports = [


    // USER REGISTER
    {
        method: 'POST',
        path: '/user/register',
        config: {
            handler: controllers.UserController.register,
            tags: ['api', 'User'],
            description: 'User Register',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password"),
                    name: Joi.string().required().description("Complete name"),
                    phoneNumber: Joi.number().required().min(9).description("Phone number"),
                    address: Joi.string().required().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number().required().description("Latitude"),
                        longitude: Joi.number().required().description("Longitude")
                    })
                }
            }
        }
    },

    // USER UPDATE
    {
        method: 'PUT',
        path: '/user/update',
        config: {
            handler: controllers.UserController.update,
            tags: ['api', 'User'],
            description: 'User Update',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    password: Joi.string().description("Password"),
                    name: Joi.string().description("Complete name"),
                    phoneNumber: Joi.number().min(9).description("Phone number"),
                    address: Joi.string().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number().description("Latitude"),
                        longitude: Joi.number().description("Longitude")
                    })
                }
            }
        }
    },

    {
        method: 'GET',
        path: '/user/confirmation/{confirmationCode}',
        config: {
            handler: controllers.UserController.confirmAccount,
            tags: ['api', 'User'],
            description: 'User Confirmation Code',
            validate: {
                params: {
                    confirmationCode: Joi.string().required().min(3).description("confirmation code")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/user/authentication',
        config: {
            handler: controllers.UserController.authenticate,
            tags: ['api', 'User'],
            description: 'User Auth',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password")
                }
            }
        }
    },

    // FORGOT PASSWORD
    {
        method: 'POST',
        path: '/user/forgotPassword',
        config: {
            handler: controllers.UserController.forgotPassword,
            tags: ['api', 'User'],
            description: 'User forgot password',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("User Email")
                }
            }
        }
    },

    // CHANGE PASSWORD
    {
        method: 'GET',
        path: '/user/changePassword/{passwordCode}',
        config: {
            handler: controllers.UserController.changePassword,
            tags: ['api', 'User'],
            description: 'User change password',
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
        path: '/user/resetPassword',
        config: {
            handler: controllers.UserController.resetPassword,
            tags: ['api', 'User'],
            description: 'User reset password',
            validate: {
                payload: {
                    password: Joi.string().description("New Password"),
                    passwordCode: Joi.string().description("Confirmation code password")
                }
            }
        }
    },

    // INFO
    {
        method: 'GET',
        path: '/user/info',
        config: {
            handler: controllers.UserController.getUserInfo,
            tags: ['api', 'User'],
            description: 'Get user data',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            }
        }
    },


    // USER DEVICE
    {
        method: 'POST',
        path: '/user/device/registerDevice',
        config: {
            handler: controllers.DeviceController.registerUserDevice,
            tags: ['api', 'User'],
            description: 'Register new device',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
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
        path: '/user/device/removeDevice',
        config: {
            handler: controllers.DeviceController.removeUserDevice,
            tags: ['api', 'User'],
            description: 'Remove the device UUID for the given app',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    device_token: Joi.string().required().min(4).description("device token")
                }
            }
        }
    },

    // ASSIGNED PROVIDER
    {
        method: 'POST',
        path: '/user/provider/assign',
        config: {
            handler: controllers.UserController.assignProvider,
            tags: ['api', 'User'],
            description: 'Assign default provider to user',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    provider_id: Joi.string().guid().required().description("Provider ID")
                }
            }
        }
    },

    // CLOSEST PROVIDER
    {
        method: 'POST',
        path: '/user/provider/closest',
        config: {
            handler: controllers.UserController.getClosestProvider,
            tags: ['api', 'User'],
            description: 'Get closest provider',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    location: Joi.object().keys({
                        latitude: Joi.number().required().description("Latitude"),
                        longitude: Joi.number().required().description("Longitude")
                    })
                }
            }
        }
    },

    // USER CART
    {
        method: 'POST',
        path: '/user/cart/addProduct',
        config: {
            handler: controllers.UserController.addProduct,
            tags: ['api', 'User'],
            description: 'Add product to the user cart',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    product_id: Joi.string().guid().required().description("Product ID"),
                    qty: Joi.number().integer().positive().min(1).description("Quantity")
                }
            }
        }
    },

    {
        method: 'PUT',
        path: '/user/cart/removeProduct/{reference_id}',
        config: {
            handler: controllers.UserController.removeProduct,
            tags: ['api', 'User'],
            description: 'Remove product from the user cart',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                params: {
                    reference_id: Joi.string().guid().required().description("Reference ID")
                },
                payload: {
                    qty: Joi.number().description("Quantity")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/user/cart/uploadPrescription',
        config: {
            handler: controllers.UserController.uploadPrescription,
            tags: ['api', 'User'],
            description: 'Upload the prescription image',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    file: Joi.string().required().description('base64 Encoded image'),
                    reference_id: Joi.string().guid().required().description("Cart product reference"),
                    observation: Joi.string().description("Observation for prescription"),
                    origin: Joi.string().description("Origin of the image OCR/IMG"),
                    ocrData: Joi.object().description("OCR Data")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/user/cart/deletePrescription',
        config: {
            handler: controllers.UserController.deletePrescription,
            tags: ['api', 'User'],
            description: 'Delete the prescription image',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    image: Joi.string().required().description("Prescriptions to delete"),
                    reference_id: Joi.string().guid().required().description("Cart product reference"),
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/user/order/finish',
        config: {
            handler: controllers.UserController.finishOrder,
            tags: ['api', 'User'],
            description: 'Confirm the deliver order',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description("Order id")
                }
            }
        }
    },

    {
        method: 'GET',
        path: '/user/cart/prescription/{reference_id}',
        config: {
            handler: controllers.UserController.getPrescription,
            tags: ['api', 'User'],
            description: 'Get product prescription',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                params: {
                    reference_id: Joi.string().guid().required().description("Cart product reference")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/user/cart/process',
        config: {
            handler: controllers.UserController.processCart,
            tags: ['api', 'User'],
            description: 'Process cart to be validated',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                payload: {
                    desiredDeliveryTime: Joi.string().required().description("Desired delivery time"),
                    name: Joi.string().required().description("Delivery Name"),
                    phoneNumber: Joi.number().required().description("Delivery phoneNumber"),
                    address: Joi.string().required().description("Delivery address"),
                    address2: Joi.string().description("Delivery address2"),
                    provider_id: Joi.string().guid().required().description("Delivery provider")
                }
            }
        }
    },

    // USER ORDERS
    {
        method: 'GET',
        path: '/user/orders',
        config: {
            handler: controllers.UserController.getOrders,
            tags: ['api', 'User'],
            description: 'Get user orders',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            }
        }
    },

    {
        method: 'GET',
        path: '/user/order/{order_id}',
        config: {
            handler: controllers.UserController.getOrderDetail,
            tags: ['api', 'User'],
            description: 'Get order detail',
            auth: {
                strategy: 'jwt',
                scope: ['user', 'admin']
            },
            validate: {
                params: {
                    order_id: Joi.string().description("Desired delivery time")
                }
            }
        }
    },

    // USER CATEGORIES
    {
        method: 'GET',
        path: '/user/productCategories',
        config: {
            handler: controllers.ProductController.getProductCategories,
            tags: ['api', 'User'],
            description: 'Get product categories'
        }
    },

    // USER PRODUCTS BY CATEGORY
    {
        method: 'POST',
        path: '/user/productByCategory',
        config: {
            handler: controllers.ProductController.getProductsByCategory,
            tags: ['api', 'User'],
            description: 'Get products by category',
            validate: {
                payload: {
                    pagination: Joi.object().required().description('Pagination'),
                    category: Joi.string().required().description("Product Category")
                }
            }
        }
    },

    // USER PROVIDERS
    {
        method: 'POST',
        path: '/user/providers',
        config: {
            handler: controllers.ProviderController.getProviders,
            tags: ['api', 'User'],
            description: 'Get providers by localization',
            validate: {
                payload: {
                    location: Joi.object().keys({
                        latitude: Joi.number().required().description("Latitude"),
                        longitude: Joi.number().required().description("Longitude")
                    }),
                    numKms: Joi.number().required().description("Radio in Kms")
                }
            }
        }
    },

    // USER GET PRODUCTS
    {
        method: 'POST',
        path: '/user/products',
        config: {
            handler: controllers.ProductController.getProducts,
            tags: ['api', 'User'],
            description: 'Get a list of products',
            validate: {
                payload: {
                    pagination: Joi.object().required().description('Pagination')
                }
            }
        }
    },

    {
        method: 'GET',
        path: '/user/product/{product_id}',
        config: {
            handler: controllers.ProductController.getProductDetail,
            tags: ['api', 'User'],
            description: 'Get product detail',
            validate: {
                params: {
                    product_id: Joi.string().description("Desired product id"),
                }
            }

        }
    },

    // USER SEARCH PRODUCT
    {
        method: 'GET',
        path: '/user/products/search/{text}/{category?}',
        config: {
            handler: controllers.ProductController.searchProduct,
            tags: ['api', 'User'],
            description: 'Search products',
            validate: {
                params: {
                    text: Joi.string().required().min(3).description("Search product min 3 caracters"),
                    category: Joi.any().description("Category product")  
                }
            }
        }
    },

    // ADD CARD
    {
        method: 'POST',
        path: '/user/card/add',
        config: {
            handler: controllers.UserController.addCard,
            tags: ['api', 'User'],
            description: 'Add card info to the user',
            auth: {
                strategy: 'jwt',
                scope: ['user']
            },
            validate: {
                payload: {
                    cardToken: Joi.string().required().description("Card Token"),
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/user/card/remove',
        config: {
            handler: controllers.UserController.removeCard,
            tags: ['api', 'User'],
            description: 'Remove card info to the user',
            auth: {
                strategy: 'jwt',
                scope: ['user']
            }
        }
    },

    {
        method: 'POST',
        path: '/user/cart/payment',
        config: {
            handler: controllers.UserController.payment,
            tags: ['api', 'User'],
            description: 'Pay products with user saved card',
            auth: {
                strategy: 'jwt',
                scope: ['user']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description("Order ID")
                }
            }
        }
    },

    // GET USER ALERTS
    {
        method: 'GET',
        path: '/user/alerts',
        config: {
            handler: controllers.UserController.getAlerts,
            tags: ['api', 'User'],
            description: 'Get a list of alerts',
            auth: {
                strategy: 'jwt',
                scope: ['user']
            }
        }
    },

    // DELETE USER ALERT
    {
        method: 'PUT',
        path: '/user/alert/desactivate',
        config: {
            handler: controllers.UserController.desactivateAlert,
            tags: ['api', 'User'],
            description: 'Desactivate alert',
            auth: {
                strategy: 'jwt',
                scope: ['user']
            },
            validate: {
                payload: {
                    alert_id: Joi.string().guid().required().description("Alert ID")
                }
            }
        }
    }

];
