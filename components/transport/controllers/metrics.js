const Counter = require('@transport/models/Counter');

//подсчёт обращений к API транспортных компаний
exports.counter = (ctx, next) => {
    Counter.plus(ctx.request.body.carrier);
    return next();
}

exports.carrierCounter = async ctx => {
    try {
        const filter = {
            $and: [
                {'createdAt': { $lt: ctx.request.query.end }},
                {'createdAt': { $gt: ctx.request.query.start }}
            ]
        };

        const data = await Counter.find(filter);

        const stat = new Map();

        for(const v of data) {
            stat.set(v.carrier, (stat.get(v.carrier) || 0) + v.count);
        }

        ctx.body = [...stat].sort((a, b) => {return b[1] - a[1]});
    }
    catch (error) {
        throw error;
    }
}