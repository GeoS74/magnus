const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const koaBody = require('@root/libs/koaBody');
const mustBeAuthenticated = require('@root/libs/mustBeAuthenticated');
const { allPositions, addPosition, updPosition, delPosition } = require('@valdane/controllers/positions');
const { allTechCenter, addTechCenter, updTechCenter, delTechCenter } = require('@valdane/controllers/techcenter');
const { addStaffer, updStaffer, getStaffer, delStaffer, allStaffers, searchStaffers, uploadFile, delFile, checkCredentials, changeAvatar, toExcel } = require('@valdane/controllers/staffer');
const { addPeriod, updPeriod, delPeriod, allCharts } = require('@valdane/controllers/chart');
const mongoose = require('mongoose');

const SSI = require('node-ssi'); //https://www.npmjs.com/package/node-ssi
const ssi = new SSI({
        baseDir: '.',   //file include всегда относятся к baseDir, указанному в опциях
                        //virtual include относятся к текущему файлу
        encoding: 'utf-8',
        payload: {}
    });

const router = new Router();

router.prefix('/valdane');


module.exports.router = router;

//добавить в контекст функцию-валидатор ObjectId
router.use((ctx, next) => {
    ctx.checkObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
    return next();
});

/*контроль даты от клиента
получает дату в строке вида "ДД.ММ.ГГГГ", пытается преобразовать во временную метку и возвращает её в случае успеха или null
        ввод:       вывод:
        99-0-2020   2020-01-01T00:00:00.000Z
        99-99-2020  null
        14-14-2020  null
        14-12-2020  2020-12-14T00:00:00.000Z
        14-13-2020  null
        14-14-2020  null
        null        null
        0000        null
        0           null
        1-0000      null
        01-01-2020  2020-01-01T00:00:00.000Z
        1-1-2020    2020-01-01T00:00:00.000Z
*/
//добавить в контекст функцию-валидатор даты
router.use((ctx, next) => {
    ctx.getDate = function (formatDate) {
        if (!formatDate) return null;

        let arr = formatDate.split(/\D/g).reverse();

        for (let i = -1; ++i < arr.length;) {
            arr[i] = Number.parseInt(arr[i]);
            if (!arr[i]) {
                if (i === 0) return null; //если год это 0
                arr = arr.slice(0, 1); //если данные такие '1-0-2020' - то надо использовать год, месяц должен начинаться с 1 (хотя при парсинге возвращается 0 в качестве первого месяца)
                break;
            }
            if (arr[i] < 10) arr[i] = '0' + arr[i]; //добавить ведущий 0
        }

        const date = new Date(arr.join('-'));
        if (isNaN(date.getTime())) return null;
        return date;
    }
    return next();
});


//вернуть данные по сотрудникам в виде Excel
router.get('/staffers/excel', toExcel);
//изменение аватара
router.post('/staffer/change_avatar', koaBody, changeAvatar);
//загрузка файлов
router.post('/staffer/upload_file', koaBody, uploadFile);
//скачивание файла
router.get('/staffer/files/:file_name', async ctx => {
    ctx.body = fs.createReadStream(path.join(__dirname, 'scancopy', ctx.params.file_name));
});
//удаление файла
router.del('/staffer/file/:id', delFile);
//список сотрудников
router.get('/staffers', async ctx => {
    ctx.set('content-type', 'text/html');
    // ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/staffers.html'));
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/staffers.html'), (err, html) => {
            res(html);
        });
    });
});
//форма добавления сотрудника
router.get('/staffer/add', async ctx => {
    ctx.set('content-type', 'text/html');
    // ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/staffer_add.html'));
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/staffer_add.html'), (err, html) => {
            res(html);
        });
    });
});
//форма редактирования сотрудника
router.get('/staffer/upd/:id', async ctx => {
    ctx.set('content-type', 'text/html');
    // ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/staffer_add.html'));
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/staffer_add.html'), (err, html) => {
            res(html);
        });
    });
});
//страница сотрудника
router.get('/staffer/:id', async ctx => {
    ctx.set('content-type', 'text/html');
    // ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/staffer.html'));
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/staffer.html'), (err, html) => {
            res(html);
        });
    });
});
//вернуть конкретного сотрудника
router.get('/staff/:id', getStaffer);
// //вернуть всех сотрудников
router.get('/staffer', allStaffers, searchStaffers);
// //добавить сотрудника
router.post('/staffer', koaBody, checkCredentials, addStaffer);
// //редактировать сотрудника
router.put('/staffer/:id', koaBody, checkCredentials, updStaffer);
// //удалить сотрудника
router.del('/staffer/:id', delStaffer);










//список должностей
router.get('/positions', async ctx => {
    ctx.set('content-type', 'text/html');
    // ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/positions.html'));
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/positions.html'), (err, html) => {
            res(html);
        });
    });  
});
//вернуть все должности
router.get('/position', allPositions);
//добавить должность
router.post('/position', koaBody, addPosition);
//редактировать должность
router.put('/position/:id', koaBody, updPosition);
//удалить должность
router.del('/position/:id', delPosition);




//список технических центров
router.get('/techcenters', async ctx => {
    ctx.set('content-type', 'text/html');
    // ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/techcenters.html'));
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/techcenters.html'), (err, html) => {
            res(html);
        });
    });
});
//вернуть все технические центры
router.get('/techcenter', allTechCenter);
//добавить технический центр
router.post('/techcenter', koaBody, addTechCenter);
//редактировать технический центр
router.put('/techcenter/:id', koaBody, updTechCenter);
//удалить технический центр
router.del('/techcenter/:id', delTechCenter);



//графики
router.get('/charts', async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/charts.html'), (err, html) => {
            res(html);
        });
    });
});
//редактировать период
router.put('/chart/period', koaBody, updPeriod);
//добавить период
router.post('/chart/period', koaBody, addPeriod);
//удалить период
router.del('/chart/period/:id', delPeriod);
//получить все графики
router.get('/chart', allCharts);




//delete this code
// const connection = require('@root/libs/connection');
// const BarSchema = new mongoose.Schema({
//     tech: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'TechCenter'
//     },
//     staff: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Staffer'
//     },
//     period: {
//         start: Date,
//         end: Date
//     }
// });
// const Bar = connection.model('Bar', BarSchema);

// router.get('/testdb', async ctx => {
//     const bar = await Bar.find().populate('staff').populate('tech');

//     console.log(bar);

//     ctx.body = { bar };
// });