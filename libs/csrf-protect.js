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
    const token = await CSRFTokens.create({
        token: uuid(),
        // refreshToken: uuid(),
    })
    ctx.cookies.set('csrf-token', token.token, {
        maxAge: maxAgeToken, //ms
        // httpOnly: false, //если false - куки доступен для клиентского JS
    })
    // ctx.cookies.set('csrf-refresh-token', token.token, {
    //     maxAge: maxAgeToken, //ms
    // })
    // ctx.set('csrf-token', token.token);
    // ctx.csrftoken = token.token;
    await next();
}

exports.checkToken = async (ctx, next) => {
    const token = ctx.cookies.get('csrf-token')
    // const token = ctx.get('csrf-token');

    if(!token) {
        ctx.throw(403, 'bad token')
    }
    
    const checkinToken = await CSRFTokens.findOne({token: token});
    if(!checkinToken) {
        ctx.throw(403, 'bad token')
    }
    
    await next();
}