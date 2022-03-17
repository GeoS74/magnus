const fetch = require('node-fetch');
const BaikalHandbookPlaces = require('@transport/models/BaikalHandbookPlaces');
const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');
const { base64encode, base64decode } = require('nodejs-base64');


//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Кита
async function getCity(data) {
    try {
        //попытка найти город по коду
        let city = await BaikalHandbookPlaces.findOne({ name: data.searchString });

        if (city) return city;
        else throw new Error("Baikal: city not found");
    }
    catch (error) {
        // console.log(error.message);
        throw new Error(error.message);
    }
}

//формирование параметров запроса для расчёта перевозки
//параметры должны передаваться GET запросом
async function makeSearchParameters(parameters) {
    parameters.derival = await getCity(parameters.derival);
    parameters.arrival = await getCity(parameters.arrival);

    const data = {
        Departure: {
            CityGuid: parameters.derival.cityID,
            // PickUp: {
            //     Street: "0faa0cfa-dfe8-4f5a-a001-2727a41d7f21",
            //     House: "1",
            //     Date: "2019-04-02T00:00:00",
            //     TimeFrom: "09:00",
            //     TimeTo: "21:00",
            //     Services: [13]
            // }
        },
        Destination: {
            CityGuid: parameters.arrival.cityID,
            // Delivery: {
            //     Street: "234d642f-880b-41e8-a9ec-b3811c0eb49b",
            //     House: "2",
            //     TimeFrom: "09:00",
            //     TimeTo: "18:00"
            // }
        },
        Cargo: {
            SummaryCargo: {
                Length: parameters.length,//м
                Width: parameters.width,//м
                Height: parameters.height,//м
                Volume: (parameters.length * parameters.width * parameters.height),//м3 Объем груза (в кубических метрах)
                Weight: parameters.weight,//кг
                Units: parameters.quantity,//Количество мест
                Oversized: 0, //Габарит (0 - габарит, 1 – негабарит)
                EstimatedCost: 0, //Оценочная стоимость груза (в рублях)
                // Services: [25] //Массив id - услуг из справочника
            }
        }
    };
    return data;
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Байкал Сервис',
            price: res.total,
            days: res.transit.int || '',
        },
        detail: []
    };

    for (const s of res.departure.services) {
        data.detail.push({
            name: s.name,
            value: s.cost + ' р.'
        });
    }

    for (const s of res.destination.services) {
        data.detail.push({
            name: s.name,
            value: s.cost + ' р.'
        });
    }

    for (const s of res.cargo.services) {
        data.detail.push({
            name: s.name,
            value: s.cost + ' р.'
        });
    }

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    await fetch(`https://api.baikalsr.ru/v2/calculator`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${base64encode(`${process.env.BAIKAL}:`)}`,
        },
        method: 'POST',
        body: JSON.stringify(data)
    })
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
            console.log('~~~~~Error API Pek~~~~~');
            console.log(err);
            throw new Error(err.message);
        });
}


//обновить справочник населённых пунктов в БД
//API Байкала не даёт скачать справочник населенных пунктов,
//взамен предлагается сервис для поиска городов через запросы
module.exports.updateHandbookPlaces = async ctx => {
    const mainHandbook = await MainHandbookPlaces.find();

    //очистить коллекцию населённых пунктов
    await BaikalHandbookPlaces.deleteMany();

    const start = Date.now();
    let i = 0;
    for (const city of mainHandbook) {
        if (!(++i % 100)) console.log('write: ', i);
        try {
            await searchAndWritePlaces(city.searchString);
            //параноя - чтобы не получить бан сделать паузу в полсекунды
            await delay(500);
        }
        catch (error) {
            console.log(error.message);
            continue;
        }
    }
    console.log('Baikal handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
    ctx.body = 'Baikal handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
};

//получает название населенного пукнкта и через запроск API пытается получить данные
//API возвращает массив совпадений, поэтому надо анализировать полученный массив данных
async function searchAndWritePlaces(cityName) {
    await fetch(`https://api.baikalsr.ru/v1/fias/cities?text=${cityName}`, {
        headers: {
            'Authorization': `Basic ${base64encode(`${process.env.BAIKAL}:`)}`,
        },
        method: 'GET',
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);
                //API возвращает массив совпадений
                //попытка найти точное совпадение по наименованию
                for (const city of res) {
                    if (city.name === cityName) {
                        await BaikalHandbookPlaces.create({
                            cityID: city.guid,
                            name: city.name,
                            regname: city.parents || undefined
                        })
                        break;
                    }
                }
            }
            else {
                console.log(await response.json());
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        });
}



function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}
