module.exports = async (ctx, next) => {
    try{
        await next();
    }
    catch(error){
        //глобальный перехват ошибок приложения
        //если статуса ошибки нет, то такая ошибка считается не обработаной и относится к внутренним ошибкам сервера
        //как вариант, внутри приложения необходимо обрабатывать ошибки и выбрасывать ctx.throw(...)
        if(error.status){
            ctx.status = error.status;
            ctx.body = {error: error.message};
        } else {
            console.log(error);
            ctx.status = 500;
            ctx.body = {error: '~Internal server error~'};
        }
    }
}