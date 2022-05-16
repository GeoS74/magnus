const passport = require('@user/libs/passport')
const User = require('@user/models/User')
const Session = require('@user/models/Session')
const { v4: uuid } = require('uuid')
const jwt = require('@user/libs/jwt')

//endpoint обновления access-токена и refresh-токена
exports.updateTokens = async ctx => {
    const token = ctx.get('Authorization').split(' ')[1]
    if (!token) return ctx.status = 409

    const refreshToken = uuid();

    const session = await Session.findOneAndUpdate(
        { token: token },
        {
            token: refreshToken,
            lastVisit: new Date()
        },
        { new: true }
    ).populate('user');


    if (!session) return ctx.status = 409

    const accessToken = jwt.sign({
        sid: session.id,
        email: session.user.email,
        rank: session.user.rank,
        exp: Date.now() + 1000 * 60 * 10, //10 минут
    })

    ctx.body = {
        access: accessToken,
        refresh: refreshToken,
    };
}



exports.authorization = async (ctx, next) => {
    const token = ctx.get('Authorization').split(' ')[1]
    if (!token) return next()

    if (!jwt.verify(token)) return next()

    const data = jwt.decode(token)

    console.log(new Date(Date.now()));
    console.log(new Date(data.payload.exp));
    console.log(Date.now() > data.payload.exp);
    if (Date.now() > data.payload.exp) return next()

    const session = await Session.findOneAndUpdate(
        { id: data.payload.sid },
        { lastVisit: new Date() },
        { new: true }
    ).populate('user');

    if (!session) return next()

    ctx.user = session.user;
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


//проверка учётных данных
//если клиент не передаёт учётные данные для авторизации пользователя
//passport вернёт стандартное сообщение об ошибке:
//  {message: 'Missing credentials'}
//из этого сообщения не понятно какое поле не заполнено, поэтому используется этот middleware
//для проверки учётных данных и возврата клиенту адектватного описания ошибки
exports.checkCredentials = (ctx, next) => {
    if (ctx.request.body.email && ctx.request.body.password) return next();
    ctx.status = 400;
    if (!ctx.request.body.email) {
        ctx.body = { path: 'user', message: 'Данные не передаются' };
        return;
    }
    if (!ctx.request.body.password) {
        ctx.body = { path: 'password', message: 'Данные не передаются' };
    }
};
//авторизация пользователя
exports.signin = async (ctx) => {
    await passport.authenticate('local', async (error, user, info) => {
        if (error) throw (error);

        if (!user) {
            ctx.status = 400;
            ctx.body = info;
            return;
        }

        //JWT-токен + refresh-token
        // const tokens = await login(user); //заместо ctx.login(user);
        // ctx.cookies.set('session_id', token, {maxAge: 1*60*1000});
        ctx.body = await login(user);
    })(ctx);
};
//
async function login(user) {
    const refreshToken = uuid();

    await Session.deleteMany({ user: user.id })

    const session = await Session.create({
        user: user.id,
        token: refreshToken,
        lastVisit: new Date()
    });

    const accessToken = jwt.sign({
        sid: session.id,
        email: user.email,
        rank: user.rank,
        exp: Date.now() + 1000 * 60 * 10, //10 минут
    })

    return {
        access: accessToken,
        refresh: refreshToken,
    };
}

//завершение сессии
exports.signout = async ctx => {
    const token = ctx.get('Authorization').split(' ')[1]

    if (!token) return ctx.status = 401

    if (!jwt.verify(token)) return ctx.status = 401

    const data = jwt.decode(token)

    await Session.deleteMany({ id: data.payload.sid });

    ctx.body = 'session delete'
}


//регистрация пользователя
exports.signup = async (ctx) => {
    try {
        const user = new User({
            email: ctx.request.body.email,
            displayName: ctx.request.body.displayName.trim() || undefined,
        });
        await user.setPassword(ctx.request.body.password);
        await user.save();

        ctx.status = 201;
        ctx.body = { user_id: user.id };
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