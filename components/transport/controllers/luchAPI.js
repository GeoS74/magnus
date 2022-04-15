const fetch = require('node-fetch'); //https://www.npmjs.com/package/node-fetch#loading-and-configuring-the-module
const LuchHandbookPlaces = require('@transport/models/LuchHandbookPlaces');
const { JSDOM } = require('jsdom');

//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Луча
async function getCity(data) {
    try {
        //попытка найти город по наименованию
        let city = await LuchHandbookPlaces
            .findOne({ 
                name: { 
                    $regex: new RegExp(`^${data.searchString}`, 'i') 
                } 
            });
        if (city) return city;
        else throw new Error(`Luch: city ${data.searchString} not found`);
    }
    catch (error) {
        // console.log(error.message);
        throw new Error(error.message);
    }
}

//формирование параметров запроса для расчёта перевозки
function makeSearchParameters(parameters, index) {
    return {
        order: {
            b_pickup: false,
            b_delivery: false,
            city_from: parameters.derival.name,
            t_waiting_pickup: "0",
            t_waiting_delivery: "0",
            city_to: parameters.arrival.name,
            value_order: 100,
            cash_on_delivery: 0,
            repurchase: 0,
            b_return_docs: false,
            cargos: [
                {
                    diameter_load: 0,
                    length_load: parameters.length[index],
                    width_load: parameters.width[index],
                    height_load: parameters.height[index],
                    mass_load: parameters.weight[index],
                    number_of_identical_load: parameters.quantity[index],
                    b_box_30x30x30: false,
                    b_box_50x50x50: false,
                    b_box_250x180x100: false,
                    b_box_380x300x230: false,
                    b_hot_box: false,
                    b_lathing: false,
                    b_namatrasnik_220x140x40: false,
                    b_namatrasnik_220x220x40: false,
                    b_palleting: false,
                    b_poddoning: false,
                    b_stretch_film: false,
                    b_tire: false
                }]
        },
        from_order: "order_from_web"
    };
}

//возвращает запрос к API Луча
function getQuery(data) {
    return fetch(`https://api.tk-luch.ru/api_calc_for_test`, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: 'json_order=' + encodeURIComponent(JSON.stringify(data))
    })
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

//пост обработка данных перед отдачей клиенту
//если cityID меньше 0 (основной город), то расчёт на сайте ПЭКа производится без учёта забора груза, хотя информация по забору предоставляется
//эту ситуацию можно обыграть, но надо ли?
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Луч',
            price: 0,
            days: '1 - 2',
        },
        detail: []
    };

    for(let i = 0; i < res.length; i++) {

        data.main.price += +res[i].sum_carrying;

        data.detail.push({
            name: `Место ${i+1}`,
            value: +res[i].sum_carrying + ' р.'
        });
    }

    //Луч может выдать стоимость перевозки 0 р., к примеру маршрут Нижневартовск - Лангепас
    if(data.main.price === 0) {
        throw new Error('Luch: could not calculate delivery');
    }

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    ctx.request.body.derival = await getCity(ctx.request.body.derival);
    ctx.request.body.arrival = await getCity(ctx.request.body.arrival);

    //сформировать массив с запросами
    //возможно указывать кол-во однотипных мест, но нельзя запросить несколько разных мест
    const queries = [];
    for (let i = 0; i < ctx.request.body.width.length; i++) {
        queries.push(getQuery(makeSearchParameters(ctx.request.body, i)));
    }

    await Promise.all(queries)
        .then(res => {
            // console.log(res);
            ctx.body = postProcessing(res);
        })
        .catch(err => {
            // console.log(err.message);
            throw new Error(`Error API Luch: ${err.message}`);
        });
}

//обновить справочник населённых пунктов в БД
//Луч не отдаёт справочник городов, взамен этого все города содержатся в выпадающемсписке select на фронт-енде
//населенные пункты берутся от туда
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('https://elnakl.tk-luch.ru/calc')
        .then(async response => {
            if (response.ok) {
                const res = await response.text();
                // console.log(res);

                const start = Date.now();
                let i = 0;

                // очистить коллекцию населённых пунктов
                await LuchHandbookPlaces.deleteMany();

                const dom = new JSDOM(res);
                const node = dom.window.document.querySelectorAll('#city_from > option');

                for (const city of node) {
                    if (!city.value) continue;
                    await LuchHandbookPlaces.create({ name: city.value });
                    if (!(++i % 100)) console.log('write: ', i);
                }

                console.log('Luch handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                ctx.body = 'Luch handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
            }
            else {
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(error => {
            console.log(error);
            ctx.throw(400, error.message);
        });
}



function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}
