const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const path = require('path');
// const { getHandbook, updateHandbookPlaces, updateHandbookStreets, updateHandbookTerminals, calculation, searchCity, checkCredentials } = require('@transport/controllers/dellineAPI');
const DelLine = require('@transport/controllers/dellineAPI');
const PEK = require('@transport/controllers/pekAPI');
const { checkCity, checkParameters } = require('@transport/controllers/checkCredentials');

const SSI = require('node-ssi'); //https://www.npmjs.com/package/node-ssi
const ssi = new SSI({
    baseDir: '.',   //file include всегда относятся к baseDir, указанному в опциях
    //virtual include относятся к текущему файлу
    encoding: 'utf-8',
    payload: {}
});

const router = new Router();

router.prefix('/transport');

module.exports.router = router;







//роутинг запросов расчёта стоимости перевозки
router.post('/calculation', koaBody, checkCity, checkParameters, async ctx => {
    try {
        switch (ctx.request.body.carrier) {
            case 'delline': await DelLine.calculation(ctx); break;
        }
    }
    catch (error) {
        ctx.throw(418, error.message);
    }
});
//страница с расчётом стоимости доставки грузов
router.get('/calculator', async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/calculator.html'), (err, html) => {
            res(html);
        });
    });
});





//"ПЭК"
//"ПЭК" - обновление справочника населенных пунктов
router.get('/pek/handbook/places/update', PEK.updateHandbookPlaces);




//"Кит"
// const fetch = require('node-fetch');
const Parser = require('node-dbf').default;
const fetch = require('node-fetch');
// import Parser from 'node-dbf';
router.get('/kit/handbook/places/update', async ctx => {
    https://capi.gtdel.com/1.0/geography/email/get-list
    fetch('https://capi.gtdel.com/1.0/geography/city/get-list?token=' + process.env.KIT)
        .then(async response => {
            const res = await response.json();
            console.log(res.length);
        })
        .catch(error => {
            console.log(error);
        });
    return;

    const parser = new Parser(path.join(__dirname, './files/KLADR.dbf'), { encoding: 'utf-8' });
    parser.on('start', (p) => {
        console.log('dBase file parsing has started');
    });

    parser.on('header', (h) => {
        console.log('dBase file header has been parsed');
    });

    parser.on('record', (record) => {
        console.log(record); // Name: John Smith
    });

    parser.on('end', (p) => {
        console.log('Finished parsing the dBase file');
    });

    parser.parse();
    ctx.body = 'KIT API';
});












//"Деловые Линии"
//поиск населенного пункта
router.post('/search/city', koaBody, DelLine.searchCity);
//"Деловые Линии" - обновление справочника населенных пунктов
router.get('/delline/handbook/places/update', (ctx, next) => {
    ctx.delline = {
        link: 'https://api.dellin.ru/v1/public/places.json',
        fname: 'places.csv',
    }
    return next();
}, DelLine.getHandbook, DelLine.updateHandbookPlaces);
//"Деловые Линии" - обновление справочника улиц
router.get('/delline/handbook/streets/update', (ctx, next) => {
    ctx.delline = {
        link: 'https://api.dellin.ru/v1/public/streets.json',
        fname: 'streets.csv',
    }
    return next();
}, DelLine.getHandbook, DelLine.updateHandbookStreets);
//"Деловые Линии" - обновление справочника терминалов
router.get('/delline/handbook/terminals/update', async (ctx, next) => {
    ctx.delline = {
        link: 'https://api.dellin.ru/v3/public/terminals.json',
        fname: 'terminals.json',
    }
    return next();
}, DelLine.getHandbook, DelLine.updateHandbookTerminals);




function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}



const fs = require('fs');
var dbf = require('dbf-reader').Dbf;
var iconv = require('iconv-lite');

router.get('/test', async ctx => {
    // console.log( path.join(__dirname, '/files/ALTNAMES.DBF'));
    // console.log(dbf);
    let encoder = new TextEncoder();

// let uint8Array = encoder.encode("привет");
// console.log(new TextDecoder('utf8').decode(uint8Array));

    var buffer = fs.readFileSync(path.join(__dirname, '/files/KLADR.DBF'))
    // let open = await fs.promises.open( path.join(__dirname, '/files/KLADRutf8.DBF'));
    //     const buffer =await open.readFile();
    //     await open.close();

    var datatable = dbf.read(buffer);
    if (datatable) {
        datatable.rows.forEach((row) => {
            // let buf = iconv.encode(row.NAME, 'win1251');
            // let str = iconv.decode(buf, 'win1251');
            // console.log("str: ", str);

            console.log(row);

            // let encoder = new TextEncoder();
            // let uint8Array = encoder.encode(row.NAME);
            // console.log(new TextDecoder('utf8').decode(uint8Array)); // 72,101,108,108,111
            // console.log(new TextDecoder('windows-1251').decode(uint8Array)); // 72,101,108,108,111
            // console.log(new TextDecoder('cp866').decode(uint8Array)); // 72,101,108,108,111
            // // console.log(new TextDecoder('KOI-8R').decode(uint8Array)); // 72,101,108,108,111
            // console.log(new TextDecoder('ISO88595').decode(uint8Array)); // 72,101,108,108,111

            // console.log(row);
            console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

            // datatable.columns.forEach((col) => {
            //     console.log(col);
            //     // console.log(row[col.name]);
            //     console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
            // });
        });
    }
    ctx.body = { name: "GeoS" };
})

function foo(ctx) {
    ctx.status = 418;
    ctx.body = { name: "GeoS" };
}
