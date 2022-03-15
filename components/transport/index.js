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
    let str = '7400000100000';
    console.log(str.slice(0,2));
    // await fetch('https://kit.cdek-calc.ru/api/?weight=100&width=150&length=200&height=200&from=1002&to=44&contract=2&pay_to=1&tariffs=1,136&insurance=1000&cost=0', {
    // // await fetch('https://api.cdek.ru/v2/location/cities/?country_codes=RU,TR&page=3&size=1', {
    // // await fetch('https://api.edu.cdek.ru/v2/oauth/token?grant_type=client_credentials&client_id=EMscd6r9JnFiQ3bLoyjJY6eM78JrJceI&client_secret=PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG', {
    //     headers: { 
    //         // 'Content-Type': 'application/json' 
    //         // Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJvcmRlcjphbGwiLCJwYXltZW50OmFsbCJdLCJleHAiOjE2NDcyNjYxMTUsImF1dGhvcml0aWVzIjpbInNoYXJkLWlkOnJ1LTAxIiwiZnVsbC1uYW1lOtCi0LXRgdGC0LjRgNC-0LLQsNC90LjQtSDQmNC90YLQtdCz0YDQsNGG0LjQuCDQmNCcLCDQntCR0KnQldCh0KLQktCeINChINCe0JPQoNCQ0J3QmNCn0JXQndCd0J7QmSDQntCi0JLQldCi0KHQotCS0JXQndCd0J7QodCi0KzQriIsImNvbnRyYWN0OtCY0Jwt0KDQpC3Qk9Cb0JMtMjIiLCJhY2NvdW50LWxhbmc6cnVzIiwiYWNjb3VudC11dWlkOmU5MjViZDBmLTA1YTYtNGM1Ni1iNzM3LTRiOTljMTRmNjY5YSIsImFwaS12ZXJzaW9uOjEuMSIsImNsaWVudC1pZC1lYzU6ZWQ3NWVjZjQtMzBlZC00MTUzLWFmZTktZWI4MGJiNTEyZjIyIiwiY2xpZW50LWlkLWVjNDoxNDM0ODIzMSIsImNvbnRyYWdlbnQtdXVpZDplZDc1ZWNmNC0zMGVkLTQxNTMtYWZlOS1lYjgwYmI1MTJmMjIiLCJzb2xpZC1hZGRyZXNzOmZhbHNlIiwiY2xpZW50LWNpdHk60J3QvtCy0L7RgdC40LHQuNGA0YHQuiwg0J3QvtCy0L7RgdC40LHQuNGA0YHQutCw0Y8g0L7QsdC7LiJdLCJqdGkiOiJiMDc4ZGFhMi1lZmIzLTRjNGEtOThiMC0wZDM0YjhhZTc0OTMiLCJjbGllbnRfaWQiOiJFTXNjZDZyOUpuRmlRM2JMb3lqSlk2ZU03OEpySmNlSSJ9.Gva54c3_6hyY1ND3GTx2lPthTLQspCxJzvo7MXLNAXBDUYxH0faHHhoa9vzKPRP5mfYkcP-lzA9p-mn3rLihNkX3x0MKw6IQWbz7wTdWjwxpY6NeA3OjR0Z30USW-ykWwx2g7rZb9fAKyNI7cjXZZdQnPwz8jQqdU0xVYh4pXkg31R6PkU40EhoOo0G5p0a1L6K9Z7Ncbd32dagZHX47XilbcgjlQ4SopfrG8a5AJMeV20aP6QLerpwrphqF4D7CvgE7BPtyRZ9ba7i4NsFZ9_EzmzA9V8LPA-VcpzxmlMvelqMhhzeNitmOpAUUxLUwkcX0qrqhjN8vZxJyAv9pPw'
    //     },
    //     method: 'GET',
    // })
    //     .then(async response => {
    //         if (response.ok) {
    //             const res = await response.json();

    //             console.log(res);
    //             // for(const f of res) {
    //             //     console.log(f.city + ' ' + f.region);
    //             // }
    //         }
    //         else {
    //             const res = await response.json();
    //             console.log(res);

    //             throw new Error(`Error fetch query - status: ${response.status}`);
    //         }
    //     })
    //     .catch(err => {
    //         console.log(err);
    //     });

    ctx.body = { name: "GeoS" };
})

function foo(ctx) {
    ctx.status = 418;
    ctx.body = { name: "GeoS" };
}
