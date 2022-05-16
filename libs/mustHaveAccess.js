module.exports = function mustHaveAccess(ctx, next) {
    if(ctx.access) return next();

    //запрет кеширования
    ctx.set('Cache-Control', 'max-age=0, no-cache, no-store');
    ctx.set('Pragma', 'no-cache');

    // ctx.throw(401, 'Пользователь не залогинен');
    
    ctx.status = 401;

    //вариант с принудительной переадресацией
    // ctx.status = 301;
    // ctx.redirect('/login');
  };