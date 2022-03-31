const fetch = require('node-fetch');
const KitHandbookPlaces = require('@transport/models/KitHandbookPlaces');


//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Кита
//справочник КИТа изменяет коды КЛАДР, укорачивая их на 1 символ
//Пример:
//7400000100000 - код Челябинска из основного справочника
//740000100000 -  код Челябинска из справочника КИТа
//код региона состоит всего из 2 символов
async function getCity(data) {
    try {
        //попытка найти город по коду
        let city = await KitHandbookPlaces
            .findOne({ code: data.code.slice(0, 2) + data.code.slice(3) }); //выкинуть 1 символ из кода города
        if (city) return city;

        //попытка найти город по названию и коду региона
        city = await KitHandbookPlaces
            .findOne({
                name: data.searchString,
                regcode: data.regcode.slice(0, 2), //оставить первые 2 символа кода региона
            });

        if (city) return city;
        else throw new Error("Kit: city not found");
    }
    catch (error) {
        // console.log(error.message);
        throw new Error(error.message);
    }
}

//формирование параметров запроса для расчёта перевозки
//КИТ габариты груза считает в см
async function makeSearchParameters(parameters) {
    parameters.derival = await getCity(parameters.derival);
    parameters.arrival = await getCity(parameters.arrival);

    const data = {
        city_pickup_code: parameters.derival.code, //Код города откуда
        city_delivery_code: parameters.arrival.code, //Код города куда
        declared_price: 100, //Объявленная стоимость груза (руб) минимальное значение 100р.
        places: [],
        insurance: 0, //Услуга страхования груза (1 - да /0 - нет)	Да (если стоимость груза равна или более 10 000 руб.)
    };

    for (let i = 0; i < parameters.width.length; i++) {
        data.places.push({
            count_place: parameters.quantity[i], //Количество мест в позиции
            height: parameters.height[i] * 100, //Высота груза (см) позиции
            width: parameters.width[i] * 100, //Ширина груза (см) позиции
            length: parameters.length[i] * 100, //Длина груза (см) позиции
            weight: parameters.weight[i], //Масса (кг) позиции
        });
    }

    return data;
}



//пост обработка данных перед отдачей клиенту
//API отдает не только перевозку standart, но и другие варианты
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'ТК Кит',
            price: res[0].standart.cost,
            days: res[0].standart.time || '',
        },
        detail: []
    };

    for (const d of res[0].standart.detail) {
        if (d.name === 'Груз') d.name = 'Стоимость перевозки';
        data.detail.push({
            name: d.name,
            value: d.price + ' р.'
        });
    }

    return data;
}


//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    await fetch('https://capi.gtdel.com/1.0/order/calculate?token=' + process.env.KIT, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(data)
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                // for(const e of res[0].standart.detail) {
                //     console.log(e);
                // }
                ctx.body = postProcessing(res);
            }
            else if (response.status === 429) {
                console.log('Превышен лимит запросов к API KIT');
                throw new Error(`KIT API: Rate limit exceeded`);
            }
            else {
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log('~~~~~Error API Kit~~~~~');
            // console.log(err);
            throw new Error(err.message);
        });
}


//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    // await fetch('https://capi.gtdel.com/1.0/geography/city/get-list?token=' + process.env.KIT)
    await fetch('https://capi.gtdel.com/1.0/tdd/city/get-list?token=' + process.env.KIT)
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                const start = Date.now();
                let i = 0;

                // очистить коллекцию населённых пунктов
                await KitHandbookPlaces.deleteMany();

                for (const city of res) {
                    //API Кита отдаёт не только города России, но также и СНГ
                    if (city.country_code !== "RU") continue;
                    console.log(city);
                    if (!(++i % 1000)) console.log('write: ', i);
                    try {
                        await KitHandbookPlaces.create({
                            code: city.code,
                            name: city.name,
                            regcode: city.region_code,
                            requiredPickup: city.required_pickup,
                            requiredDelivery: city.required_delivery,
                        })
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }

                console.log('Kit handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                ctx.body = 'Kit handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
            }
            else {
                // console.log(await response.json());
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(error => {
            console.log(error);
            ctx.throw(400, error.message);
        });
};