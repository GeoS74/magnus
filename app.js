require('module-alias/register');
const Koa = require('koa');
const app = new Koa();

const serve = require('koa-static');
app.use(serve('client/public')); //общие статические файлы


app.use(require('@logger'));

app.use(require('@user').router.routes());

app.use(require('@letters').router.routes());

app.use(serve('components/valdane/scancopy')); //статические файлы компоненты
app.use(require('@valdane').router.routes());

app.use(serve('components/transport/client/img')); //статические файлы компоненты
app.use(require('@transport').router.routes());
app.use(require('@transport').mainPage.routes());

module.exports = app;






















//прикольное поведение читалки
// app.use(require('koa-csv')('./files/', {trim: true}));






//router.get('/manycreate', manyCreate);
// const connection = require('./libs/connection');
// router.del('/themas', ctx => {
//     connection.db.dropCollection('letters', function(err, result) {});
//     connection.db.dropCollection('letterthemes', function(err, result) {});
//     ctx.body = 'ok';
// });








// router.get('/test', async ctx => {
//     ctx.body = ctx.request.query;
// });






// app.use(require('koa-body')({
//     formidable:{uploadDir: './files'},    //This is where the files would come
//     multipart: true,
//     onFileBegin: (formName, file) => {
//         //file.newFilename = 'test.jpg';
//         console.log('onFileBegin');
//         console.log(file);
//     },
// }));

// app.use((ctx, next) => {
//     console.log(ctx.request.body);
//     console.log(ctx.request.files);
//     if(ctx.request.files){
//        fs.rename(ctx.request.files.any_file_1.path, './files/'+ctx.request.files.any_file_1.name, err => {
//         if(err) throw err;
//         console.log('rename complete');
//         });
//     }
    
//     next();
// });



// app.use((ctx, next) => {
//     if(ctx.request.url !== '/') return next();
//     ctx.set('content-type', 'text/html');
//     ctx.body = fs.createReadStream('./files/form.htm');
// });









//router.post('/letters', koaBody, uploadLetters, saveLetter);

// const config = require('./config');
// const formidable = require('formidable');
// const form = formidable({
//     uploadDir: config.app.uploadFilesDir,
//     allowEmptyFiles: false, //разрешить загрузку пустых файлов - не работает или я не понимаю как это должно работать
//     //minFileSize: 1,
//     multiples: true,
//     hashAlgorithm: 'md5',
//     keepExtensions: true
// });

// router.post('/letters', async ctx => {
//     form.parse(ctx.req, (err, fields, files) => {
//         console.log(err);
//         console.log(fields);
//     });

//     ctx.body = 'ok';
// });







// app.use(require('koa-body')({
//     formidable:{uploadDir: './files'},    //This is where the files would come
//     multipart: true,
//     onFileBegin: (formName, file) => {
//         //file.newFilename = 'test.jpg';
//         console.log('onFileBegin');
//         console.log(file);
//     },
// }));



// const router = new Router();



// router.get('/letters', async ctx => {
//     ctx.set('content-type', 'text/html');
//     ctx.body = await fs.createReadStream(path.join(__dirname, './client/letters.html'));
// });
// // router.post('/letters', uploadLetters);
// router.post('/letters', require('koa-body')({
//         formidable:{uploadDir: './files'},    //This is where the files would come
//         multipart: true,
//         onFileBegin: (formName, file) => {
//             //file.newFilename = 'test.jpg';
//             console.log('onFileBegin');
//             console.log(file);
//         },
//     }), async ctx => {
//     ctx.body = ctx.request.files;
// });








// const {v4: uuidv4} = require('uuid');

// router.get('/test', async ctx => {
//     //console.log(require('uuid').v5());
//     //ctx.body = uuidv4();
//     // const err = new Error({'goo':'bingo'});
//     // err.name = 'ValidationError';
//     // ctx.throw(408, err);

//     ctx.body = pug.renderFile(
//         path.join(__dirname, './templates/form') + '.pug'
//     );
// });





// // Создание сервера
//const httpServer = require('http').createServer(app.callback());
// Берём API socket.io
// const io = require('socket.io')(httpServer, {
//     cors: {
//       origin: "http://localhost:3000",
//       methods: ["GET", "POST"]
//     }
//   });
// const io = require('./socket');
 
// // Подключаем клиенты
// io.on('connection', (socket) => {
//     // Выводим в консоль 'connection'
//     console.log('connection');
//     // Отправляем всем кто подключился сообщение привет
//     io.emit('hello', 'Привет');
//     // Что делать при случае дисконнекта
//     socket.on('disconnect', () => {
//         // Выводи 'disconnected'
//         console.log('disconnected');
//     });
//     socket.on('message', message => {
//         console.log('message', message);
//         io.emit('hello', message);
//     });
// });

 
// Назначаем порт для сервера
//httpServer.listen(3001);

// router.get('/chat', async (ctx, next) => {
//     ctx.set('content-type', 'text/html');
//     ctx.body = await fs.createReadStream(path.join(__dirname, './templates/form_chat.html'));

//     // ctx.body = pug.renderFile(
//     //     path.join(__dirname, './templates/form_chat') + '.pug'
//     // );
// });



// router.get('/user', allUsers);
// router.get('/user/:id', userById);
// router.post('/user', koaBody, createUser);
// router.post('/user/:id', koaBody, updateUser);



// app.use(ctx => {
//     ctx.set('content-type', 'text/html');
//     ctx.body = fs.createReadStream(path.join(__dirname, '/client/registrateForm.html'));
// });