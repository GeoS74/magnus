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
async function makeSearchParameters(parameters) {
    //для корректного расчёта стоимости доставки в качестве отправного пункта надо использовать Код пункта приема заказа
    //в качестве конечной точки Код пункта выдачи заказа
    //поэтому надо контролировать наличие таких пунктов в выбранных городах
    parameters.derival = await getCity(parameters.derival);
    if(!parameters.derival.inputPoints.length) {
        throw new Error("Boxberry: inputPoints not found");
    }
    parameters.arrival = await getCity(parameters.arrival);
    if(!parameters.arrival.outputPoints.length) {
        throw new Error("Boxberry: outputPoints not found");
    }

    //необходимо контролировать заявленный вес и объем, т.к.
    //на пунктах выдачи посылок могут быть ограничения
    //
    // boxberry спокойно обрабатывает превышение лимитов
    //
    // if(parameters.arrival.outputPoints.loadLimit < parameters.weight) {
    //     throw new Error("Boxberry: excess max weight limit");
    // }
    // if(parameters.arrival.outputPoints.volumeLimit < (parameters.length * parameters.width * parameters.height)) {
    //     throw new Error("Boxberry: excess max volume limit");
    // }


    let arr = [
        `weight=${parameters.weight*1000}`, //Вес в граммах
        `targetstart=${parameters.derival.inputPoints[0].code}`, //Код пункта приема заказа
        `target=${parameters.arrival.outputPoints[0].code}`, //Код пункта выдачи заказа
        `ordersum=500`, //Объявленная стоимость посылки (страховая стоимость) min=500
        `deliverysum=0`, //Заявленная стоимость доставки (прим.: хз что это такое)
        `height=${parameters.length*100}`, //Высота, см
        `width=${parameters.width*100}`, //Ширина, см
        `depth=${parameters.height*100}`, //Длина (глубина коробки), см
        `paysum=500`, //Сумма к оплате с получателя   
    ];
// console.log(`${parameters.length*100} x ${parameters.width*100} x ${parameters.height*100}`);
// console.log(arr);
    return arr.join('&');
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Boxberry',
            price: res.price,
            days: res.delivery_period || '',
        },
        detail: []
    };

    data.detail.push({
        name: 'Стоимость базового тарифа',
        value: res.price_base + ' р.'
    });

    data.detail.push({
        name: 'Стоимость дополнительных услуг',
        value: res.price_service + ' р.'
    });

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    //тип доставки Склад-Склад
    await fetch(`https://api.boxberry.ru/json.php?token=${process.env.BOXBERRY}&method=DeliveryCosts&${data}`)
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);
                ctx.body = postProcessing(res);
            }
            else {
                const res = await response.json();
                console.log(res);
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log('~~~~~Error API Boxberry~~~~~');
            console.log(err);
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
