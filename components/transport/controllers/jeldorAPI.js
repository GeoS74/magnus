const fetch = require('node-fetch');
const JeldorHandbookPlaces = require('@transport/models/JeldorHandbookPlaces');
const JeldorHandbookTerminals = require('@transport/models/JeldorHandbookTerminals');

//поиск города с терминалом ЖелДорЭкспедиции
//результат участвует в расчёте: если терминал есть забор/доставка не требуется и наоборот
async function requiredDelivery(city) {
    const t = await JeldorHandbookPlaces.findOne({ searchString: city });
    return t === null ? 1 : 0;
}

//type - тип терминала. приём-1/выдача-2
async function getTerminal(data, type) {
    try {
        //попытка найти город по коду
        let city = await JeldorHandbookTerminals
            .findOne({ code: data.code, type: type });
        if (city) return city;

        //попытка найти город по названию
        city = await JeldorHandbookTerminals
            .findOne({ city: data.searchString, type: type });
        if (city) return city;
        else throw new Error(`Jeldor: terminal ${data.searchString} not found`);
    }
    catch (error) {
        // console.log(error.message);
        throw new Error(error.message);
    }
}


async function makeAddress(parameters, byFilial) {
    if (byFilial) {
        parameters.derival = await getTerminal(parameters.derival, 1);
        parameters.arrival = await getTerminal(parameters.arrival, 2);

        return [
            `from=${parameters.derival.terminalID}`, //id терминала отправления
            `to=${parameters.arrival.terminalID}` //id терминала  получателя
        ].join('&');
    }

    //здесь жёстко прописано, что это город, иначе Челябинск не просчитывается
    //этот баг надо проработать
    return [
        `addr_from=г. ${parameters.derival.searchString.toLowerCase()}`, //Адрес населенного пункта отправления
        `addr_to=г. ${parameters.arrival.searchString.toLowerCase()}`, //Адрес населенного пункта назначения
        `from_kladr=${parameters.derival.code}`, //Идентификатор КЛАДР населенного пункта отправления
        `to_kladr=${parameters.arrival.code}`, //Идентификатор КЛАДР населенного пункта назначения
    ].join('&');
}

//формирование параметров запроса для расчёта перевозки
//параметры должны передаваться GET запросом
//расчёт с использованием КЛАДР даёт ошибки, зато с названиями городов работает
//надо разобраться с расчётом негабаритного груза
//расчёт проводится исходя из общего объёма и веса груза
async function makeSearchParameters(parameters, byFilial) {
    let arr = [
        // `from_kladr=${parameters.derival.code}`, //Идентификатор КЛАДР населенного пункта отправления
        // `to_kladr=${parameters.arrival.code}`, //Идентификатор КЛАДР населенного пункта назначения
        //здесь жёстко прописано, что это город, иначе Челябинск не просчитывается
        //этот баг надо исправить внеся изменения в mainHandbookPlaces
        // `addr_from=г. ${parameters.derival.searchString.toLowerCase()}`, //Адрес населенного пункта отправления
        // `addr_to=г. ${parameters.arrival.searchString.toLowerCase()}`, //Адрес населенного пункта назначения

        await makeAddress(parameters, byFilial),
        `type=1`, //Тип вида доставки. Список типов доставки можно получить запросом /calculator/PriceTypeListAvailable
        //1 - доставка сборных грузов
        makeCargo(parameters),
        // `weight=100`, //Вес груза в кг.
        // `volume=100`, //Объем в м3
        // `length=1`, //Длина, м. (параметры для самого габаритного места), м | При отсутствии параметра volume участвует в вычислении
        // `width=1`, //Ширина, м. (параметры для самого габаритного места), м | При отсутствии параметра volume участвует в вычислении
        // `height=1`, //Высота, м (параметры для самого габаритного места), м | При отсутствии параметра volume участвует в вычислении
        // `quantity=1`, //Количество мест | При отсутствии параметра volume участвует в вычислении общего объема
        `pickup=${await requiredDelivery(parameters.derival.searchString)}`, //Требуется ли забор груза
        `delivery=${await requiredDelivery(parameters.arrival.searchString)}`, //Требуется ли доставка груза
        `declared=1`, //Объявленная ценность
        `oversizeWeight=0`, //Вес негабаритного груза, кг.
        `oversizeVolume=0`, //Объем негабаритного груза, м3
    ];
    return arr.join('&');
}

