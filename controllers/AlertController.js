module.exports = {};
const models            = require('../models'),
      MessageController = require('./MessageController'),
      constants         = require('./constants'),
      Boom              = require('boom'),
      _                 = require('lodash'),
      Utils             = require('./utils');


const generaNumero = num => {
    return Math.ceil(Math.random() * num);
};

const esRepetido = (numGen, data) => {
    for ( var i = 0; i < data.length; ++i ){
        if ( numGen === data[i] ){
            return true;
        }
    }
    return false;
}

const getNumber = (num, data) =>{
    let aux = generaNumero(num);
    if ( !esRepetido(aux, data) ){
        return aux;
    } else {
        return generaNumero(num);
    }
}

const generaSequencia = (num, elements) => {
    let temp = '', aux, arr = [];
    for ( let i = 0; i < elements; ++i ){
        aux = getNumber(num, arr);
        arr.push(aux);
    }
    arr.sort((a, b) => { 
        return a - b; 
    }).forEach(num => {
        temp += String(num) + '-';
    });
    return temp.slice(0, temp.length - 1);
};

const factorialRecursivo = n => { 
    if (n == 0){ 
        return 1; 
    }
    return n * factorialRecursivo (n-1); 
}

const create = async (request, h) => {
    try {
        /*
        let orders = await getAlertsByOrderID(request.payload.order_id);
        let match = false;

        orders.Items.forEach(elem => {
            if ( elem.attrs.reference_id === request.payload.reference_id ){
                match = true;
            }
        });

        if ( match ){
            return Boom.conflict('Alert already exists');
        }

        let newAlertdata = {
            user_id: request.payload.user_id,
            order_id: request.payload.order_id,
            reference_id: request.payload.reference_id,
            product_id: request.payload.product_id,
            title: request.payload.title,
            message: request.payload.message,
            periodicity: request.payload.periodicity,               
            warningEndAlert: request.payload.warningEndAlert, 
            alertHour: request.payload.alertHour,            
            alertRepeat: request.payload.alertRepeat,
            status: constants.ALARM_STATUS.WAITING
        };
        */

        //let newAlert = await models.Alert.createAsync(newAlertdata);

        // TESTING the sending alerts to specific order simulamos la invocación del método
        //         por parte del rider
        /*
        setTimeout(() => {
            startAlerts(request.payload.order_id , request.payload.user_id);
        }, 20000);
        */

        console.log('******************************************* GENRATE SEQUENCIES *******************************************');
        console.log('**********************************************************************************************************');
        console.log('**********************************************************************************************************');
        console.log('**********************************************************************************************************');

        /*
        const permutator = inputArr => { 
            let result = []; 
            const permute = (arr, m = []) => { 
                if (arr.length === 0) { 
                    result.push(m); 
                } else { 
                    for (let i = 0; i < arr.length; i++) { 
                        let curr = arr.slice(); 
                        let next = curr.splice(i, 1); 
                        permute(curr.slice(), m.concat(next)); 
                    } 
                } 
            } 
            permute(inputArr);
            return result; 
        };
        */

        /*  
        function factorial (n) {
            var total = 1; 
            for (i=1; i<=n; i++) {
                total = total * i; 
            }
            return total; cd 
        }

        function factorialRecursivo (n) { 
            if (n == 0){ 
                return 1; 
            }
            return n * factorialRecursivo (n-1); 
        }

        */

        // 5 - 117807
        // 6 - 181668
        // 6 - 327915
        // 6 - 2228194
        // 6 - 123293
        // 6 - 1590071
        // 6 - 378999
        // 6 - 2209038
        // 6 - 491326
        // 6 - 40771
        // 6 - 902115
        // 6 - 107094
        // 6 - 
        // 6 - 

        // '1-10-12-17-21-22';
        const seqDefault = '1-10-12-17-21-22'; 
        let count = 0, time = 1;

        let seqs = [];

        let interval = setInterval(() => {
            let seq = generaSequencia(31, 6);
            //console.log(seq);
            //console.log(count);

            if ( count < 10  ){
                seqs.push(seq);
                console.log('count                --> ' , count );
                console.log('Sequencias generadas --> ' , seqs );
            }

            if ( seqDefault === seq ){
                console.log('ES IGUAL  secuencias generadas --> ' , count );
                clearInterval(interval);
            }
            count++;
        }, time);

        return  { result: 'ok' }; // newAlert;
    } catch(e){
        return e;
    }
};

