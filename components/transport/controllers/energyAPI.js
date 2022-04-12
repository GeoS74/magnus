const fetch = require('node-fetch');
const EnergyHandbookPlaces = require('@transport/models/EnergyHandbookPlaces');

//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Энергии
async function getCity(data) {
    try {
        //попытка найти город по названию
        //в справочнике могут быть дубликаты, поэтому используется не findOne, а find с проверкой кол-ва полученных строк
        let city = await EnergyHandbookPlaces.find({ name: data.searchString });

        if (city.length === 1) return city[0];
        else throw new Error(`Energy: city ${data.searchString} not found`);
    }
    catch (error) {
        // console.log(error.message);
        throw new Error(error.message);
    }
}

//параметры груза
function makeCargo(param) {
    const cargo = [];
    for (let i = 0; i < param.width.length; i++) {
        for (let n = 0; n < param.quantity[i]; n++) {
            cargo.push({
                weight: param.weight[i],
                width: param.width[i],
                height: param.height[i],
                length: param.length[i],
                isStandardSize: false //Данный параметр используется только в методе /vipPrice Если передано true, то данное место принудительно считается габаритным, даже если оно негабаритное. Если передано false, то габарит или негабарит определяется в зависимости от размеров места. Если не передано, берется значение false.
            });
        }
    }
    return cargo;
}

//формирование параметров запроса для расчёта перевозки
async function makeSearchParameters(parameters) {
    parameters.derival = await getCity(parameters.derival);
    parameters.arrival = await getCity(parameters.arrival);

    return {
        idCityFrom: parameters.derival.cityID, //Id города откуда
        idCityTo: parameters.arrival.cityID, //Id города куда
        cover: 0, //1-конверт, 0-нет. Если конверт, то items не обязательны
        idCurrency: 0, //Id валюты, по умолчанию - рубли
        items: makeCargo(parameters), //Места для рассчета стоимости 
        declaredCargoPrice: 0, //Заявленная стоимость груза. Данный параметр необходим для рассчета стоимости страховки. Если не передан, либо передан 0, то стоимость стразовки = 0 
    };
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Энергия',
            price: res.transfer[0].price,
            days: res.transfer[0].interval.replace(' дней', '') || '',
        },
        detail: []
    };

    data.detail.push({
        name: 'Не включёно в расчёт',
        value: ''
    });
    data.detail.push({
        name: 'Доставка от отправителя до терминала',
        value: res.request.price + ' р.'
    });
    data.detail.push({
        name: 'Доставка от терминала до получателя',
        value: res.delivery.price + ' р.'
    });
    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    await fetch(`https://api2.nrg-tk.ru/v2/price`, {
        headers: {
            'Content-Type': 'application/json',
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
            console.log('~~~~~Error API Energy~~~~~');
            // console.log(err);
            throw new Error(err.message);
        });
}

//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('https://api2.nrg-tk.ru/v2/cities?lang=ru')
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                const start = Date.now();
                let i = 0;

                // очистить коллекцию населённых пунктов
                await EnergyHandbookPlaces.deleteMany();

                for (const city of res.cityList) {
                    if (!(++i % 1000)) console.log('write: ', i);
                    try {
                        await EnergyHandbookPlaces.create({
                            cityID: city.id,
                            name: city.name,
                            parentID: city.parentId,
                            isRegionalDelivery: city.isRegionalDelivery,
                            regname: city.description,
                            type: city.type,
                        })
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }

                console.log('Energy handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                ctx.body = 'Energy handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
            }
            else {
                console.log(await response.json());
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(error => {
            console.log(error.message);
            ctx.throw(400, error.message);
        });
}