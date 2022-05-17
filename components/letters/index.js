const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const koaBody = require('@root/libs/koaBody');
const router = new Router();
const {manyCreate, objectIdValidator, allThemas, addThema, searchThemas, addLetter} = require('@letters/controllers/letters');
const user = require('@user/controllers/user');
const mustBeAuthenticated = require('@root/libs/mustBeAuthenticated');
const mustHaveAccess = require('@root/libs/mustHaveAccess');
const csrf = require('@root/libs/csrf-protect');

// const authorization = require('@user').authorization;

const SSI = require('node-ssi'); //https://www.npmjs.com/package/node-ssi
const ssi = new SSI({
        baseDir: '.',   //file include всегда относятся к baseDir, указанному в опциях
                        //virtual include относятся к текущему файлу
        encoding: 'utf-8',
        payload: {}
    });

module.exports.router = router;
 
router.get('/letters', async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/letters.html'), (err, html) => {
            res(html);
        });
    });
});
//download scan-copy file
router.get('/letters/files/:file_name', async ctx => {
    ctx.body = fs.createReadStream(path.join(__dirname, 'scancopy', ctx.params.file_name));
});
router.get('/themas', objectIdValidator, allThemas, searchThemas);
//router.get('/themas/search', searchThemas);
router.post('/letter', user.authorization, mustBeAuthenticated, koaBody, addLetter);
router.post('/thema', user.authorization, mustBeAuthenticated, koaBody, addThema);
// router.put('/thema/:id', koaBody, allLetter);
// router.del('/letter/:id', allLetter);
