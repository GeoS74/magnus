const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const csrf = require('@root/libs/csrf-protect');
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
const MagicTrans = require('@transport/controllers/magictransAPI');
const mainHandbookPlaces = require('@transport/controllers/mainHandbookPlaces');
const { checkCity, checkParameters } = require('@transport/controllers/checkCredentials');
const { counter, carrierCounter } = require('@transport/controllers/metrics');

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


const pageRouter = new Router();
module.exports.pageRouter = pageRouter;
//главная страница
pageRouter.get('/', async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.set('cache-control', 'public, max-age=604800'); //кэширование на неделю
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/main.html'), (err, html) => {
            if (err) {
                console.log(err);
                return;
            }
            res(html);
        });
    });
});




//поиск населенного пункта
router.post('/search/city', csrf.checkCSRFToken, koaBody, mainHandbookPlaces.searchCity);


//роутинг запросов расчёта стоимости перевозки
router.post('/calculation', csrf.checkCSRFToken, koaBody, counter, checkCity, checkParameters, async ctx => {
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
            case 'magictrans': await MagicTrans.calculation(ctx); break;
        }
    }
    catch (error) {
        console.log('~~~~~~~~~~~~~calculation Error catcher~~~~~~~~~~~~~');
        console.log(error.message);
        ctx.throw(418, error.message);
    }
});
//страница с расчётом стоимости доставки грузов
router.get('/calculator', csrf.setCSRFToken, async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/calculator.html'), (err, html) => {
            if (err) {
                console.log(err);
                return;
            }
            res(html);
        });
    });
});



//статистика
router.get('/metrics/counter/carrier', carrierCounter);
//страница со статистикой
router.get('/metrics/counter', async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/metricscounter.html'), (err, html) => {
            if (err) {
                console.log(err);
                return;
            }
            res(html);
        });
    });
});



//"Magic Trans" - обновление справочника населенных пунктов
router.get('/magictrans/handbook/places/update', MagicTrans.updateHandbookPlaces);

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
//"ЖелДорЭкспедиция" - обновление справочника терминалов
router.get('/jeldor/handbook/terminals/update', Jeldor.updateHandbookTerminals);


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
    console.log(__dirname);

    // await fetch(`https://newssearch.yandex.ru/news/search?from=tabbar&text=%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%B5%D1%80%D0%B5%D0%B2%D0%BE%D0%B7%D0%BA%D0%B8%20%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D0%B8`, {
    //     headers: {
    //         // 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //         // 'Cookie:': 'WhiteCallback_timeAll=9; WhiteCallback_timePage=9',
    //         // 'Referer:': 'https://zhdalians.ru/calculator/?__cf_chl_tk=Y9HGSW..Kw5b_bi1moL3dmdqOLgOJUNm4GKRRfKcLBg-1649686405-0-gaNycGzNCZE',
    //     },
    //     // redirect: 'follow',
    //     // credentials: 'some-origin', //include
    //     method: 'GET',
    //     // mode: 'no-cors',
    //     // body: JSON.stringify(obj)
    //     // body: fd
    // })
    //     .then(async response => {
    //         const res = await response.text();
    //         console.log(response.status);
    //         console.log(res);

    //     })
    //     .catch(error => {
    //         console.log(error);
    //     });


    ctx.body = { name: "GeoS" };
})






const { JSDOM } = require('jsdom');
router.get('/news', async ctx => {
    await fetch(`https://newssearch.yandex.ru/news/search?from=tabbar&text=%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%B5%D1%80%D0%B5%D0%B2%D0%BE%D0%B7%D0%BA%D0%B8%20%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D0%B8`, {
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
            // const res = await response.text();
            // console.log(response.status);
            // console.log(res);
            // ctx.body = newsParse(await response.arrayBuffer());
            ctx.body = newsParse(await response.text());
        })
        .catch(error => {
            console.log(error);
        });
})

function newsParse(buff) {
    const dom = new JSDOM(buff, {
        contentType: "text/html",
    });
    const nodes = dom.window.document.querySelectorAll('.news-search-story');

    const news = [];
    for (const n of nodes) {
        const snippets = n.querySelectorAll('.mg-snippet__wrapper');

        for (const s of snippets) {
            news.push({
                title: s.querySelector('h3 > a').text,
                description: s.querySelector('.mg-snippet__content > a').text,
                link: s.querySelector('.mg-snippet__content > a').href,
            })
        }
    }

    return news;
}
