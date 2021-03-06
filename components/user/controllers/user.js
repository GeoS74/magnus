const passport = require('@user/libs/passport')
const User = require('@user/models/User')
const Session = require('@user/models/Session')
const { v4: uuid } = require('uuid')
const jwt = require('@user/libs/jwt')
const config = require('@root/config')
const sendMail = require('@root/libs/sendMail')

//изменение пароля
exports.changePass = async (ctx, next) => {
    const token = ctx.request.body.token
    if(!token) return ctx.status = 400

    const user = await User.findOne({recoveryToken: token})
    
    if(!user) return ctx.status = 400;

    await user.setPassword(ctx.request.body.password);
    user.recoveryToken = undefined

    await user.save()

    ctx.user = user
    return next()
}

//восстановление пароля
exports.forgot = async ctx => {
    try {
        const token = uuid()

        const user = await User.findOne({email: ctx.request.body.email})
        //в случае отсутствия пользователя с указанным email не стоит подсказывать, что такого пользователя нет в системе
        //клиент должен думать, что письмо для сброса пароля отправлено
        if(!user) return ctx.status = 200;
        //то же самое происходит если токен для смены пароля уже запрашивался
        // if(user.recoveryToken) return ctx.status = 200;


        user.recoveryToken = token;
        await user.save();

        await sendMail({
            from: config.mailer.user,
            to: ctx.request.body.email,
            subject: 'Сброс пароля',
            html: `Кто-то запросил восстановление пароля на сайте ${config.server.host},
            если это не Вы, то просто проигнорируйте это письмо.<br>
            Для сброса пароля перейдите по ссылке:<br>
            <a href="http://${config.server.host}/user/forgot/${token}">${config.server.host}/user/confirm/${token}</a>`
        })

        ctx.status = 200;
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            ctx.status = 400;
            if (error.errors.email) {
                if (error.errors.email.kind === 'user defined') {
                    ctx.body = { path: 'user', message: 'Не корректный email' };
                }
                else ctx.body = { path: 'user', message: 'Такой email уже есть' };
                return;
            }
        } else throw error;
    }
}


exports.me = async ctx => {
    const token = ctx.get('Authorization').split(' ')[1]
    const data = jwt.decode(token)
    const user = await User.findOne({ email: data.payload.email });
    ctx.body = {
        id: user.id,
        email: user.email,
        rank: user.rank,
    }
}

//установить токены в куки и в заголовок ответа
exports.refreshSession = async ctx => {
    console.log('refreshSession')

    const tokens = await login(ctx.user); //заместо ctx.login(user);
    //вызов login(...) создаёт новую сессию в БД
    //завершить сессию, по которой пользователь был залогинен
    if(ctx.refreshToken) {
        await Session.deleteOne({token: ctx.refreshToken})
    }

    ctx.cookies.set('sid', tokens.refresh, {
        // domain: 'localhost',
        maxAge: config.session.expiry * 1000, //ms
        secure: config.cookie.secure, //логическое значение, указывающее, должен ли файл cookie отправляться только через HTTPS ( false по умолчанию для HTTP, true по умолчанию для HTTPS).
        httpOnly: true, //если false - куки доступен для клиентского JS
        //логическое значение или строка, указывающая, является ли файл cookie файлом cookie «того же сайта» ( falseпо умолчанию)
        //sameSite работает только в Chrome и Firefox
        sameSite: true,
        overwrite: true, //логическое значение, указывающее, перезаписывать ли ранее установленные файлы cookie с тем же именем ( falseпо умолчанию).
    })
    ctx.set('jwt-token', tokens.access)
    ctx.status = 200
}

exports.accessControl = async (ctx, next) => {
    const token = ctx.get('Authorization').split(' ')[1]

    if (!token) return next();
    if (!jwt.verify(token)) return next();

    const data = jwt.decode(token)

    if (Date.now() > data.payload.exp) return next();

    ctx.access = true;
    return next();
}

exports.authorization = async (ctx, next) => {
    const token = ctx.cookies.get('sid');
    if (!token) return next()

    const session = await Session.findOneAndUpdate(
        { token: token },
        { lastVisit: new Date() },
        { new: true }
    ).populate('user');

    if (!session) return next()

    ctx.user = session.user;
    ctx.refreshToken = token;
    return next();
};

// exports.authorization = async (ctx, next) => {
//     const token = ctx.cookies.get('session_id');
//     if(!token) return next();

//     const session = await Session.findOneAndUpdate(
//         {token: token},
//         {lastVisit: new Date()},
//         {new: true}
//     ).populate('user');

//     if(!session) ctx.throw(401, 'bad authorized token');

//     ctx.user = session.user;
//     return next();
// };


//авторизация пользователя
exports.signin = async (ctx, next) => {
    await passport.authenticate('local', async (error, user, info) => {
        if (error) throw (error);

        if (!user) {
            ctx.status = 400;
            ctx.body = info;
            return;
        }

        ctx.user = user;
        // return this.refreshSession.call(null, ctx)
        return next()
    })(ctx);
};

