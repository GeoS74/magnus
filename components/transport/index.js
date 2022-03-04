const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const path = require('path');
const { getHandbook, updateHandbookPlaces, updateHandbookStreets, updateHandbookTerminals, calculationQuery, microCalculation, calculation, searchCity, checkCredentials } = require('@transport/controllers/dellineAPI');

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

//"Деловые Линии" - запрос расчёта стоимости перевозки
router.get('/calculation', calculation);
router.post('/calculation', koaBody, checkCredentials, calculation);
//поиск населенного пункта
router.post('/search/city', koaBody, searchCity);

//"Деловые Линии" - обновление справочника населенных пунктов
router.get('/handbook/places/update', (ctx, next) => {
    ctx.delline = {
        link: 'https://api.dellin.ru/v1/public/places.json',
        fname: 'places.csv',
    }
    return next();
}, getHandbook, updateHandbookPlaces);
//"Деловые Линии" - обновление справочника улиц
router.get('/handbook/streets/update', (ctx, next) => {
    ctx.delline = {
        link: 'https://api.dellin.ru/v1/public/streets.json',
        fname: 'streets.csv',
    }
    return next();
}, getHandbook, updateHandbookStreets);
//"Деловые Линии" - обновление справочника терминалов
router.get('/handbook/terminals/update', async (ctx, next) => {
    ctx.delline = {
        link: 'https://api.dellin.ru/v3/public/terminals.json',
        fname: 'terminals.json',
    }
    return next();
}, getHandbook, updateHandbookTerminals);
//страница с расчётом стоимости доставки грузов
router.get('/calculator', async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/calculator.html'), (err, html) => {
            res(html);
        });
    });
});



function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}




const HandbookPlaces = require('@transport/models/DellineHandbookPlaces')
router.get('/test', async ctx => {
    try {
        // const city = await HandbookPlaces.find({ searchString: "Челябинск" });

        const regexp = new RegExp("^челя");
        const city = await HandbookPlaces.aggregate([
            {
                $match: {
                    // searchString: "Челябинск"
                    searchString: {
                        $regex: regexp, $options: "i"
                    }
                }
            },
            {
                $limit: 2
            }
        ]);
        console.log(city);
        return ctx.body = city;
    } catch (error) {
        console.log(error);
        ctx.throw(418, error.message);
    }
})
