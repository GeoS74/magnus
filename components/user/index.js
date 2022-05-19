const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const koaBody = require('@root/libs/koaBody');
const mustBeAuthenticated = require('@root/libs/mustBeAuthenticated');
const mustHaveAccess = require('@root/libs/mustHaveAccess');
const {changePass, forgot, confirm, signin, signup, signout, authorization, accessControl, refreshSession, me} = require('@user/controllers/user');
const {checkEmail, checkPassword} = require('@user/controllers/credentials')
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
router.get('/page', authorization, mustBeAuthenticated, csrf.setCSRFToken, async ctx => {
    ctx.set('content-type', 'text/html');
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/userpage.html'), (err, html) => {
            res(html);
        });
    });
})
//страница восстановления пароля
router.get('/forgot', csrf.setCSRFToken, async ctx => {
    ctx.set('content-type', 'text/html')
    ctx.body = await new Promise(res => {
        ssi.compileFile(path.join(__dirname, 'client/tpl/forgotform.html'), (err, html) => {
            res(html);
        })
    })
})
//страница изменения пароля
router.get('/forgot/:token', csrf.setCSRFToken, ctx => {
    ctx.set('content-type', 'text/html')
    ctx.body = fs.createReadStream(path.join(__dirname, 'client/tpl/changePassword.html'))
})
 

//завершение сессии
router.get('/logout', authorization, mustBeAuthenticated, signout)
//регистрация пользователя
router.post('/signup', csrf.checkCSRFToken, koaBody, checkEmail, checkPassword, signup)
//авторизация пользователя
router.post('/signin', csrf.checkCSRFToken, koaBody, checkEmail, checkPassword, signin)
//данные пользователя
router.get('/me', /*csrf.checkCSRFToken,*/ accessControl, mustHaveAccess, me)
//перевыпуск токенов + обновлении сессии
//jwt-токен на этом маршруте не проверяется
router.get('/refreshSession', authorization, mustBeAuthenticated, refreshSession)
//подтверждение email
router.post('/confirm', csrf.checkCSRFToken, koaBody, confirm)
//запрос восстановление пароля
router.post('/forgot', csrf.checkCSRFToken, koaBody, checkEmail, forgot)
//изменение пароля
router.post('/forgot/changePassword', csrf.checkCSRFToken, koaBody, checkPassword, changePass, refreshSession)
