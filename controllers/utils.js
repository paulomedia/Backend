const Bcrypt = require('bcrypt');

exports.roundDecimal = value => {
    return Number(Math.round((value + 0.00001) * 100) / 100);
};

exports.getFileContentType = extension => {
    let contentType = '';
    switch (extension.toLowerCase()) {
        case 'pdf':
            contentType = 'application/pdf';
            break;
        case 'jpg':
            contentType = 'image/jpeg';
            break;
        case 'jpeg':
            contentType = 'image/jpeg';
            break;
        case 'png':
            contentType = 'image/png';
            break;
        case 'html':
            contentType = 'text/html';
            break;
        default:
            contentType = 'application/octet-stream';
    }

    return contentType;
};

exports.randomString = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

exports.hashPassword = password => {
    let salt = Bcrypt.genSaltSync(10);
    return Bcrypt.hashSync(password, salt);
};

exports.generateCode = num => {
    const caracteres = "ABCDEFGHJKMNPQRTUVWXYZ12346789"; let code = '';
    for (let i=0; i<num; ++i){
        code += caracteres.charAt(Math.floor(Math.random()*caracteres.length)); 
    } 
    return code;
};