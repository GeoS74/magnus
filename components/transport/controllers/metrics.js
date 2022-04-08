const Counter = require('@transport/models/Counter');

//подсчёт обращений к API транспортных компаний
exports.counter = (ctx, next) => {
    Counter.plus(ctx.request.body.carrier);
    return next();
}