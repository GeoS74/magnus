//проверка учётных данных
//если клиент не передаёт учётные данные для авторизации пользователя
//passport вернёт стандартное сообщение об ошибке:
//  {message: 'Missing credentials'}
//из этого сообщения не понятно какое поле не заполнено, поэтому используется этот middleware
//для проверки учётных данных и возврата клиенту адектватного описания ошибки
// exports.checkCredentials = (ctx, next) => {
//     if (ctx.request.body.email && ctx.request.body.password) return next();
//     ctx.status = 400;
//     if (!ctx.request.body.email) {
//         ctx.body = { path: 'user', message: 'Данные не передаются' };
//         return;
//     }
//     if (!ctx.request.body.password) {
//         ctx.body = { path: 'password', message: 'Данные не передаются' };
//     }
// };

//некоторые маршруты используют проверку только наличия логина, или только наличия пароля
//поэтому имеет смысл разделить проверку вводимых данных на 2 разных middleware
exports.checkPassword = (ctx, next) => {
    if(ctx.request.body.password) return next()

    ctx.status = 400
    ctx.body = { path: 'password', message: 'Данные не передаются' }
}
exports.checkEmail = (ctx, next) => {
    if(/^[-.\w]+@([\w-]+\.)+[\w-]{2,12}$/.test(ctx.request.body.email)) return next()

    ctx.status = 400
    ctx.body = { path: 'user', message: 'Некорректный email' }
}