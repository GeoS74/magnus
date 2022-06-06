const connection = require('@root/libs/connection');
const crypto = require('crypto');
const config = require('@root/config');


exports.checkCSRFToken = async (ctx, next) => {
    const clientToken = ctx.get('X-CSRF-TOKEN')

    if (!clientToken) {
        ctx.throw(409, 'bad token')
    }

    const parseToken = clientToken.split(':');

    if(parseToken.length !== 2) {
        ctx.throw(409, 'bad token')
    }

    const salt = parseToken[0];
    const token = await generateToken(salt);

    if(clientToken !== `${salt}:${token}`) {
        ctx.throw(409, 'bad token');
    }

    return next();
}


exports.setCSRFToken = async (ctx, next) => {
    try {
        const salt = await generateSalt()
        const token = await generateToken(salt)

        ctx.set('csrf-token', `${salt}:${token}`)

        ctx.cookies.set('CSRF-TOKEN', `${salt}:${token}`, {
            // domain: 'localhost',
            // maxAge: 1000 * maxAgeSecondsToken, //ms
            secure: config.cookie.secure, //логическое значение, указывающее, должен ли файл cookie отправляться только через HTTPS ( false по умолчанию для HTTP, true по умолчанию для HTTPS).
            httpOnly: false, //если false - куки доступен для клиентского JS
            //логическое значение или строка, указывающая, является ли файл cookie файлом cookie «того же сайта» ( falseпо умолчанию)
            //sameSite работает только в Chrome и Firefox
            sameSite: true,
            overwrite: true, //логическое значение, указывающее, перезаписывать ли ранее установленные файлы cookie с тем же именем ( falseпо умолчанию).
        })

        return next()
    }
    catch (error) {
        ctx.throw(409, error.message)
    }
}

async function generateToken(salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(
            config.cryptoCSRF.secret, salt,
            config.cryptoCSRF.iterations,
            config.cryptoCSRF.length,
            config.cryptoCSRF.digest,
            (err, key) => {
                if (err) return reject(err);
                resolve(key.toString('hex'));
            },
        );
    });
}

function generateSalt() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(config.cryptoCSRF.length, (err, buffer) => {
            if (err) return reject(err);
            resolve(buffer.toString('hex'));
        });
    });
}


//это для JWT

// const mongoose = require('mongoose');
// const {v4: uuid} = require('uuid');

// const maxAgeSecondsToken = 60;

// const schema = new mongoose.Schema({
//     token: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     // refreshToken: {
//     //     type: String,
//     //     required: true,
//     //     unique: true
//     // },
//     lastVisit: {
//         type: Date,
//         required: true,
//         default: Date.now(),
//         index: {
//             expires: maxAgeSecondsToken,
//         }
//     }
// });
// schema.path('lastVisit').index({expires: '1m'});

// const CSRFTokens = connection.model('CSRFTokens', schema);

// exports.createToken = async (ctx, next) => {
//     try{
//         const token = uuid();

//         ctx.cookies.set('CSRF-TOKEN', token, {
//             // domain: 'localhost',
//             maxAge: 1000 * maxAgeSecondsToken, //ms
//             // secure: true, //логическое значение, указывающее, должен ли файл cookie отправляться только через HTTPS ( false по умолчанию для HTTP, true по умолчанию для HTTPS).
//             httpOnly: true, //если false - куки доступен для клиентского JS
//             //логическое значение или строка, указывающая, является ли файл cookie файлом cookie «того же сайта» ( falseпо умолчанию)
//             //sameSite работает только в Chrome и Firefox
//             // sameSite: true,
//             overwrite: true, //логическое значение, указывающее, перезаписывать ли ранее установленные файлы cookie с тем же именем ( falseпо умолчанию).
//         })

//         await CSRFTokens.create({
//             token: token,
//             // refreshToken: uuid(),
//         })

//         await next();
//     }
//     catch(error) {
//         ctx.throw(403, error.message);
//     }
// }