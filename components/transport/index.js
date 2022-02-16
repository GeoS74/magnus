const Router = require('koa-router');
const koaBody = require('@root/libs/koaBody');
const {getHandbookSettlements, updateHandbookSettlements} = require('@transport/controllers/dellineAPI');

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

router.get('/handbook/settlements', /*getHandbookSettlements,*/ updateHandbookSettlements);
