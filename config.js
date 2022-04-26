require('dotenv').config({ path: './secret.env' });

module.exports = {
    server: {
        port: process.env.SERVER_PORT || 3000,
    },
    mongodb: {
        uri: process.env.MONGO_DB || 'mongodb://localhost:27017/magnus',
        autoindex: (process.env.NODE_ENV === 'develop' ? false : true),
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
};