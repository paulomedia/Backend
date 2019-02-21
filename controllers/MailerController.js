'use strict';
module.exports = {};
const config = require('config'),
    fs = require('fs'),
    handlebars = require('handlebars'),
    nodemailer = require('nodemailer');
//smtpTransport = require('nodemailer-smtp-transport');

// Creating a parametrized SMTP transport wit the data form config/default.js
const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    requireTLS: true,
    auth: {
        user: config.mail.user,
        pass: config.mail.pass
    }
});

const validateEmail = email => {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email.toLowerCase());
};


module.exports.sendMail = function (data) {
    return new Promise((resolve, reject) => {

        let bodyPath = config.configHome + config.mail.templatesPath + '/' + data.templateFile;
        //console.log(bodyPath);
        fs.readFile(bodyPath, {encoding: 'utf8'}, (err, src) => {
            if (err) {
                reject(err);
            }

            let template = handlebars.compile(src);
            let html = template(data.templateData);

            transporter.sendMail({
                from: config.mail.mailAccountName + ' <' + config.mail.mailAccount + '>',
                to: data.email,
                subject: data.subject,
                html: html
            })
                .then(resolve)
                .catch(reject);

        });
    });

};

module.exports.validateEmail = validateEmail;
