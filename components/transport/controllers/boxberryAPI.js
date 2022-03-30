const fetch = require('node-fetch');
const BoxberryHandbookPlaces = require('@transport/models/BoxberryHandbookPlaces');
const BoxberryHandbookInputPoints = require('@transport/models/BoxberryHandbookInputPoints');
const BoxberryHandbookOutputPoints = require('@transport/models/BoxberryHandbookOutputPoints');
const { base64encode, base64decode } = require('nodejs-base64');

//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Boxberry
//
//проблема: в коллекции пунктов выдачи разные пункты могут иметь отличающиеся ограничения по максимальному весу и объему
//по идее, для расчёта надо брать пункт с самыми высокими лимитами
//но, теоретически может быть ситуация когда один пункт быдет иметь максимальное значение по весу,
//а другой по объёму. Как выбирать в этом случае не понятно...
async function getCity(data) {
    try {
        //попытка найти город по коду
        let city = await BoxberryHandbookPlaces
            .findOne({ searchString: data.searchString })
            .populate('inputPoints')
            .populate('outputPoints');
        // let city = await BoxberryHandbookPlaces.aggregate([
        //     {
        //         $match: {
        //             searchString: data.searchString
        //         }
        //     },
        //     {
        //         $lookup:
        //         {
        //             from: 'boxberryhandbookoutputpoints',
        //             localField: 'cityID',
        //             foreignField: 'cityID',
        //             as: 'outputPoints'
        //         }
        //     },
        //     { $limit: 50 },
        // ]);

         
        if (city) return city;
        else throw new Error("Boxberry: city not found");
    }
    catch (error) {
        // console.log(error.message);
        throw new Error(error.message);
    }
}

//формирование параметров запроса для расчёта перевозки
//параметры должны передаваться GET запросом
//максимальный вес коробки не должен превышать 15 кг
//размер каждого измерения ДШВ не должен превышать 120 см (хотя API позволяет расчитать превышение лимитов)
function makeSearchParameters(parameters, index) {
    if(parameters.length[index] > 1.2) throw new Error('Boxberry: превышение максимальной длины');
    if(parameters.width[index] > 1.2) throw new Error('Boxberry: превышение максимальной ширины');
    if(parameters.height[index] > 1.2) throw new Error('Boxberry: превышение максимальной высоты');
    if(parameters.weight[index] > 15) throw new Error('Boxberry: превышение максимального веса');

    let arr = [
        `weight=${parameters.weight[index]*1000}`, //Вес в граммах
        `targetstart=${parameters.derival.inputPoints[0].code}`, //Код пункта приема заказа
        `target=${parameters.arrival.outputPoints[0].code}`, //Код пункта выдачи заказа
        `ordersum=500`, //Объявленная стоимость посылки (страховая стоимость) min=500
        `deliverysum=0`, //Заявленная стоимость доставки (прим.: хз что это такое)
        `height=${parameters.length[index]*100}`, //Высота, см
        `width=${parameters.width[index]*100}`, //Ширина, см
        `depth=${parameters.height[index]*100}`, //Длина (глубина коробки), см
        `paysum=500`, //Сумма к оплате с получателя   
    ];

    return arr.join('&');
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Boxberry',
            price: 0,
            days: '',
        },
        detail: []
    };

    for(let i = 0; i < res.length; i++) {
        data.main.price += +res[i].price;

        data.detail.push({
            name: `Место ${i+1} базовый тариф`,
            value: +res[i].price_base + ' р.'
        });

        data.detail.push({
            name: `Место ${i+1} доп. услуги`,
            value: +res[i].price_service + ' р.'
        });
    }

    data.main.price = +data.main.price.toFixed(2);
    data.main.days = `${res[0].delivery_period}` || '';

    return data;
}

