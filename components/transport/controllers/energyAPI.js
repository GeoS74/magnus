const fetch = require('node-fetch');
const EnergyHandbookPlaces = require('@transport/models/EnergyHandbookPlaces');
const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');

//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Энергии
async function getCity(data) {
    try {
        //попытка найти город по названию и коду региона
        //в справочнике могут быть дубликаты, поэтому используется не findOne, а find с проверкой кол-ва полученных строк
        let city = await EnergyHandbookPlaces.find({
            $and: [
                { name: new RegExp(`^${data.searchString.toLowerCase()}`, 'i') },
                { regcode: data.regcode }
            ]
        });

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
            else if (response.status === 429) { //превышение лимита запросов к API
                throw new Error(`Error limit query for Energy`);
            }
            else {
                const res = await response.json();
                console.log(res);
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            // console.log('~~~~~Error API Energy~~~~~');
            // console.log(err);
            throw new Error(`Error API Energy: ${err.message}`);
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
                        });
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }

                //присвоить каждому населенному пункту код региона в соответствии с КЛАДР
                await updateRegname();
                //финишное исправление косяков
                await handFixed();

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

//после присвоения кода региона, останутся населенные пункты с пустым названием региона
//примерно в кол-ве 25 шт., почти все города не из РФ, кроме 2-х:
//  -Москва
//  -Забайкальск
//Забайкальск отсутствует сейчас в основном справочнике, поэтому он не интересен,
//Москве надо добавить код региона
async function handFixed() {
    const city = await MainHandbookPlaces.findOne({searchString:"Москва"});
    await EnergyHandbookPlaces.findOneAndUpdate({
        name: "Москва"
    },{
        regcode: city.regcode
    })
}

//присвоить каждому начеленному пункту код региона в соответствии с КЛАДР
async function updateRegname() {
    const cities = await EnergyHandbookPlaces.find();

    for (city of cities) {
        let regname = city.regname;
        if (!regname.length) continue; //выкинуть пункты без имени региона

        //если элемент не верхнего уровня - взять regname родителя
        if (city.parentID !== -1) {
            const parent = await EnergyHandbookPlaces.findOne({ cityID: city.parentID });
            regname = parent.regname;
        }

        //разбить название региона на слова и взять самое длинное
        const arr = regname.split(/[^а-яёА-ЯЁ]+/); //бесполезных символов может быть несколько подряд
        const longword = getLongWord(arr);

        //найти регион
        const region = await MainHandbookPlaces.findOne({
            regname: { $regex: getRegexp(longword) }
        })

        if (region !== null) {
            await insertRegCode(city, region.regcode);
        }
        else {
            //у Энергии есть Казахстан, Киргизия и т.д.
            //попытка обработать ошибку поиска региона
            //перебрать все слова и по каждому делать поиск
            for (const v of arr) {
                if (v.toLowerCase() === 'республик') continue; //игнорировать (у Энергии есть "Республик Крым" :)
                if (v.toLowerCase() === 'республика') continue; //игнорировать
                if (v.toLowerCase() === 'область') continue; //игнорировать
                if (v.toLowerCase() === 'автономный') continue; //игнорировать

                const region = await MainHandbookPlaces.findOne({
                    regname: { $regex: getRegexp(v) }
                });

                if (region) {
                    await insertRegCode(city, region.regcode);
                    break;
                }
            }
        }
    }
}

async function insertRegCode(city, regcode) {
    await EnergyHandbookPlaces.findOneAndUpdate({
        _id: city._id
    }, {
        regcode: regcode
    })
}

function getRegexp(needle) {
    //1) если поиск по слову Омская, то надо искать совпадение в начале
    //  иначе будет совпадение со словом "Костромская"
    //2) после искомого слова должен быть пробел
    //  либо знак '/' для Якутии
    //  либо '.' для Чувашии
    if (needle.toLowerCase() === 'омская') {
        return new RegExp(`^${needle}[\\s/.]`, "i");
    }
    else {
        return new RegExp(`${needle}[\\s/.]`, "i");
    }
}

//получает регион в виде массива
//возвращает самое длинное слово в названии региона
function getLongWord(words) {
    let max = 0;
    let longword = '';
    for (const w of words) {
        if (w.toLowerCase() === 'республик') continue; //игнорировать (у Энергии есть "Республик Крым" :)
        if (w.toLowerCase() === 'республика') continue; //игнорировать
        if (w.toLowerCase() === 'область') continue; //игнорировать
        if (w.toLowerCase() === 'автономный') continue; //игнорировать
        if (w.length > max) {
            max = w.length;
            longword = w;
        }
    }
    return longword;
}