//сбросить токен изменения для пароля (recoveryToken) если он есть у пользователя
exports.clearRecoveryToken = async (ctx, next) => {
    if(!ctx.user.recoveryToken) return next()

    ctx.user.recoveryToken = undefined
    await ctx.user.save()
    return next()
}


//создать токены + записать сессию в БД
async function login(user) {
    //ограничение на кол-во одновременных сессий одного пользователя
    const sessions = await Session.find({ user: user.id })
    if(sessions.length === config.session.maxCount) {
        await Session.deleteMany({ user: user.id })
    }

    const refreshToken = uuid();

    const accessToken = jwt.sign({
        email: user.email,
        rank: user.rank,
        exp: Date.now() + config.jwt.expiry, //10 минут
    })

    await Session.create({
        user: user.id,
        token: refreshToken,
        lastVisit: new Date()
    });

    return {
        access: accessToken,
        refresh: refreshToken,
    };
}

//завершение сессии
exports.signout = async ctx => {
    //выйти из всех сессий одновременно
    //await Session.deleteMany({ user: ctx.user.id })
    //завершить сессию, по которой пользователь залогинен
    await Session.deleteOne({token: ctx.refreshToken})

    //запрет кеширования устанавливается в этом роутере для всех путей
    // ctx.set('Cache-Control', 'no-cache')
    ctx.status = 301
    ctx.redirect('/')
}


//регистрация пользователя
exports.signup = async (ctx) => {
    try {
        const token = uuid()
        const user = new User({
            email: ctx.request.body.email,
            displayName: ctx.request.body.displayName.trim() || undefined,
            verificationToken: token,
        });
        await user.setPassword(ctx.request.body.password);
        await user.save();

        await sendMail({
            from: config.mailer.user,
            to: user.email,
            subject: 'Подтверждение email',
            html: `Вы зарегестрировались на ${config.server.host},
            для подтверждения регистрации перейдите по ссылке:<br>
            <a href="http://${config.server.host}/user/confirm/${token}">${config.server.host}/user/confirm/${token}</a>`
        })

        ctx.status = 201;
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            ctx.status = 400;
            if (error.errors.email) {
                if (error.errors.email.kind === 'user defined') {
                    ctx.body = { path: 'user', message: 'Не корректный email' };
                }
                else ctx.body = { path: 'user', message: 'Такой email уже есть' };
                return;
            }
            if (error.errors.displayName) {
                if (error.errors.displayName.kind === 'user defined') {
                    ctx.body = { path: 'displayName', message: 'Не корректное значение' };
                }
                else ctx.body = { path: 'displayName', message: 'Такое имя уже есть' }
            }
        } else throw error;
    }
};


//подтверждение email
exports.confirm = async ctx => {
    const token = JSON.parse(ctx.request.body).token
    if(!token) return ctx.status = 400

    const user = await User.findOne({verificationToken: token})
    
    if(!user) return ctx.status = 400;

    user.verificationToken = undefined

    await user.save()

    ctx.status = 200;
}









function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}









//пример подтверждения email пользователя
// module.exports.register = async (ctx, next) => {
//     const token = uuid();

//     const user = await new User({
//         email: ctx.request.body.email,
//         displayName: ctx.request.body.displayName,
//         verificationToken: token
//     });

//     await user.setPassword(ctx.request.body.password);
//     await user.save();
    
//     await sendMail({
//         template: 'confirmation',
//         locals: {token: user.verificationToken},
//         to: user.email,
//         subject: 'Подтвердите почту',
//         });
    
//     ctx.body = {status: 'ok'};
// };

// module.exports.confirm = async (ctx, next) => {
//     const user = await User.findOne({verificationToken: ctx.request.body.verificationToken});

//     if(!user) ctx.throw(400, 'Ссылка подтверждения недействительна или устарела');

//     user.verificationToken = undefined;
//     await user.save();

//     const token = await ctx.login(user);

//     ctx.body = {token: token};
// };






//ошибки mongoose
//https://mongoosejs.com/docs/api/error.html#error_Error-messages

//авторизация пользователя
//https://habr.com/ru/post/201206/











// exports.allUsers = async (ctx) => {
//     const user = await User.find();
//     if(!user){
//         ctx.status = 404;
//         ctx.body = {error: 'User not found'};
//         return;
//     }

//     ctx.body = user;
// };

// exports.userById = async (ctx) => {
//     const user = await User.findOne({_id: ctx.params.id});
//     if(!user){
//         ctx.status = 404;
//         ctx.body = {error: 'User not found'};
//         return;
//     }

//     ctx.body = user;
// };



// exports.updateUser = async (ctx) => {
//     const user = await User.findOneAndUpdate(
//         {_id: ctx.params.id},
//         {
//             email: ctx.request.body.email,
//             pass: ctx.request.body.pass,
//         },
//         {new: true});
//     if(!user){
//         ctx.status = 404;
//         ctx.body = {error: 'User not found'};
//         return;
//     }

//     ctx.body = user;
// };