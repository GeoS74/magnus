const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const path = require('path');
const DelLine = require('@transport/controllers/dellineAPI');
const Pek = require('@transport/controllers/pekAPI');
const Kit = require('@transport/controllers/kitAPI');
const Cdek = require('@transport/controllers/cdekAPI');
const Baikal = require('@transport/controllers/baikalAPI');
const Boxberry = require('@transport/controllers/boxberryAPI');
const Jeldor = require('@transport/controllers/jeldorAPI');
const Pochta = require('@transport/controllers/pochtaAPI');
const Luch = require('@transport/controllers/luchAPI');
const Energy = require('@transport/controllers/energyAPI');
const mainHandbookPlaces = require('@transport/controllers/mainHandbookPlaces');
const { checkCity, checkParameters } = require('@transport/controllers/checkCredentials');
const { counter } = require('@transport/controllers/metrics');

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
router.post('/calculation', koaBody, counter, checkCity, checkParameters, async ctx => {
    try {
        switch (ctx.request.body.carrier) {
            case 'delline': await DelLine.calculation(ctx); break;
            case 'kit': await Kit.calculation(ctx); break;
            case 'pek': await Pek.calculation(ctx); break;
            case 'cdek': await Cdek.calculation(ctx); break;
            case 'baikal': await Baikal.calculation(ctx); break;
            case 'boxberry': await Boxberry.calculation(ctx); break;
            case 'jeldor': await Jeldor.calculation(ctx); break;
            case 'pochta': await Pochta.calculation(ctx); break;
            case 'luch': await Luch.calculation(ctx); break;
            case 'energy': await Energy.calculation(ctx); break;
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


//"Энергия" - обновление справочника населенных пунктов
router.get('/energy/handbook/places/update', Energy.updateHandbookPlaces);

//"Луч" - обновление справочника населенных пунктов
router.get('/luch/handbook/places/update', Luch.updateHandbookPlaces);

//"СДЭК" - обновление справочника населенных пунктов
router.get('/cdek/handbook/places/update', Cdek.getJWToken, Cdek.updateHandbookPlaces);

//"ПЭК" - обновление справочника населенных пунктов
router.get('/pek/handbook/places/update', Pek.updateHandbookPlaces);

//"Кит" - обновление справочника населенных пунктов
router.get('/kit/handbook/places/update', Kit.updateHandbookPlaces);

//"Байкал" - обновление справочника населенных пунктов
router.get('/baikal/handbook/places/update', Baikal.updateHandbookPlaces);

//"ЖелДорЭкспедиция" - обновление справочника населенных пунктов
router.get('/jeldor/handbook/places/update', Jeldor.updateHandbookPlaces);

//"Boxberry" - обновление справочника населенных пунктов
router.get('/boxberry/handbook/places/update', Boxberry.updateHandbookPlaces);
//"Boxberry" - обновление справочника пунктов выдачи
router.get('/boxberry/handbook/outputPoints/update', Boxberry.updateHandbookOutputPoints);
//"Boxberry" - обновление справочника пунктов приёма
router.get('/boxberry/handbook/inputPoints/update', Boxberry.updateHandbookInputPoints);

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
const FormData = require('form-data');
router.get('/test', async ctx => {


    await fetch(`https://api2.nrg-tk.ru/v2/cities`, {
        headers: {
            // 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Content-Type': 'application/x-www-form-urlencoded',
            // 'Cookie:': 'WhiteCallback_timeAll=9; WhiteCallback_timePage=9',
            // 'Referer:': 'https://zhdalians.ru/calculator/?__cf_chl_tk=Y9HGSW..Kw5b_bi1moL3dmdqOLgOJUNm4GKRRfKcLBg-1649686405-0-gaNycGzNCZE',
        },
        // redirect: 'follow',
        // credentials: 'some-origin', //include
        method: 'GET',
        // mode: 'no-cors',
        // body: JSON.stringify(obj)
        // body: fd
    })
        .then(async response => {
            const res = await response.json();
            console.log(response.status);
            console.log(res);

        })
        .catch(error => {
            console.log(error);
        });


    ctx.body = { name: "GeoS" };
})
