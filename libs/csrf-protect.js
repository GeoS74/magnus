const {v4: uuid} = require('uuid');
const connection = require('@root/libs/connection');
const mongoose = require('mongoose');
const maxAgeToken = 1000 * 60;

const schema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    // refreshToken: {
    //     type: String,
    //     required: true,
    //     unique: true
    // },
    lastVisit: {
        type: Date,
        required: true,
        default: Date.now(),
        index: {
            expires: maxAgeToken,
        }
    }
});
// schema.path('lastVisit').index({expires: '1m'});

const CSRFTokens = connection.model('CSRFTokens', schema);

exports.createToken = async (ctx, next) => {
    try{
        const token = uuid();

        ctx.cookies.set('CSRF-TOKEN', token, {
            maxAge: maxAgeToken, //ms
            // secure: true, //логическое значение, указывающее, должен ли файл cookie отправляться только через HTTPS ( false по умолчанию для HTTP, true по умолчанию для HTTPS).
            httpOnly: true, //если false - куки доступен для клиентского JS
            //логическое значение или строка, указывающая, является ли файл cookie файлом cookie «того же сайта» ( falseпо умолчанию)
            //sameSite работает только в Chrome
            sameSite: true,
            overwrite: true, //логическое значение, указывающее, перезаписывать ли ранее установленные файлы cookie с тем же именем ( falseпо умолчанию).
        })

        await CSRFTokens.create({
            token: token,
            // refreshToken: uuid(),
        })

        await next();
    }
    catch(error) {
        ctx.throw(403, error.message);
    }
}

exports.checkToken = async (ctx, next) => {
    const token = ctx.cookies.get('CSRF-TOKEN')
    // const token = ctx.get('CSRF-TOKEN');

    if(!token) {
        ctx.throw(409, '409 bad token')
    }
    
    const checkinToken = await CSRFTokens.findOne({token: token});
    if(!checkinToken) {
        ctx.throw(403, '403 bad token')
    }
    
    await next();
}