const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');
const DellineHandbookPlaces = require('@transport/models/DellineHandbookPlaces');
const PEKHandbookPlaces = require('@transport/models/PEKHandbookPlaces');
const KitHandbookPlaces = require('@transport/models/KitHandbookPlaces');


//получение документов о городах из коллекции главного справочника населенных пунктов
module.exports.checkCity = async (ctx, next) => {
    ///////////////////////uncomment this///////////////////////
    try {
        ctx.request.body.derival = await MainHandbookPlaces.findOne({ fullName: ctx.request.body.derival.trim() });
        ctx.request.body.arrival = await MainHandbookPlaces.findOne({ fullName: ctx.request.body.arrival.trim() });
    }
    catch (error) {
        console.log(error.message);
        ctx.throw(400, error.message);
    }

    //проверка входных данных
    if (!ctx.request.body.derival) {
        ctx.status = 400;
        return ctx.body = { path: 'derival', message: 'Не корректные данные' };
    }
    if (!ctx.request.body.arrival) {
        ctx.status = 400;
        return ctx.body = { path: 'arrival', message: 'Не корректные данные' };
    }
    return next();
    ///////////////////////uncomment this///////////////////////


    //тест справочников городов
    const derival = await MainHandbookPlaces.findOne({ fullName: ctx.request.body.derival.trim() });
    const arrival = await MainHandbookPlaces.findOne({ fullName: ctx.request.body.arrival.trim() });
    console.log('-------------MainHandbookPlaces----------');
    console.log(derival.name);

    const dl = await DellineHandbookPlaces
        //попытка найти город по коду
        // .findOne({ code: derival.code + '000000000000' })
        //попытка найти город по названию и коду региона
        .findOne({ 
            searchString: derival.searchString, 
            regcode: derival.regcode.slice(0, 2)+"00000000000000000000000" 
        })
        .populate({
            path: 'streets',
            match: { name: { $regex: /^[а-яА-Я]{5}/i } },
            options: { limit: 1 }
        })
        .populate('terminals');
    console.log('-------------DellineHandbookPlaces----------');
    console.log(dl.name);


    //тест справочника КИТ
    const kitderrival = await KitHandbookPlaces
        //попытка найти город по коду
        // .findOne({ code: derival.code.slice(0, 2) + derival.code.slice(3) });
        //попытка найти город по названию и коду региона
        .findOne({
            name: derival.searchString,
            regcode: derival.regcode.slice(0, 2),
        });

    console.log('-------------KitHandbookPlaces----------');
    console.log(kitderrival.name);


    //тест справочника ПЭК
    try {
        const regexp = new RegExp("^" + derival.searchString);
        const pek = await PEKHandbookPlaces.aggregate([
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
                    region: 1,
                    cityID: 1
                }
            }
        ]);
        console.log('-------------PEKHandbookPlaces----------');
        console.log(pek);
    } catch (error) {
        console.log(error);
        ctx.throw(400, error.message);
    }


     

    ctx.body = {};
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