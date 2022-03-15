const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const path = require('path');
// const { getHandbook, updateHandbookPlaces, updateHandbookStreets, updateHandbookTerminals, calculation, searchCity, checkCredentials } = require('@transport/controllers/dellineAPI');
const DelLine = require('@transport/controllers/dellineAPI');
const Pek = require('@transport/controllers/pekAPI');
const Kit = require('@transport/controllers/kitAPI');
const Cdek = require('@transport/controllers/cdekAPI');
const mainHandbookPlaces = require('@transport/controllers/mainHandbookPlaces');
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



//поиск населенного пункта
router.post('/search/city', koaBody, mainHandbookPlaces.searchCity);



//роутинг запросов расчёта стоимости перевозки
router.post('/calculation', koaBody, checkCity, checkParameters, async ctx => {
    try {
        switch (ctx.request.body.carrier) {
            case 'delline': await DelLine.calculation(ctx); break;
            case 'kit': await Kit.calculation(ctx); break;
            case 'pek': await Pek.calculation(ctx); break;
            case 'cdek': await Cdek.calculation(ctx); break;
        }
    }
    catch (error) {
        console.log('~~~~~~~~~~~~~calculation Error catcher~~~~~~~~~~~~~');
        console.log(error.message);
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




//"СДЭК" - обновление справочника населенных пунктов
router.get('/cdek/handbook/places/update', Cdek.getJWToken, Cdek.updateHandbookPlaces);


//"ПЭК" - обновление справочника населенных пунктов
router.get('/pek/handbook/places/update', Pek.updateHandbookPlaces);


//"Кит" - обновление справочника населенных пунктов
router.get('/kit/handbook/places/update', Kit.updateHandbookPlaces);


//"Деловые Линии"
//поиск населенного пункта
// router.post('/search/city', koaBody, DelLine.searchCity);
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


//обновление основного справочника населенных пунктов системы, основанного на данных КЛАДР
router.get('/handbook/places/update', mainHandbookPlaces.update);





function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}




const fetch = require('node-fetch');
router.get('/test', async ctx => {
    ctx.body = { name: "GeoS" };
})

function foo(ctx) {
    ctx.status = 418;
    ctx.body = { name: "GeoS" };
}
