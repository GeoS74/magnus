const koaBody = require('koa-body');
const config = require('../config');

module.exports = koaBody({
    formidable:{
        uploadDir: config.app.uploadFilesDir,
        allowEmptyFiles: false, //разрешить загрузку пустых файлов - не работает или я не понимаю как это должно работать
        minFileSize: 1,
        multiples: true,
        hash: 'md5',
        keepExtensions: true
    },
    multipart: true,
    // onFileBegin: (formName, file) => {
    //     //file.newFilename = 'test.jpg';
    //     //console.log('onFileBegin');
    //     //console.log(file);
    // },
});