const controllers = require('../controllers'),
    config = require("config"),
    Joi = require("joi");

module.exports = [

    // SYSTEM HEALTH
    {
        method: 'GET',
        path: '/healthCheck',
        config: {
            handler: (request, h) => {
                return {status: 'ok'};
            },
            tags: ['api', 'Admin'],
            description: 'System health'
        }
    },

    // CHECK MAIL
    {
        method: 'GET',
        path: '/mailCheck/{email}',
        config: {
            handler: (request, h) => {
                let data = {
                    email: request.params.email,
                    subject: 'TelePharma Mailer Check',
                    templateFile: 'test.hbs',
                    templateData: {
                        name: request.params.email.split('@')[0],
                        urlLogo: config.aws.cloudfront.mail + '/Pharmacy.jpg'
                    }
                };
                return controllers.MailerController.sendMail(data);
            },
            tags: ['api', 'Admin'],
            description: 'Mail health',
            validate: {
                params: {
                    email: Joi.string().email().required().description("Email")
                }
            }
        }
    },


    // ADMIN AUTH
    {
        method: 'POST',
        path: '/admin/authentication',
        config: {
            handler: controllers.AdminController.authenticate,
            tags: ['api', 'Admin'],
            description: 'Admin Auth',
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password")
                }
            }
        }
    },

    // GET ADMINS
    {
        method: 'POST',
        path: '/admin/admins',
        config: {
            handler: controllers.AdminController.getAdmins,
            tags: ['api', 'Admin'],
            description: 'Get Admins',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    sort: Joi.object(),
                    filters: Joi.object(),
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // CREATE ADMIN
    {
        method: 'POST',
        path: '/admin/create',
        config: {
            handler: controllers.AdminController.register,
            tags: ['api', 'Admin'],
            description: 'Create Admin',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().description("Password"),
                    name: Joi.string().required().description("Name")
                }
            }
        }
    },

    // UPDATE ADMIN
    {
        method: 'PUT',
        path: '/admin/update/{email}',
        config: {
            handler: controllers.AdminController.update,
            tags: ['api', 'Admin'],
            description: 'Update the admin',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("Admin email")
                },
                payload: {
                    password: Joi.string().required().min(4).description("Password"),
                    name: Joi.string().required().description("Complete name")
                }
            }
        }
    },

    // DELETE ADMIN
    {
        method: 'DELETE',
        path: '/admin/{email}',
        config: {
            handler: controllers.AdminController.deleteAdmin,
            tags: ['api', 'Admin'],
            description: 'Delete the admin',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("Admin email")
                }
            }
        }
    },

    // DEVICES
    {
        method: 'POST',
        path: '/admin/device/getAllDevices',
        config: {
            handler: controllers.DeviceController.getAllDevices,
            tags: ['api', 'Admin'],
            description: 'Get all devices w/wo filters',
            auth: {
                strategy: 'jwt',
                access: [{
                    scope: ['admin']
                }]
            },
            validate: {
                payload: {
                    user_id: Joi.string().description('(Optional) user identifier'),
                    app_id: Joi.string().description("(Optional) App identifier"),
                    platform: Joi.string().description("(Optional) Platform type (ios - android)")
                }
            }
        }
    },

    // APP
    {
        method: 'GET',
        path: '/admin/app/getAllApps',
        config: {
            handler: controllers.AppController.getAllApps,
            tags: ['api', 'Admin'],
            description: 'Get all apps',
            auth: {
                strategy: 'jwt',
                access: [{
                    scope: ['admin']
                }]
            }
        }
    },

    {
        method: 'GET',
        path: '/admin/app/{app_id}',
        config: {
            handler: controllers.AppController.getAppInfo,
            tags: ['api', 'Admin'],
            description: 'Get app Info',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    app_id: Joi.string().required().description("App identifier")
                }
            },
        }
    },

    {
        method: 'POST',
        path: '/admin/app/createApp',
        config: {
            handler: controllers.AppController.createApp,
            tags: ['api', 'Admin'],
            description: 'Get all apps',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    name: Joi.string().required().description("App Name"),
                    version: Joi.string().description("App version"),
                    bundle: Joi.string().required().min(4).description("App reverse domain bundle name"),
                    icon: Joi.string().description('App icon in Base64'),
                }
            }
        }
    },

    {
        method: 'PUT',
        path: '/admin/app/{app_id}',
        config: {
            handler: controllers.AppController.editApp,
            tags: ['api', 'Admin'],
            description: 'Update the app',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    app_id: Joi.string().required().description("App identifier")
                },
                payload: {
                    name: Joi.string().required().description("App Name"),
                    version: Joi.string().description("App version"),
                    icon: Joi.string().description('App icon in Base64'),
                }
            }
        }
    },

    {
        method: 'DELETE',
        path: '/admin/app/{app_id}',
        config: {
            handler: controllers.AppController.deleteApp,
            tags: ['api', 'Admin'],
            description: 'Delete the app',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    app_id: Joi.string().required().description("App identifier")
                }
            }
        }
    },

    // PRODUCTS
    {
        method: 'POST',
        path: '/admin/product/create',
        config: {
            handler: controllers.ProductController.createProduct,
            tags: ['api', 'Admin'],
            description: 'Create new product',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    external_id: Joi.string().description("external id"),
                    name: Joi.string().required().description("Product Name"),
                    description: Joi.string().description("Product description"),
                    category: Joi.string().description("Category"),
                    subcategory: Joi.string().description("Subcategory"),
                    form: Joi.string().description("Format"),
                    lab: Joi.string().description("Lab name"),
                    pvp: Joi.number().precision(2).description("PVP sin IVA"),
                    pvpVat: Joi.number().precision(2).description("PVP con IVA"),
                    prescriptionRequired: Joi.boolean().description("Necesita receta"),
                    composition: Joi.array().items(
                        Joi.object().keys({
                            name: Joi.string(),
                            qty: Joi.number(),
                            units: Joi.string(),
                        })
                    ).description("Composición"),
                    dataSheet: Joi.string().description("URL Prospecto")
                }
            }
        }
    },

    // MESSAGE
    {
        method: 'POST',
        path: '/admin/message/sendMessageToUser',
        config: {
            handler: controllers.MessageController.sendMessageToUser,
            tags: ['api', 'Admin'],
            description: 'Send message to specific user from app',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    user_id: Joi.string().required().description("User identifier"),
                    key: Joi.string().required().description("Key identifier ( Order/Alert )"),
                    param: Joi.string().required().description("Order ID or Product ID"),
                    badge: Joi.number().integer().description("iOS: increment icon badge"),
                    collapseKey: Joi.string().description("Android: collapsekey..."),
                    sound: Joi.string().description("sound name"),
                    title: Joi.string().required().description("Title of the message (Android)"),
                    message: Joi.string().required().description("Message to send")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/admin/message/sendMessageToRider',
        config: {
            handler: controllers.MessageController.sendMessageToRider,
            tags: ['api', 'Admin'],
            description: 'Send message to specific rider from app',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    rider_id: Joi.string().required().description("Rider identifier"),
                    badge: Joi.number().integer().description("iOS: increment icon badge"),
                    collapseKey: Joi.string().description("Android: collapsekey..."),
                    sound: Joi.string().description("sound name"),
                    title: Joi.string().required().description("Title of the message (Android)"),
                    message: Joi.string().required().description("Message to send")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/admin/message/sendMessageToAll',
        config: {
            handler: controllers.MessageController.sendMessageToAll,
            tags: ['api', 'Admin'],
            description: 'Send message to all riders or users from app',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    badge: Joi.number().integer().description("iOS: increment icon badge"),
                    collapseKey: Joi.string().description("Android: collapsekey..."),
                    sound: Joi.string().description("sound name"),
                    title: Joi.string().required().description("Title of the message (Android)"),
                    message: Joi.string().required().description("Message to send")
                }
            }
        }
    },

    {
        method: 'POST',
        path: '/admin/message/sendMessageToDevice',
        config: {
            handler: controllers.MessageController.sendMessageToDevice,
            tags: ['api', 'Admin'],
            description: 'Send message to specific device',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    app_id: Joi.string().required().description("App Identifier"),
                    device_id: Joi.string().guid({version: ['uuidv4']}).required().description("device id"),
                    badge: Joi.number().integer().description("iOS: increment icon badge"),
                    collapseKey: Joi.string().description("Android: collapsekey..."),
                    sound: Joi.string().description("sound name"),
                    title: Joi.string().required().description("Title of the message (Android)"),
                    message: Joi.string().required().description("Message to send")
                }
            }
        }
    },

    // GET USERS
    {
        method: 'POST',
        path: '/admin/users',
        config: {
            handler: controllers.UserController.getUsers,
            tags: ['api', 'Admin'],
            description: 'Get a list of users',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    sort: Joi.object(),
                    filters: Joi.object(),
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // CREATE USER
    {
        method: 'POST',
        path: '/admin/user/create',
        config: {
            handler: controllers.UserController.register,
            tags: ['api', 'Admin'],
            description: 'Create the user',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
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
        path: '/admin/user/update/{email}',
        config: {
            handler: controllers.UserController.update,
            tags: ['api', 'Admin'],
            description: 'Update the user',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("User email")
                },
                payload: {
                    password: Joi.string().description("Password"),
                    name: Joi.string().description("Complete name"),
                    phoneNumber: Joi.number().min(9).description("Phone number"),
                    address: Joi.string().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number().required().description("Latitude"),
                        longitude: Joi.number().required().description("Longitude")
                    })
                }
            }
        }
    },

    // DELETE USER
    {
        method: 'DELETE',
        path: '/admin/user/{email}',
        config: {
            handler: controllers.UserController.deleteUser,
            tags: ['api', 'Admin'],
            description: 'Delete the user',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("User email")
                }
            }
        }
    },

    // GET PROVIDERS
    {
        method: 'POST',
        path: '/admin/providers',
        config: {
            handler: controllers.ProviderController.getProvidersForAdmin,
            tags: ['api', 'Admin'],
            description: 'Get a list of providers',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    sort: Joi.object(),
                    filters: Joi.object(),
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // CREATE PROVIDER
    {
        method: 'POST',
        path: '/admin/provider/create',
        config: {
            handler: controllers.ProviderController.register,
            tags: ['api', 'Admin'],
            description: 'Admin Provider Create',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password"),
                    name: Joi.string().required().description("Complete name"),
                    description: Joi.any().description("Description"),
                    phoneNumber: Joi.number().required().min(9).description("Phone number"),
                    address: Joi.string().required().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number().required().description("Latitude"),
                        longitude: Joi.number().required().description("Longitude")
                    }),
                    businessCalendar: Joi.object().keys({
                        businessHours: Joi.object().keys({
                            monday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            thursday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            wednesday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            tuesday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            friday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            saturday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            sunday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            })
                        }),
                        blacklist: Joi.array().items(
                            Joi.string()
                        ),
                        whitelist: Joi.array().items(
                            Joi.string()
                        )
                    }).description("Business Calender")
                }
            }
        }
    },

    // PROVIDER UPDATE
    {
        method: 'PUT',
        path: '/admin/provider/update/{email}',
        config: {
            handler: controllers.ProviderController.update,
            tags: ['api', 'Admin'],
            description: 'Admin Provider Update',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("Provider email")
                },
                payload: {
                    password: Joi.string().required().min(4).description("Password"),
                    name: Joi.string().required().description("Complete name"),
                    description: Joi.any().description("Description"),
                    phoneNumber: Joi.number().required().min(9).description("Phone number"),
                    address: Joi.string().required().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number().required().description("Latitude"),
                        longitude: Joi.number().required().description("Longitude")
                    }),
                    businessCalendar: Joi.object().keys({
                        businessHours: Joi.object().keys({
                            monday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            thursday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            wednesday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            tuesday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            friday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            saturday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            }),
                            sunday: Joi.object().keys({
                                morning: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                evening: Joi.object().keys({
                                    open: Joi.string(),
                                    close: Joi.string()
                                }),
                                allDay: Joi.boolean()
                            })
                        }),
                        blacklist: Joi.array().items(
                            Joi.string()
                        ),
                        whitelist: Joi.array().items(
                            Joi.string()
                        )
                    }).description("Business Calender")
                }
            }
        }
    },

    // DELETE PROVIDER
    {
        method: 'DELETE',
        path: '/admin/provider/{email}',
        config: {
            handler: controllers.ProviderController.deleteProvider,
            tags: ['api', 'Admin'],
            description: 'Delete the provider',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("Provider email")
                }
            }
        }
    },

    // UPLOAD IMAGE TO PROVIDR
    {
        method: 'POST',
        path: '/admin/provider/uploadImage',
        config: {
            handler: controllers.ProviderController.uploadImage,
            tags: ['api', 'Admin'],
            description: 'Upload image to provider',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    file: Joi.string().required().description('base64 Encoded image'),
                    email: Joi.string().email().required().description("Provider email")
                }
            }
        }
    },

    // UPLOAD IMAGE TO PROVIDR
    {
        method: 'POST',
        path: '/admin/provider/deleteImages',
        config: {
            handler: controllers.ProviderController.deleteImages,
            tags: ['api', 'Admin'],
            description: 'Delete image in provider',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Provider email"),
                    images: Joi.any().required().description("Images to delete")
                }
            }
        }
    },

    // RIDER REGISTER
    {
        method: 'POST',
        path: '/admin/rider/create',
        config: {
            handler: controllers.RiderController.register,
            tags: ['api', 'Admin'],
            description: 'Admin Create Rider',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Email"),
                    password: Joi.string().required().min(4).description("Password"),
                    name: Joi.string().required().description("Complete name"),
                    phoneNumber: Joi.number().required().min(9).description("Phone number"),
                    address: Joi.any().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number(),
                        longitude: Joi.number()
                    })
                }
            }
        }
    },

    // GET RIDERS
    {
        method: 'POST',
        path: '/admin/riders',
        config: {
            handler: controllers.RiderController.getRiders,
            tags: ['api', 'Admin'],
            description: 'Get a list of riders',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    sort: Joi.object(),
                    filters: Joi.object(),
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination')
                }
            }
        }
    },

    // DELETE RIDER
    {
        method: 'DELETE',
        path: '/admin/rider/{email}',
        config: {
            handler: controllers.RiderController.deleteRider,
            tags: ['api', 'Admin'],
            description: 'Delete the rider',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("Rider email")
                }
            }
        }
    },

    // RIDER UPDATE
    {
        method: 'PUT',
        path: '/admin/rider/update/{email}',
        config: {
            handler: controllers.RiderController.update,
            tags: ['api', 'Admin'],
            description: 'Update the Rider',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    email: Joi.string().email().required().description("Rider email")
                },
                payload: {
                    password: Joi.string().required().min(4).description("Password"),
                    name: Joi.string().required().description("Complete name"),
                    phoneNumber: Joi.number().required().min(9).description("Phone number"),
                    address: Joi.any().description("Address"),
                    address2: Joi.any().description("Address2"),
                    location: Joi.object().keys({
                        latitude: Joi.number(),
                        longitude: Joi.number()
                    })
                }
            }
        }
    },

    // TEST SUBSCRIBE
    {
        method: 'POST',
        path: '/admin/test/subscribeToPush',
        config: {
            handler: controllers.AdminController.subscribeToPush,
            tags: ['api', 'Admin'],
            description: 'Subscribe to push',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    subscription: Joi.object()
                }
            }
        }
    },

    // TEST WEB PUSH
    {
        method: 'POST',
        path: '/admin/test/sendWebPush',
        config: {
            handler: controllers.AdminController.sendWebPush,
            tags: ['api', 'Admin'],
            description: 'Send web push',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    email: Joi.string().email().required().description("Provider Email"),
                    title: Joi.string().description("Title"),
                    message: Joi.string().description("Message")
                }
            }
        }
    },

    // GET ORDERS
    {
        method: 'POST',
        path: '/admin/orders',
        config: {
            handler: controllers.OrderController.getOrders,
            tags: ['api', 'Admin'],
            description: 'Get a list of orders',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    sort: Joi.object(),
                    filters: Joi.object(),
                    pagination: Joi.object().keys({
                        numElements: Joi.number(),
                        page: Joi.number()
                    }).required().description('Pagination'),
                    alerts: Joi.object(),
                    prescription: Joi.object()
                }
            }
        }
    },

    // ORDER TO RIDER
    {
        method: 'PUT',
        path: '/admin/order/cancel/{order_id}',
        config: {
            handler: controllers.OrderController.cancelOrder,
            tags: ['api', 'Admin'],
            description: 'Cancel an order',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    order_id: Joi.string().guid().required().description("Order id"),
                }
            }
        }
    },

    // UNASSIGNED ORDER TO RIDER
    {
        method: 'PUT',
        path: '/admin/rider/order/unassigned/{rider_id}',
        config: {
            handler: controllers.RiderController.unassignOrder,
            tags: ['api', 'Admin'],
            description: 'Unassinge an order',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    rider_id: Joi.string().guid().required().description("Rider ID"),
                },
                payload: {
                    order_id: Joi.string().guid().required().description('Order ID')
                }
            }
        }
    },

    // ALERTS
    // CREATE
    {
        method: 'POST',
        path: '/admin/alert/createAlert',
        config: {
            handler: controllers.AlertController.create,
            tags: ['api', 'Admin'],
            description: 'Create the alert'/*,
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description('Order ID'),
                    user_id: Joi.string().guid().required().description('User ID'),
                    reference_id: Joi.string().guid().required().description('Reference ID'),
                    product_id: Joi.string().guid().required().description('Product ID'),
                    title: Joi.string().required().description('Title to alert'),
                    message: Joi.string().required().description('Message to alert'),
                    periodicity: Joi.number().description('Terminar cada'),
                    warningEndAlert: Joi.number().description('Avisar cuantos dias antes de terminar el alerta'),
                    alertHour: Joi.string().description('Hora de la alarma'),
                    alertRepeat: Joi.boolean().description('Repetición de la alarma')
                }
            }*/
        }
    },

    // UPDATE
    {
        method: 'PUT',
        path: '/admin/alert/updateAlert',
        config: {
            handler: controllers.AlertController.update,
            tags: ['api', 'Admin'],
            description: 'Update the alert',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    alert_id: Joi.string().guid().required().description('Alert ID'),
                    title: Joi.string().description('Title to alert'),
                    message: Joi.string().description('Message to alert'),
                    periodicity: Joi.number().description('Terminar cada'),
                    warningEndAlert: Joi.number().description('Avisar cuantos dias antes de terminar el alerta'),
                    alertHour: Joi.string().description('Hora de la alarma'),
                    alertRepeat: Joi.boolean().default(false).description('Repetición de la alarma')
                }
            }
        }
    },

    // DELETE
    {
        method: 'DELETE',
        path: '/admin/alert/deleteAlert/{alert_id}',
        config: {
            handler: controllers.AlertController.deleteAlert,
            tags: ['api', 'Admin'],
            description: 'Delete the alert',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    alert_id: Joi.string().guid().required().description("Alert ID")
                }
            }
        }
    },

    // GET ALERT DETAIL
    {
        method: 'GET',
        path: '/admin/alert/{alert_id}',
        config: {
            handler: controllers.AlertController.getAlertDetail,
            tags: ['api', 'Admin'],
            description: 'Get a detail of an Alert',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    alert_id: Joi.string().guid().required().description("Alert ID")
                }
            }
        }
    },

    // GET ALERTS
    {
        method: 'GET',
        path: '/admin/alerts',
        config: {
            handler: controllers.AlertController.getAlerts,
            tags: ['api', 'Admin'],
            description: 'Get a list of Alerts',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            }
        }
    },

    // GET PRODUCTS
    {
        method: 'POST',
        path: '/admin/products',
        config: {
            handler: controllers.AdminController.getProducts,
            tags: ['api', 'Admin'],
            description: 'Get a list of products',
            validate: {
                payload:{
                    sort: Joi.object().description('Ordenation'),
                    filters: Joi.object().description('Filters'),
                    pagination: Joi.object().required().description('Pagination')
                }
            }
        }
    },

    // PROCESS ORDER
    {
        method: 'PUT',
        path: '/admin/alert/processOrder',
        config: {
            handler: controllers.OrderController.processOrder,
            tags: ['api', 'Admin'],
            description: 'Change the state of isProcess in order',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                payload: {
                    order_id: Joi.string().guid().required().description('Order ID'),
                    process: Joi.boolean().default(true).required().description('Process flag')
                }
            }
        }
    },

    // GET ORDER ALERTS
    {
        method: 'GET',
        path: '/admin/order/alerts/{order_id}',
        config: {
            handler: controllers.AdminController.getAlerts,
            tags: ['api', 'Admin'],
            description: 'Get a list of alerts from order',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    order_id: Joi.string().guid().required().description("Order ID")
                }
            }
        }
    },

    // GET ALERT LIST FROM A USER
    {
        method: 'GET',
        path: '/admin/user/alerts/{user_id}',
        config: {
            handler: controllers.AdminController.getUserAlerts,
            tags: ['api', 'Admin'],
            description: 'Get a list of alerts from some user',
            auth: {
                strategy: 'jwt',
                scope: ['admin']
            },
            validate: {
                params: {
                    user_id: Joi.string().guid().required().description("User ID")
                }
            }
        }
    }

];
