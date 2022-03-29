const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');
const DellineHandbookPlaces = require('@transport/models/DellineHandbookPlaces');
const PEKHandbookPlaces = require('@transport/models/PEKHandbookPlaces');
const KitHandbookPlaces = require('@transport/models/KitHandbookPlaces');
const CdekHandbookPlaces = require('@transport/models/CdekHandbookPlaces');


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
            regcode: derival.regcode.slice(0, 2) + "00000000000000000000000"
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


    //тест справочника СДЭК
    const cdekderrival = await CdekHandbookPlaces
        //попытка найти по коду КЛАДР
        .find({ code: derival.code });
    //попытка найти по наименованию и коду КЛАДР
    // .findOne({
    //     name: derival.searchString,
    //     regcode: derival.regcode,
    // });

    console.log('-------------CdekHandbookPlaces----------');
    console.log(cdekderrival);


    ctx.body = {};
};

module.exports.checkParameters = async (ctx, next) => {
    //клиент должен передавать данные по грузовым местам в массиве
    //если грузовое место 1, то параметры будут переданы строками -это особенность koa-body

    //привести все параметры к массиву
    ctx.request.body.length = toArray(ctx.request.body.length);
    ctx.request.body.width = toArray(ctx.request.body.width);
    ctx.request.body.height = toArray(ctx.request.body.height);
    ctx.request.body.weight = toArray(ctx.request.body.weight);
    ctx.request.body.quantity = toArray(ctx.request.body.quantity);

    //определить максимальное кол-во элементов в каком-либо из массивов
    let maxCount = 0;
    maxCount = maxCount < ctx.request.body.length.length ? ctx.request.body.length.length : maxCount;
    maxCount = maxCount < ctx.request.body.width.length ? ctx.request.body.width.length : maxCount;
    maxCount = maxCount < ctx.request.body.height.length ? ctx.request.body.height.length : maxCount;
    maxCount = maxCount < ctx.request.body.weight.length ? ctx.request.body.weight.length : maxCount;
    maxCount = maxCount < ctx.request.body.quantity.length ? ctx.request.body.quantity.length : maxCount;

    //нормализовать массивы (выровнить по кол-ву элементов)
    //если элементов меньше, то какие-то данные, находящиеся до первого значения не передаются
    ctx.request.body.length = normalizeArray(ctx.request.body.length, maxCount);
    ctx.request.body.width = normalizeArray(ctx.request.body.width, maxCount);
    ctx.request.body.height = normalizeArray(ctx.request.body.height, maxCount);
    ctx.request.body.weight = normalizeArray(ctx.request.body.weight, maxCount);
    ctx.request.body.quantity = normalizeArray(ctx.request.body.quantity, maxCount);

    // привести входные данные к нужному типу
    ctx.request.body.length = toFloat(ctx.request.body.length);
    ctx.request.body.width = toFloat(ctx.request.body.width);
    ctx.request.body.height = toFloat(ctx.request.body.height);
    ctx.request.body.weight = toFloat(ctx.request.body.weight);
    ctx.request.body.quantity = toInt(ctx.request.body.quantity);

    //валидация данных
    for(let k in ctx.request.body.length) {
        if(ctx.request.body.length[k] <= 0) {
            ctx.status = 400;
            return ctx.body = { path: `length_${++k}`, message: 'Не корректные данные' };
        }
    }

    for(let k in ctx.request.body.width) {
        if(ctx.request.body.width[k] <= 0) {
            ctx.status = 400;
            return ctx.body = { path: `width_${++k}`, message: 'Не корректные данные' };
        }
    }

    for(let k in ctx.request.body.height) {
        if(ctx.request.body.height[k] <= 0) {
            ctx.status = 400;
            return ctx.body = { path: `height_${++k}`, message: 'Не корректные данные' };
        }
    }

    for(let k in ctx.request.body.weight) {
        if(ctx.request.body.weight[k] <= 0) {
            ctx.status = 400;
            return ctx.body = { path: `weight_${++k}`, message: 'Не корректные данные' };
        }
    }

    for(let k in ctx.request.body.quantity) {
        if(ctx.request.body.quantity[k] <= 0) {
            ctx.status = 400;
            return ctx.body = { path: `quantity_${++k}`, message: 'Не корректные данные' };
        }
    }

    return next();
};

//привести данные к массиву
function toArray(data) {
    return Array.isArray(data) ? data : [data];
}
//выравнивание массива до длины maxCount
//недостающие позиции добиваются в начало массива пустыми значениями
function normalizeArray(arr, maxCount) {
    if(arr.length < maxCount) {
        return new Array(maxCount - arr.length).fill('').concat(arr);
    }
    else return arr;
}
//привести значения массива к float
function toFloat(arr) {
    for(let k in arr) {
        arr[k] = parseFloat(arr[k]) || 0;
    }
    return arr;
}
//привести значения массива к int
function toInt(arr) {
    for(let k in arr) {
        arr[k] = parseInt(arr[k]) || 0;
    }
    return arr;
}