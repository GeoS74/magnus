const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const {getHandbook, updateHandbookPlaces, updateHandbookStreets, updateHandbookTerminals, calculationQuery, microCalculation, calculation} = require('@transport/controllers/dellineAPI');

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
router.get('/calculator', calculation);


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
}, /*getHandbook,*/ updateHandbookTerminals);









const path = require('path');
const fs = require('fs');
router.get('/test', async ctx => {
    return ctx.body = 'test';
    // const foo = require('./files/test.json');

    // const s = await fs.createReadStream( path.join(__dirname, '/files/test.json'));
    // const s = await fs.readFile( path.join(__dirname, '/files/test.json'));
    // const foo = JSON.parse(s);

    let open = await fs.promises.open(path.join(__dirname, '/files/test.json'));
    const foo = JSON.parse( await open.readFile() );
    await open.close();
    ctx.body = foo.city[0].name;
})
