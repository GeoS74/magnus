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
            // case 'delline': await DelLine.calculation(ctx); break;
            // case 'kit': await Kit.calculation(ctx); break;
            // case 'pek': await Pek.calculation(ctx); break;
            // case 'cdek': await Cdek.calculation(ctx); break;
            // case 'baikal': await Baikal.calculation(ctx); break;
            // case 'boxberry': await Boxberry.calculation(ctx); break;
            // case 'jeldor': await Jeldor.calculation(ctx); break;
            // case 'pochta': await Pochta.calculation(ctx); break;
            case 'luch': await Luch.calculation(ctx); break;
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
router.get('/test', async ctx => {
    const obj = {
        order: {
            b_pickup: false,
            b_delivery: false,
            city_from: "Челябинск",
            t_waiting_pickup: "0",
            t_waiting_delivery: "0",
            city_to: "Абзаково",
            value_order: 100, 
            cash_on_delivery:0, 
            repurchase:0,
            b_return_docs:false, 
            cargos: [
                {
                    diameter_load: 0,
                    length_load: 0.5,
                    width_load: 0.5,
                    height_load: 0.5, 
                    mass_load: 10,
                    number_of_identical_load: 1, 
                    b_box_30x30x30: false, 
                    b_box_50x50x50 :false,
                    b_box_250x180x100: false, 
                    b_box_380x300x230: false, 
                    b_hot_box: false, 
                    b_lathing: false, 
                    b_namatrasnik_220x140x40: false, 
                    b_namatrasnik_220x220x40: false, 
                    b_palleting: false, 
                    b_poddoning: false, 
                    b_stretch_film: false, 
                    b_tire: false
                }]
        },
        from_order:"order_from_web"};



    await fetch(`https://api.tk-luch.ru/api_calc_for_test`, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        // mode: 'no-cors',
        body: 'json_order='+encodeURIComponent(JSON.stringify(obj))
        // body: JSON.stringify(obj)
    })
        .then(async response => {
            const res = await response.json();
            console.log(response.status);
            console.log(res);

            // for(let key in res) {
            //     console.log(key);
            // }
        })
        .catch(error => {
            console.log(error);
        });
    ctx.body = { name: "GeoS" };
})