//возвращает запрос к API Boxberry
function getQuery(data) {
    return fetch(`https://api.boxberry.ru/json.php?token=${process.env.BOXBERRY}&method=DeliveryCosts&${data}`)
        .then(async response => {
            if (response.ok) {
                return await response.json();
            }
            else {
                const res = await response.json();
                console.log(res);

                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            throw new Error(err.message);
        });
}

//расчет доставки
//API Boxberry, как и калькулятор не позволяет расчитывать доставку с указанием разных мест
//при этом суммировать ДШВ и вес нельзя, т.к. на расчёт есть ограничение (120см х 120см х 120см и макс. вес: 15кг)
//поэтому, для подсчёта стоимости доставки формируется отдельный запрос на каждое место
//забавно, но API Boxberry спокойно обрабатывает превышение лимитов
//
//чтобы снизить нагрузку на БД при формировании параметров запроса получение городов Boxberry вынесено из makeSearchParameters()
module.exports.calculation = async (ctx) => {
    //для корректного расчёта стоимости доставки в качестве отправного пункта надо использовать Код пункта приема заказа
    //в качестве конечной точки Код пункта выдачи заказа
    //поэтому надо контролировать наличие таких пунктов в выбранных городах
    //обработка происходит здесь, чтобы можно было понять в каком пункте (приём/отправка) нет точки Boxberry
    //и чтобы не нагружать БД однотипными запросами при формировании параметров
    ctx.request.body.derival = await getCity(ctx.request.body.derival);
    if(!ctx.request.body.derival.inputPoints.length) {
        throw new Error("Boxberry: inputPoints not found");
    }
    ctx.request.body.arrival = await getCity(ctx.request.body.arrival);
    if(!ctx.request.body.arrival.outputPoints.length) {
        throw new Error("Boxberry: outputPoints not found");
    }

    //сформировать массив с запросами
    const queries = [];
    for (let i = 0; i < ctx.request.body.width.length; i++) {
        for (let n = 0; n < ctx.request.body.quantity[i]; n++) {
            queries.push(getQuery(makeSearchParameters(ctx.request.body, i)));
        }
    }

    await Promise.all(queries)
        .then(res => {
            // console.log(res);
            ctx.body = postProcessing(res);
        })
        .catch(err => {
            // console.log(err.message);
            throw new Error(err.message);
        });
}

//обновить справочник населённых пунктов в БД
//коды КЛАДР Boxberry совпадают с нормальными кодами
module.exports.updateHandbookPlaces = async ctx => {
    //очистить коллекцию населённых пунктов
    await BoxberryHandbookPlaces.deleteMany();

    await fetch(`https://api.boxberry.ru/json.php?token=${process.env.BOXBERRY}&method=ListCitiesFull&CountryCode=643`, {
        headers: {
            // 'Content-Type': 'application/json',
        },
        method: 'GET',
    })
        .then(async response => {
            const res = await response.json();
            // console.log(response.status);
            // console.log(res);

            const start = Date.now();
            let i = 0;

            for (const city of res) {
                if (!(++i % 100)) console.log('write: ', i);
                try {
                    await BoxberryHandbookPlaces.create({
                        name: city.UniqName,
                        code: city.Kladr,
                        searchString: city.Name,
                        cityID: city.Code,
                        regname: city.Region,
                        regcode: city.Kladr.slice(0, 2)
                    })
                }
                catch (error) {
                    console.log(error.message);
                    continue;
                }
            }

            console.log('Boxberry handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
            ctx.body = 'Boxberry handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
        })
        .catch(error => {
            console.log(error);
        });



};
//обновить справочник пунктов выдачи в БД
module.exports.updateHandbookOutputPoints = async ctx => {
    //очистить коллекцию пунктов выдачи
    await BoxberryHandbookOutputPoints.deleteMany();

    await fetch(`https://api.boxberry.ru/json.php?token=${process.env.BOXBERRY}&method=ListPoints&prepaid=1&CountryCode=643`, {
        headers: {
            // 'Content-Type': 'application/json',
        },
        method: 'GET',
    })
        .then(async response => {
            const res = await response.json();
            // console.log(response.status);
            // console.log(res);

            const start = Date.now();
            let i = 0;

            for (const point of res) {
                if (!(++i % 100)) console.log('write: ', i);
                try {
                    await BoxberryHandbookOutputPoints.create({
                        code: point.Code,
                        cityID: point.CityCode,
                        name: point.CityName,
                        volumeLimit: point.VolumeLimit,
                        loadLimit: point.LoadLimit
                    })
                }
                catch (error) {
                    console.log(error.message);
                    continue;
                }
            }

            console.log('Boxberry handbook output points is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
            ctx.body = 'Boxberry handbook output points is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
        })
        .catch(error => {
            console.log(error);
        });
}
//обновить справочник пунктов приема в БД
module.exports.updateHandbookInputPoints = async ctx => {
    //очистить коллекцию пунктов выдачи
    await BoxberryHandbookInputPoints.deleteMany();

    await fetch(`https://api.boxberry.ru/json.php?token=${process.env.BOXBERRY}&method=PointsForParcels`, {
        headers: {
            // 'Content-Type': 'application/json',
        },
        method: 'GET',
    })
        .then(async response => {
            const res = await response.json();
            // console.log(response.status);
            // console.log(res);

            const start = Date.now();
            let i = 0;

            for (const point of res) {
                if (!(++i % 100)) console.log('write: ', i);
                try {
                    await BoxberryHandbookInputPoints.create({
                        code: point.Code,
                        name: point.City,
                    })
                }
                catch (error) {
                    console.log(error.message);
                    continue;
                }
            }

            console.log('Boxberry handbook input points is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
            ctx.body = 'Boxberry handbook input points is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
        })
        .catch(error => {
            console.log(error);
        });
}


function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}
