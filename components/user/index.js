const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const koaBody = require('@root/libs/koaBody');
const mustBeAuthenticated = require('@root/libs/mustBeAuthenticated');
const {signin, checkCredentials, signup, authorization} = require('@user/controllers/user');
const csrf = require('@root/libs/csrf-protect');
const router = new Router();

const SSI = require('node-ssi'); //https://www.npmjs.com/package/node-ssi
const ssi = new SSI({
        baseDir: '.',   //file include всегда относятся к baseDir, указанному в опциях
                        //virtual include относятся к текущему файлу
        encoding: 'utf-8',
        payload: {}
    });

module.exports.router = router;
module.exports.authorization = authorization;


router.prefix('/user');

//страница входа
router.get('/login', csrf.setCSRFToken, async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/loginform.html'), (err, html) => {
            res(html);
        });
    });
});
//страница регистрации
router.get('/registrate', csrf.setCSRFToken, async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/registrationform.html'), (err, html) => {
            res(html);
        });
    });
})
//регистрация пользователя
router.post('/signup', csrf.checkCSRFToken, koaBody, checkCredentials, signup);
//авторизация пользователя
router.post('/signin', csrf.checkCSRFToken, koaBody, checkCredentials, signin);
//signout
router.get('/logout', koaBody, ctx => ctx.throw(400, 'Not implemented'));
//страница пользователя
router.get('/page', authorization, mustBeAuthenticated, async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/userpage.html'), (err, html) => {
            res(html);
        });
    });
});

