const fetch = require('node-fetch');
const PEKHandbookPlaces = require('@transport/models/PEKHandbookPlaces');


//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Кита
async function getCity(data) {
    try {
        const project = {
            _id: 0,
            name: 1,
            region: 1,
            cityID: 1
        };
        //попытка найти по регулярке
        const regexp = new RegExp("^" + data.searchString);
        let searchParams = {
            name: {
                $regex: regexp, $options: "i"
            }
        };

        let city = await PEKHandbookPlaces.aggregate([
            { $match: searchParams },
            { $limit: 50 },
            { $project: project }
        ]);
        if (city.length === 1) return city[0];

        //попытка найти по названию
        searchParams = {
            name: data.searchString
        };

        city = await PEKHandbookPlaces.aggregate([
            { $match: searchParams },
            { $limit: 50 },
            { $project: project }
        ]);
        // console.log(city);

        if (city.length === 1) return city[0];
        else throw new Error("Pek: city not found");
        //здесь можно дописать 3-ю попытку найти город,
        //при которой составляется Полное назнвание города, включая обл.
        //для примера попробуй найти г. Дубна (Моск. обл.)
        //1-й шаг найдёт 2 города, второй вообще не найдёт, поэтому есть шанс отловитьего составив полное название
        //правда, это сработает не со всеми городами, но как вариант...
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

    let arr = [
        `places[0][]=${parameters.width}`, //Ширина
        `places[0][]=${parameters.length}`, //Длина
        `places[0][]=${parameters.height}`, //Высота
        `places[0][]=${(parameters.width * parameters.length * parameters.height)}`, //Объем
        `places[0][]=${parameters.weight}`, //Вес
        `places[0][]=1`, //Признак негабаритности груза
        `places[0][]=1`, //Признак ЗУ
        `take[town]=${parameters.derival.cityID}`, //ID города забора 
        `take[tent]=0`, //требуется растентровка при заборе 
        `take[gidro]=0`, //требуется гидролифт при заборе 
        `take[manip]=0`, //требуется манипулятор при заборе 
        `take[speed]=0`, //Срочный забор (только для Москвы)
        `take[moscow]=0`, //Без въезда, МОЖД, ТТК, Садовое. Значения соответственно: 0,1,2,3
        `deliver[town]=${parameters.arrival.cityID}`, //ID города доставки
        `deliver[tent]=0`, //Требуется растентровка при доставке
        `deliver[gidro]=0`, //Требуется гидролифт при доставке
        `deliver[manip]=0`, //Требуется манипулятор при доставке
        `deliver[speed]=0`, //Срочная доставка (только для Москвы)
        `deliver[moscow]=0`, //Без въезда, МОЖД, ТТК, Садовое. Значения соответственно: 0,1,2,3 
        `plombir:0`, //Количество пломб
        `strah:1`, //Величина страховки
        `ashan:0`, //Доставка в Ашан
        `night:0`, //Забор в ночное время
        `pal:0`, //Требуется Запалечивание груза (0 - не требуется, значение больше нуля - количество палет)
        `pallets:0`, //Кол-во палет для расчет услуги палетной перевозки (только там, где эта услуга предоставляется)
    ];

    return arr.join('&');
}

//пост обработка данных перед отдачей клиенту
//если cityID меньше 0 (основной город), то расчёт на сайте ПЭКа производится без учёта забора груза, хотя информация по забору предоставляется
//эту ситуацию можно обыграть, но надо ли?
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'ПЭК',
            price: res.take[2] + res.auto[2] + (res.ADD ? res.ADD[3] : 0) + (res.ADD_1 ? res.ADD_1[3] : 0) + (res.ADD_2 ? res.ADD_2[3] : 0) + (res.ADD_3 ? res.ADD_3[3] : 0),
            days: res.periods_days || '',
        },
        detail: []
    };

    data.detail.push({
        name: `${res.take[0]} из г. ${res.take[1]}`,
        value: res.take[2] + ' р.'
    });

    data.detail.push({
        name: `${res.auto[0]} ${res.auto[1]}`,
        value: res.auto[2] + ' р.'
    });

    if (res.ADD) {
        data.detail.push({
            name: res.ADD[1],
            value: res.ADD[3] + ' р.'
        });
    }
    if (res.ADD_1) {
        data.detail.push({
            name: res.ADD_1[1],
            value: res.ADD_1[3] + ' р.'
        });
    }
    if (res.ADD_2) {
        data.detail.push({
            name: res.ADD_2[1],
            value: res.ADD_2[3] + ' р.'
        });
    }
    if (res.ADD_3) {
        data.detail.push({
            name: res.ADD_3[1],
            value: res.ADD_3[3] + ' р.'
        });
    }

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    await fetch('http://calc.pecom.ru/bitrix/components/pecom/calc/ajax.php?' + data)
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);
                ctx.body = postProcessing(res);
            }
            else {
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
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('http://www.pecom.ru/ru/calc/towns.php')
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                const start = Date.now();
                let i = 0;

                //очистить коллекцию населённых пунктов
                await PEKHandbookPlaces.deleteMany();

                for (const region in res) {
                    for (const cityID in res[region]) {
                        if (!(++i % 50)) console.log('write: ', i);

                        try {
                            await PEKHandbookPlaces.create({
                                cityID: cityID,
                                name: res[region][cityID],
                                region: region,
                            })
                        }
                        catch (error) {
                            console.log(error)
                            continue;
                        }
                    }
                }

                console.log('PEK handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                ctx.body = 'PEK handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
            }
            else {
                // console.log(await response.json());
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(error => {
            console.log(err);
            ctx.throw(400, err.message);
        });
};