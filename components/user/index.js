const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const koaBody = require('@root/libs/koaBody');
const mustBeAuthenticated = require('@root/libs/mustBeAuthenticated');
const mustHaveAccess = require('@root/libs/mustHaveAccess');
const {confirm, signin, checkCredentials, signup, signout, authorization, accessControl, refreshSession, me} = require('@user/controllers/user');
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
// module.exports.authorization = authorization;

router.prefix('/user');

//запрет кешировать все ответы этой компоненты
router.use((ctx, next) => {
    ctx.set('Cache-Control', 'no-cache')
    return next();
})

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
//страница подтверждения email
router.get('/confirm/:token', csrf.setCSRFToken, ctx => {
    ctx.set('content-type', 'text/html')
    ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/confirm.html'))
})
//страница пользователя
router.get('/page', authorization, mustBeAuthenticated, async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/userpage.html'), (err, html) => {
            res(html);
        });
    });
})
 

//завершение сессии
router.get('/logout', authorization, mustBeAuthenticated, signout);
//регистрация пользователя
router.post('/signup', csrf.checkCSRFToken, koaBody, checkCredentials, signup);
//авторизация пользователя
router.post('/signin', csrf.checkCSRFToken, koaBody, checkCredentials, signin);
//данные пользователя
router.get('/me', accessControl, mustHaveAccess, me)
//перевыпуск токенов + обновлении сессии
router.get('/refreshSession', authorization, mustBeAuthenticated, refreshSession);
//подтверждение email
router.post('/confirm', csrf.checkCSRFToken, koaBody, confirm);