const update = async (request, h) => {
    try {
        const alert = await models.Alert.getAsync(request.payload.alert_id, {ConsistentRead: true});

        if (!alert) {
            throw Boom.conflict('Alert not found');
        }

        let updateData = {
            alert_id: request.payload.alert_id,
            title: request.payload.title,
            message: request.payload.message,
            periodicity: request.payload.periodicity,               
            warningEndAlert: request.payload.warningEndAlert, 
            alertHour: request.payload.alertHour,            
            alertRepeat: request.payload.alertRepeat          
        };

        await models.Alert.updateAsync(updateData);

        return {result: 'ok'}

    } catch (e) {
        if (e.isBoom) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }

};

const getAlertsById = async alert_id => {
    return models.Alert.scan()
        .where('alert_id')
        .equals(alert_id)
        .execAsync();
};

const getAlerts = async (request, h) => {
    return await models.Alert.scan().execAsync();
};

const getAlertsByUserID = async user_id => {
    return models.Alert.scan()
        .where('user_id')
        .equals(user_id)
        .execAsync();
};

const getAlertsByOrderID = async order_id => {
    return models.Alert.scan()
        .where('order_id')
        .equals(order_id)
        .execAsync();
};

const deleteAlert = async (request, h) => {
    try {
        const alert = await models.Alert.getAsync(request.params.alert_id, {ConsistentRead: true});

        if (!alert) {
            throw Boom.notFound('Alert not found');
        }

        await models.Alert.destroy(alert.get('alert_id'));

        return {result: 'ok'};

    } catch (e) {
        if (e.isBoom) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }

};

const getDataToSend = data => {
    return {
        app_id: constants.APP_ID.CLIENT,
        user_id: data.user_id,
        param: data.product_id,
        notificationType: constants.NOTIFICATION_TYPE.USER,
        type: constants.NOTIFICATION_TYPE.ALERT,
        title: data.title,
        message: data.message
    };
};

const convertToSeconds = day => {
    let hours24 = 86400; 
    return day * hours24;
};

const sendAlerts = async data => {

    let dataToSend = getDataToSend(data), alarmInterval, time;

    if ( !data.alertRepeat ){
        time = convertToSeconds(data.warningEndAlert);
        setTimeout(() => {

            MessageController.messageTo(dataToSend);
            
            models.Alert.updateAsync( { alert_id: data.alert_id, status: constants.ALARM_STATUS.DISABLED } );

        }, time);
        
    } else {
        time = convertToSeconds(data.warningEndAlert);
        alarmInterval = setInterval(() => {
            let element;
            let alert = getAlertsById(data.alert_id).then(item => {
                element = item.Items[0].attrs;

                if ( element.status === constants.ALARM_STATUS.ACTIVATED ){
                    MessageController.messageTo(dataToSend);
                } else {
                    clearInterval(alarmInterval);
                }
            }).catch(err => {
                clearInterval(alarmInterval);
            });
            
        }, time);
    }

    models.Alert.updateAsync( { alert_id: data.alert_id, status: constants.ALARM_STATUS.ACTIVATED } );

};

const startAlerts = async (order_id, user_id) => {
    try {
        let alerts = await getAlertsByOrderID(order_id);

        if (!alerts) {
            throw Boom.notFound('Alerts not found');
        }

        alerts.Items.forEach(alert => {
            if ( alert.attrs.user_id === user_id ){
                if ( alert.attrs.status === constants.ALARM_STATUS.WAITING ){
                    sendAlerts(alert.attrs);
                }
            }
        });

    } catch (e) {
        if (e.isBoom) {
            throw e;
        } else {
            throw Boom.internal();
        }
    }
    
};

const getAlertDetail = async (request, h) => {
    return await getAlert(request.params.alert_id);
};

const getAlert = async alert_id => {
    return new Promise((resolve, reject) => {
        models.Alert.get(alert_id, {ConsistentRead: true}, (err, item) => {
            if (err || _.isNil(item)) {
                reject(Boom.notFound('Alert not found'));
            } else {
                resolve(item);
            }
        });
    });
};

module.exports.create = create;
module.exports.update = update;
module.exports.deleteAlert = deleteAlert;
module.exports.getAlertDetail = getAlertDetail;
module.exports.getAlerts = getAlerts;
module.exports.getAlertsByUserID = getAlertsByUserID;
module.exports.getAlertsByOrderID = getAlertsByOrderID;
module.exports.startAlerts = startAlerts;
module.exports.getAlert = getAlert;