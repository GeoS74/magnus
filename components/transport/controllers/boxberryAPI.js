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
            .findOne({ name: data.searchString })
            .populate('inputPoints')
            .populate('outputPoints');
        // let city = await BoxberryHandbookPlaces.aggregate([
        //     {
        //         $match: {
        //             name: data.searchString
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

        // console.log(city);
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
    // надо посмотреть как boxberry обработает превышение лимитов
    //
    // if(parameters.arrival.outputPoints.loadLimit < parameters.weight) {
    //     throw new Error("Boxberry: excess max weight limit");
    // }
    // if(parameters.arrival.outputPoints.volumeLimit < (parameters.length * parameters.width * parameters.height)) {
    //     throw new Error("Boxberry: excess max volume limit");
    // }

    let arr = [
        `width=${parameters.width}`, //Ширина
        `depth=${parameters.length}`, //Длина (глубина коробки)
        `height=${parameters.height}`, //Высота
        `weight=${parameters.weight}`, //Вес
        `targetstart=${parameters.weight}`, //
        `target=${parameters.weight}`, //
        `ordersum=0`, //
        `deliverysum=0`, //
        `paysum=0`, //
    ];

    return arr.join('&');
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Boxberry',
            price: '',
            days: '' || '',
        },
        detail: []
    };

    // data.detail.push({
    //     name: s.name,
    //     value: s.cost + ' р.'
    // });
    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    //тип доставки Склад-Склад
    //https://api.boxberry.ru/json.php?token=${process.env.BOXBERRY}&method=DeliveryCosts&weight=500&targetstart=010&target=010&ordersum=0&deliverysum=0&height=120&width=80&depth=50&paysum=100

    // await fetch(`https://api.baikalsr.ru/v2/calculator`, {
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Basic ${base64encode(`${process.env.BAIKAL}:`)}`,
    //     },
    //     method: 'POST',
    //     body: JSON.stringify(data)
    // })
    //     .then(async response => {
    //         if (response.ok) {
    //             const res = await response.json();
    //             // console.log(res);
    //             ctx.body = postProcessing(res);
    //         }
    //         else {
    //             const res = await response.json();
    //             console.log(res);
    //             throw new Error(`Error fetch query - status: ${response.status}`);
    //         }
    //     })
    //     .catch(err => {
    //         console.log('~~~~~Error API Pek~~~~~');
    //         console.log(err);
    //         throw new Error(err.message);
    //     });
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
