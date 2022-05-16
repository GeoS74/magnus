const config = require('@root/config')
const base64 = require('base-64')
const createHmac = require('crypto').Hmac


exports.sign = (obj) => {
    const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    const payload = JSON.stringify(obj)
    const data = `${base64.encode(header)}.${base64.encode(payload)}`
    const signature = createHmac('sha256', config.jwt.secret).update(data).digest('hex')
    return `${data}.${signature}`
}

exports.verify = (token) => {
    const arr = token.split('.')
    if(arr.length !== 3 ) return false;

    const data = arr.slice(0, 2).join('.')
    const signature = createHmac('sha256', config.jwt.secret).update(data).digest('hex')
    return token === `${data}.${signature}`
}

exports.decode = (token) => {
    const decodeData = token.split('.')
    return {
        header:  JSON.parse( base64.decode(decodeData[0]) ),
        payload: JSON.parse( base64.decode(decodeData[1]) ),
    }
}