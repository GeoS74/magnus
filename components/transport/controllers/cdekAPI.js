const fetch = require('node-fetch');
const CdekHandbookPlaces = require('@transport/models/CdekHandbookPlaces');


//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником СДЭКа
async function getCity(data) {
    try {
        //попытка найти город по коду
        let city = await CdekHandbookPlaces.findOne({ code: data.code });

        if (city) return city;

        //попытка найти город по названию и коду региона
        city = await CdekHandbookPlaces
            .findOne({
                name: data.searchString,
                regcode: data.regcode,
            });

        if (city) return city;
        else throw new Error("Cdek: city not found");
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
        `weight=${parameters.weight}`, //Вес, кг
        `width=${parameters.width*100}`, //Ширина, см
        `length=${parameters.length*100}`, //Длина, см
        `height=${parameters.height*100}`, //Высота, см
        `from=${parameters.derival.codeCDEK}`, //код города отправителя в системе СДЭК
        `to=${parameters.arrival.codeCDEK}`, //код города получателя в системе СДЭК
        `contract=0`, //вид договора СДЭК (0 - нет договора)
            // pay_to – параметр, указывающий, что оплату доставки производит отправитель. 
            // Может принимать значения: 0 – доставку оплачивает получатель, 1 – доставку оплачивает отправитель. 
            // Если параметр не указан, то считается, что доставку оплачивает отправитель. 
            // Если параметр contract = 0, и доставку оплачивает получатель, то стоимость доставки увеличивается на 20%. 
            // Если contract = 2, и с получателя берется оплата за товар наложенным платежом, 
            // то с помощью параметра pay_to можно указать учитывать ли стоимость доставки при расчете комисси за наложенный платеж, 
            // для это нужно указать pay_to = 0. Если contract = 2, наложенный платеж за товар не взимается, а pay_to = 0, 
            // то считается что с получателя надо взять оплату за доставку, в этом случае также производится расчет комиссии за наложенный платеж.
        `pay_to=1`,
        `tariffs=62`,   //тариф для расчёта стоимости доставки (подходящиеварианты 10,1,15,18)
                        //тариф 62 - это Магистральный экспресс склад-склад (самый дешевый тариф)
        `insurance=0`, //Объявленная стоимость отправления
        `cost=0`, //стоимость отправления, взимаемая с получателя при наложенном платеже (только для Интернет-магазинов), для расчета комиссии за наложенный платеж. 
    ];

    return arr.join('&');
}


//пост обработка данных перед отдачей клиенту
//если cityID меньше 0 (основной город), то расчёт на сайте ПЭКа производится без учёта забора груза, хотя информация по забору предоставляется
//эту ситуацию можно обыграть, но надо ли?
function postProcessing(res) {
    if(res[62].error) throw new Error(`Error CDEK: ${res[62].error[0].text}`);

    const data = {
        main: {
            carrier: 'СДЭК',
            price: res[62].result.price,
            days: `${res[62].result.day_min} - ${res[62].result.day_max}` || '',
        },
        detail: []
    };

    // data.detail.push({
    //     name: `${res.take[0]} из г. ${res.take[1]}`,
    //     value: res.take[2] + ' р.'
    // });

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    await fetch('https://kit.cdek-calc.ru/api/?' + data)
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res[62].error);
                ctx.body = postProcessing(res);
            }
            else {
                const res = await response.json();
                console.log(res);

                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log(err.message);
        });
}


//обновить справочник населённых пунктов в БД
//эта функция вызывается рекурсивно, т.к. максимальное кол-во населенных пунктов в запросе к API составляет 1000
module.exports.updateHandbookPlaces = async ctx => {
    ctx.page = ++ctx.page || 0;
    if (ctx.page === 0) {
        ctx.startUpdate = Date.now();
        //очистить коллекцию населённых пунктов
        await CdekHandbookPlaces.deleteMany();
    }

    await fetch(`https://api.cdek.ru/v2/location/cities/?country_codes=RU,TR&page=${ctx.page}&size=1000`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.jwtoken}`
        },
        method: 'GET',
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);
                console.log('write: ', (ctx.page * 1000));

                for (const d of res) {
                    try {
                        await CdekHandbookPlaces.create({
                            code: d.kladr_code,
                            name: d.city,
                            codeCDEK: d.code,
                            regcodeCDEK: d.region_code,
                            regname: d.region,
                            subRegion: d.sub_region,
                            postalCodes: d.postal_codes,
                            regcode: (d.kladr_code ? d.kladr_code.slice(0, 2) + "00000000000" : undefined)
                        })
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }

                if (res.length) return await this.updateHandbookPlaces(ctx); //recursion
                else {
                    console.log('CDEK handbook places is updated. Run time: ', ((Date.now() - ctx.startUpdate) / 1000), ' sek rows: ', (ctx.page * 1000))
                    ctx.body = 'CDEK handbook places is updated. Run time: ' + ((Date.now() - ctx.startUpdate) / 1000) + ' sec rows: ' + (ctx.page * 1000);
                }
            }
            else {
                // console.log(await response.json());
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log(err);
            throw new Error(err.message);
        });
}

//получение JW-Token
//для получения JWTokena используется тестовый аккаунт (см. здесь: https://api-docs.cdek.ru/29923849.html)
module.exports.getJWToken = async (ctx, next) => {
    const account = 'EMscd6r9JnFiQ3bLoyjJY6eM78JrJceI';
    const password = 'PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG';
    //grant_type: тип аутентификации, доступное значение: client_credentials;

    await fetch(`https://api.edu.cdek.ru/v2/oauth/token?grant_type=client_credentials&client_id=${account}&client_secret=${password}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST'
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                ctx.jwtoken = res.access_token;
                return next();
            }
            else {
                // console.log(await response.json());
                throw new Error(`Error gets JW-token - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log(err);
            throw new Error(err.message);
        });
}