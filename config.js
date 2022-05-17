require('dotenv').config({ path: './secret.env' });

module.exports = {
    server: {
        port: process.env.SERVER_PORT || 3000,
        portSSL: process.env.SERVER_PORT_SSL || 3001,
    },
    mongodb: {
        uri: process.env.MONGO_DB || 'mongodb://localhost:27017/magnus',
        autoindex: (process.env.NODE_ENV === 'develop' ? true : false),
    },
    app: {
        uploadFilesDir: './files/upload',
    },
    crypto: {
        iterations: (process.env.NODE_ENV === 'develop' ? 1 : 12000),
        length: 128,
        digest: 'sha512',
    },
    cryptoCSRF: {
        secret: process.env.CSRF_SECRET || 'any_secret',
        iterations: (process.env.NODE_ENV === 'develop' ? 1 : 12000),
        length: 64,
        digest: 'sha512',
    },
    cookie: {
        // secure: (process.env.NODE_ENV === 'develop' ? false : true), //логическое значение, указывающее, должен ли файл cookie отправляться только через HTTPS ( false по умолчанию для HTTP, true по умолчанию для HTTPS).
        //!!!В Н И М А Н И Е!!! Измени это!!!
        secure: false,
    },
    session: {
        expiry: 60 * 60 * 24,//sec
        maxCount: 5, //максимальное количество одновременных сессий для одного пользователя
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'ssdT$#t#%Y%$',
        expiry: 1000 * 60 * 10, //ms
    },
    mailer: {
        host: process.env.MAILER_HOST || '',
        port: process.env.MAILER_PORT || 25,
        user: process.env.MAILER_USER || '',
        pass: process.env.MAILER_PASS || '',
    }
};