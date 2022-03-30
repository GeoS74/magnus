require('dotenv').config({path: './secret.env'});

module.exports = {
    server: {
        port: process.env.SERVER_PORT || 3000,
    },
    mongodb: {
        uri: process.env.MONGO_DB || 'mongodb://localhost:27017/magnus',
        autoindex: process.env.AUTOINDEX || true,
    },
    app: {
        uploadFilesDir: './files/upload',
    },
    crypto: {
        iterations: 12000,
        length: 128,
        digest: 'sha512',
    },
};