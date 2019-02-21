module.exports = {};
const Boom = require('boom'),
    webpush = require('web-push');

webpush.setVapidDetails(
    'mailto:example@yourdomain.org',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const sendWebPush = (title, body, subscription) => {
    return new Promise((resolve, reject) => {
        const notificationPayload = {
            "notification": {
                "title": title,
                "body": body,
                "vibrate": [100, 50, 100],
                "data": {
                    "dateOfArrival": Date.now(),
                    "primaryKey": 1
                }
            }
        };

        webpush.sendNotification(subscription, JSON.stringify(notificationPayload))
            .then(() => {
                resolve();
            })
            .catch(err => {
                console.error("Error sending notification, reason: ", err);
                reject(Boom.badImplementation('Something wrong happen....'));
            });
    });
};

module.exports.sendWebPush = sendWebPush;

