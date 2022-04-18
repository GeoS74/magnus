const fetch = require('node-fetch');
const MagicTransHandbookPlaces = require('@transport/models/MagicTransHandbookPlaces');
const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');




//расчет доставки
module.exports.calculation = async (ctx) => {
    const data = [
        'from=121',
        'to=399',
        'items[0][weight]=10',
        'items[0][width]=1',
        'items[0][length]=1',
        'items[0][height]=1',
        'items[0][count]=5',
    ];


    await fetch(`http://magic-trans.ru/api/v1/delivery/calculate/?${data.join('&')}`, {
        headers: {
            // 'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        method: 'GET',
        // body: JSON.stringify(cargo)
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                console.log(res);
                console.log(res.result.routes);
                // ctx.body = postProcessing(res);
            }
            else {
                const res = await response.json();
                console.log(res);
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            throw new Error(`Error API MagicTrans: ${err.message}`);
        });
}


///после присвоения кода региона, останутся населенные пункты с пустым названием региона
//"Троицк, Московская область"
async function handFixed() {
    const city = await MainHandbookPlaces.findOne({ fullName: "Троицк г. (Москва г.)" });
    await MagicTransHandbookPlaces.findOneAndUpdate({
        name: "Троицк, Московская область"
    }, {
        regcode: city.regcode
    })
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

        //города, занесённые в справочник с ошибками в названии региона
        //Чита -> Забайкальскй
        //Бодайбо -> Иркутский
        //Улан-Удэ -> Республики
        //Якутск -> Республики
        if (w.toLowerCase() === 'забайкальскй') continue; //игнорировать
        if (w.toLowerCase() === 'иркутский') continue; //игнорировать
        if (w.toLowerCase() === 'республики') continue; //игнорировать
        if (w.length > max) {
            max = w.length;
            longword = w;
        }
    }
    return longword;
}

async function insertRegCode(city, regcode) {
    await MagicTransHandbookPlaces.findOneAndUpdate({
        _id: city._id
    }, {
        regcode: regcode
    })
        .catch(err => {
            console.log(err)
        })
}

async function updateRegname() {
    const cities = await MainHandbookPlaces.find();

    for (const city of cities) {
        const magicCities = await MagicTransHandbookPlaces
            .find({ name: { $regex: new RegExp(`^${city.searchString}`, "i") } });

        //нет совпадений - ничего не делать
        if (!magicCities.length) {
            continue;
        }
        //ровно одно совпадение названия города в справочнике Мейджика
        else if (magicCities.length === 1) {
            //разбить название региона на слова
            const arr = magicCities[0].name.split(',');
            //города без региона
            if (arr.length === 1) {
                if (city.searchString === 'Плес') continue; //(даёт совпадение с Плесецк, в Мейджике нет города Плес)
                if (city.searchString === 'Буй') continue; //(даёт совпадение с Буйнакск, в Мейджике нет города Буй)
                if (city.searchString === 'Комсомольск') continue; //(даёт совпадение с Комсомольск-на-Амуре, в Мейджике нет города Комсомольск)
                if (city.searchString === 'Ростов') continue; //(даёт совпадение с Ростов-на-Дону, в Мейджике нет города Ростов)

                //записать regcode
                await insertRegCode(magicCities[0], city.regcode);
            }
            //города с регионами
            else {
                let needle = getLongWord(arr.slice(arr.length - 1)[0].split(' '));

                //needle будет пустым если это "Ивангород", 
                //т.к. в справонике он записан так: Ивангород,  Ленинградская область,
                //запятая в конце даёт пустой элемент в массиве
                if (!needle) {
                    needle = 'Ленинградская'
                }

                const region = await MainHandbookPlaces.findOne({
                    regname: { $regex: new RegExp(`${needle}`, 'i') }
                });
                if (!region) continue;

                //записать regcode
                await insertRegCode(magicCities[0], city.regcode);
            }
        }
        //более одного совпадения
        else if (magicCities.length > 1) {

            //запрос "в лоб" для поиска названий городов без регионов
            let magicCity = await MagicTransHandbookPlaces
                .findOne({ name: city.searchString });
            if (magicCity) {
                //записать regcode
                await insertRegCode(magicCity, city.regcode);
                continue;
            }

            //новый запрос с уточнением по региону
            magicCity = await MagicTransHandbookPlaces
                .findOne({ name: { $regex: new RegExp(`^${city.searchString}.+${city.regname.split(' ')[0]}`, "i") } });

            if (magicCity) {
                //записать regcode
                await insertRegCode(magicCity, city.regcode);
                continue;
            }
        }
    }
}

//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    await fetch(`http://magic-trans.ru/api/v1/dictionary/getCityList`)
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);

                const start = Date.now();
                let i = 0;

                // очистить коллекцию населённых пунктов
                await MagicTransHandbookPlaces.deleteMany();

                for (const city of res.result) {
                    if (!(++i % 1000)) console.log('write: ', i);
                    try {
                        await MagicTransHandbookPlaces.create({
                            cityID: city.id,
                            name: city.name,
                            terminal: city.terminal,
                            delivery: city.delivery,
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

                console.log('MagicTrans handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                ctx.body = 'MagicTrans handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
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