//параметры груза
function makeCargo(parameters) {
    let weight = 0;
    let length = 0;
    let width = 0;
    let height = 0;
    let volume = 0;


    for (let i = 0; i < parameters.width.length; i++) {
        weight += parameters.weight[i] * parameters.quantity[i];
        volume += parameters.length[i] * parameters.width[i] * parameters.height[i] * parameters.quantity[i];
    }
    return [
        `weight=${+weight.toFixed(3)}`,
        `volume=${+volume.toFixed(3)}`
    ].join('&');
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'ЖелДорЭкспедиция',
            price: 0,
            days: `${res.mindays}-${res.maxdays}` || '',
        },
        detail: []
    };

    //обработка расчёта по адресам
    if (res.from && res.to) {
        data.detail.push({
            name: 'Терминал отправки',
            value: 'г.' + res.from.mst_name
        });

        data.detail.push({
            name: 'Терминал получатель',
            value: 'г.' + res.to.mst_name
        });
    }

    for (const s of res.services) {
        switch (s.item) {
            case 'terminal': 
                data.main.price = s.price; break;
            //значения pickup и delivery могут быть только при расчёте по филиалам
            case 'pickup':
                data.detail.push({
                    name: 'Дополнительно - забор груза от адреса',
                    value: s.price + 'р.'
                }); break;
            case 'delivery':
                data.detail.push({
                    name: 'Дополнительно - доставка груза до адреса',
                    value: s.price + 'р.'
                }); break;
        }
    }
    return data;
}

//расчет доставки
// использует 2 попытки и 2 разных метода API
// 1) расчёт ведется по адресам, т.е. в строке запроса просто указывается название города
//     если ошибка используется 2-ой вариант
// 2) расчёт по терминалам. Здесь ищется терминал по коду КЛАДР
module.exports.calculation = async (ctx) => {
    const data = await makeSearchParameters(ctx.request.body);

    await fetch('https://api.jde.ru/vD/calculator/PriceAddress?' + data + `&user=${process.env.JELDOREXP_USER}&token=${process.env.JELDOREXP_TOKEN}`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'GET',
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                //в случае ошибки расчёта сделать попытку расчитать через филиалы
                if (res.error) {
                    //throw new Error(`Error fetch query: ${res.error}`);
                    console.log(`Error API Jeldor calculate by place: ${res.error}`);
                    await calculationByFilial(ctx);
                }
                else if (res.result === '0') {
                    //throw new Error(res.services[0].error);

                    for(const e of res.services) {
                        if(e.error) {
                            console.log(`Error API Jeldor calculate by place: ${e.error}`);
                            break;
                        }
                    }

                    await calculationByFilial(ctx);
                }
                else {
                    ctx.body = postProcessing(res);
                }
            }
            else {
                const res = await response.json();
                console.log(res);
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(error => {
            // console.log('~~~~~Error API Jeldor method city~~~~~');
            // console.log(error.message);
            throw new Error(`Error API Jeldor: ${error.message}`);
        });
}


//попытка расчёта доставки по филиалам
async function calculationByFilial(ctx) {

    const data = await makeSearchParameters(ctx.request.body, true);

    await fetch('https://api.jde.ru/vD/calculator/price?' + data + `&user=${process.env.JELDOREXP_USER}&token=${process.env.JELDOREXP_TOKEN}`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'GET',
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                if (res.error) {
                    throw new Error(`Error fetch query: ${res.error}`);
                }
                else if (res.result === '0') {
                    for(const e of res.services) {
                        if(e.error) {
                            console.log(`Error API Jeldor calculate by place: ${e.error}`);
                            throw new Error(e.error);
                        }
                    }
                }
                else {
                    ctx.body = postProcessing(res);
                }
            }
            else {
                const res = await response.json();
                console.log(res);
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(error => {
            throw new Error(`Error API Jeldor: ${error.message}`);
        });
}

//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('https://api.jde.ru/vD/geo/SearchCity?mode=0')
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                const start = Date.now();
                let i = 0;

                // очистить коллекцию населённых пунктов
                await JeldorHandbookPlaces.deleteMany();

                for (const city of res) {
                    if (!(++i % 100)) console.log('write: ', i);
                    try {
                        await JeldorHandbookPlaces.create({
                            code: city.kladr_code,
                            cityID: city.code,
                            searchString: city.title,
                            aexOnly: city.aex_only,
                        })
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }

                console.log('Jeldor handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                ctx.body = 'Jeldor handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
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

//обновить справочник терминалов в БД
module.exports.updateHandbookTerminals = async ctx => {
    try {
        const start = Date.now();
        let i = 0;
        // очистить коллекцию населённых пунктов
        await JeldorHandbookTerminals.deleteMany();

        i += await updateTerminals(1); //пункты приёма
        i += await updateTerminals(2); //пункты выдачи

        console.log('Jeldor terminals places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
        ctx.body = 'Jeldor terminals places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
    }
    catch (error) {
        console.log(error.message);
        ctx.throw(400, error.message);
    }
}

async function updateTerminals(type) {
    return await fetch('https://api.jde.ru/vD/geo/search?mode=1')
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);
                let i = 0;

                for (const city of res) {
                    if (!(++i % 100)) console.log('write: ', i);
                    try {
                        await JeldorHandbookTerminals.create({
                            terminalID: city.code,
                            title: city.title,
                            city: city.city,
                            code: city.kladr_code,
                            aexOnly: city.aex_only,
                            type: type,
                        })
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }
                return i;
            }
            else {
                // console.log(await response.json());
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
}