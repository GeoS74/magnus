const DellineHandbookPlaces = require('@transport/models/DellineHandbookPlaces');
const PEKHandbookPlaces = require('@transport/models/PEKHandbookPlaces');


//форматирование адреса для запроса
//API Деловых линий требует, чтобы обязательно был указан номер дома,
//это вызывает определенные трудности, т.к. улица выбирается рандомно, либо её может вообще не быть
//чтобы соответствовать требованиям API номер дома устанавливается равным 1, не зависимо от того есть улица или нет
//это даже забавно, но есть ещё одна проблема, связанная с улицами
//если в качестве улицы попадается что-то вроде СНТ, или улица начинается с цифры (250-лет...), то это приводит к ошибке
//поэтому при запросе улицы используется регулярка /^[а-яА-Я]{5}/i
//
module.exports.checkCity = async (ctx, next) => {
    // преобразование входных данных
    ctx.request.body.derival = await DellineHandbookPlaces
        .findOne({
            name: ctx.request.body.derival
        }).populate({
            path: 'streets',
            match: { name: { $regex: /^[а-яА-Я]{5}/i } },
            options: { limit: 1 }
        })
        .populate('terminals');
    ctx.request.body.arrival = await DellineHandbookPlaces
        .findOne({
            name: ctx.request.body.arrival
        }).populate({
            path: 'streets',
            match: { name: { $regex: /^[а-яА-Я]{5}/i } },
            options: { limit: 1 }
        })
        .populate('terminals');

    //проверка входных данных
    if (!ctx.request.body.derival) {
        ctx.status = 400;
        return ctx.body = { path: 'derival', message: 'Не корректные данные' };
    }
    if (!ctx.request.body.arrival) {
        ctx.status = 400;
        return ctx.body = { path: 'arrival', message: 'Не корректные данные' };
    }
    //return next();





    //тест справочника ПЭК
    try {
        const regexp = new RegExp("^" + ctx.request.body.derival.searchString);
        const city = await PEKHandbookPlaces.aggregate([
            {
                //условие выбора
                // $match: {
                //     $or: [
                //         { name: ctx.request.body.derival.searchString },
                //         {
                //             name: {
                //                 $regex: regexp, $options: "i"
                //             }
                //         }
                //     ]
                // }
                //регулярка
                $match: {
                    name: {
                        $regex: regexp, $options: "i"
                    }
                }
                //в лоб
                // $match: {
                //     name: ctx.request.body.derival.searchString
                // }
            },
            { $limit: 50 },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    region: 1
                }
            }
        ]);
        console.log(city);
        // ctx.body = city;
    } catch (error) {
        console.log(error);
        ctx.throw(400, error.message);
    }




    ctx.body = ctx.request.body.derival;
};


module.exports.checkParameters = async (ctx, next) => {
    // преобразование входных данных
    ctx.request.body.length = parseFloat(ctx.request.body.length) || 0;
    ctx.request.body.width = parseFloat(ctx.request.body.width) || 0;
    ctx.request.body.height = parseFloat(ctx.request.body.height) || 0;
    ctx.request.body.weight = parseFloat(ctx.request.body.weight) || 0;
    ctx.request.body.quantity = parseInt(ctx.request.body.quantity) || 0;

    //проверка входных данных
    if (ctx.request.body.length <= 0) {
        ctx.status = 400;
        return ctx.body = { path: 'length', message: 'Не корректные данные' };
    }
    if (ctx.request.body.width <= 0) {
        ctx.status = 400;
        return ctx.body = { path: 'width', message: 'Не корректные данные' };
    }
    if (ctx.request.body.height <= 0) {
        ctx.status = 400;
        return ctx.body = { path: 'height', message: 'Не корректные данные' };
    }
    if (ctx.request.body.weight <= 0) {
        ctx.status = 400;
        return ctx.body = { path: 'weight', message: 'Не корректные данные' };
    }
    if (ctx.request.body.quantity <= 0) {
        ctx.status = 400;
        return ctx.body = { path: 'quantity', message: 'Не корректные данные' };
    }
    return next();
};