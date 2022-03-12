const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); //https://www.npmjs.com/package/node-fetch#loading-and-configuring-the-module
const XLSX = require('xlsx'); //https://github.com/SheetJS/sheetjs
const DellineHandbookPlaces = require('@transport/models/DellineHandbookPlaces');
const DellineHandbookStreets = require('@transport/models/DellineHandbookStreets');
const DellineHandbookTerminals = require('@transport/models/DellineHandbookTerminals');

//принимает данные населенного пункта, полученные из главного справочника и сопоставляет их со справочником Деловых линий
//API Деловых линий требует, чтобы обязательно был указан номер дома,
//это вызывает определенные трудности, т.к. улица выбирается рандомно, либо её может вообще не быть
//чтобы соответствовать требованиям API номер дома устанавливается равным 1, не зависимо от того есть улица или нет
//это даже забавно, но есть ещё одна проблема, связанная с улицами
//если в качестве улицы попадается что-то вроде СНТ, или улица начинается с цифры (250-лет...), то это приводит к ошибке
//поэтому при запросе улицы используется регулярка /^[а-яА-Я]{5}/i
//
async function getCity(data) {
    try {
        //попытка найти город по коду
        let city = await DellineHandbookPlaces
            .findOne({ code: data.code + '000000000000' })
            .populate({
                path: 'streets',
                match: { name: { $regex: /^[а-яА-Я]{5}/i } },
                options: { limit: 1 }
            })
            .populate('terminals');
        if (city) return city;

        //попытка найти город по названию и коду региона
        city = await DellineHandbookPlaces
            .findOne({
                searchString: data.searchString,
                regcode: data.regcode.slice(0, 2) + "00000000000000000000000"
            })
            .populate({
                path: 'streets',
                match: { name: { $regex: /^[а-яА-Я]{5}/i } },
                options: { limit: 1 }
            })
            .populate('terminals');
        
        if (city) return city;
        else throw new Error("DelLine: city not found");
    }
    catch (error) {
        console.log(error.message);
        throw new Error(error.message);
    }
}

//формирование параметров запроса для расчёта перевозки
async function makeSearchParameters(parameters) {
    parameters.derival = await getCity(parameters.derival);
    parameters.arrival = await getCity(parameters.arrival);
    const data = {
        appkey: process.env.DELLINE,
        delivery: { //Информация по перевозке груза
            deliveryType: { //Вид межтерминальной перевозки груза для которого будет рассчитана стоимость
                // Возможные значения:
                //      "auto"- автодоставка;
                //      "express" - экспресс-доставка;
                //      "letter" - письмо;
                //      "avia" - авиадоставка;
                //      "small" - доставка малогабаритного груза.
                type: 'auto'
            },
            derival: { //Данные по доставке груза от отправителя
                produceDate: getFormatDate(parameters.produceDate), //Дата выполнения заказа. Формат: "ГГГГ-ММ-ДД" (Используется только для параметра "request.delivery.derival")
                // Способ доставки груза
                // Возможные значения:
                //      "address"- доставка груза непосредственно от адреса отправителя/до адреса получателя;
                //      "terminal" - доставка груза от/до терминала;
                // variant: 'terminal',
                // //                      это так тут не работате           city: "7700000000000000000000000",
                // terminalID: '4', //ID терминала отправки/доставки груза из "Справочника терминалов"
                variant: 'address',
                address: {
                    // search: "1, Береза с (Курская обл.)"
                    // search: "1, Авиационная ул, Челябинск г (Челябинская обл.)"
                    search: makeAddress(parameters.derival)
                },
                time: {
                    worktimeStart: "10:00",
                    worktimeEnd: "20:00"
                }
            },
            arrival: { //Данные по доставке груза до получателя
                // Способ доставки груза
                // Возможные значения:
                //      "address"- доставка груза непосредственно от адреса отправителя/до адреса получателя;
                //      "terminal" - доставка груза от/до терминала;
                //      "airport" - доставка груза до аэропорта, вариант используется, если в городе, в который необходимо доставить груз, нет терминала "Деловых Линий"
                // variant: 'terminal',
                // city: "7400200300000000000000000",
                variant: 'address',
                address: {
                    // search: "1, Береза д (Псковская обл.)"
                    // search: "1, Невская ул, Псков г (Псковская обл.)"
                    // search: "1, Ашинская ул, Аша г (Челябинская обл.)"
                    search: makeAddress(parameters.arrival)
                },
                time: {
                    worktimeStart: "10:00",
                    worktimeEnd: "20:00"
                }
            },
            // packages: [] //(не обязательно) Данные по упаковке. При отсутствии параметра расчёт производится без учёта услуги
        },
        cargo: { //Информация о грузе
            quantity: parameters.quantity, //кол-во мест
            length: parameters.length,  //длина самого длинного места
            width: parameters.width, //ширина самого широкого места
            height: parameters.height, //высота самого высокого места
            weight: parameters.weight, //вес самого тяжёлого места
            totalVolume: parameters.length * parameters.width * parameters.height, //общий объем груза
            totalWeight: parameters.weight, //общий вес груза
            hazardClass: 0,
            oversizedWeight: parameters.weight, //вес негабаритных грузовых мест
            oversizedVolume: parameters.length * parameters.width * parameters.height, //объем негабаритных грузовых мест
        }
    };

    //если в выбранном населенном пункте есть терминал, то расчёт производится без забора груза от адреса
    if (parameters.derival.terminals.length) {
        data.delivery.derival.variant = 'terminal';
        data.delivery.derival.terminalID = parameters.derival.terminals[0].terminalID;
        delete (data.delivery.derival.address);
    }
    if (parameters.arrival.terminals.length) {
        data.delivery.arrival.variant = 'terminal';
        data.delivery.arrival.terminalID = parameters.arrival.terminals[0].terminalID;
        delete (data.delivery.arrival.address);
    }

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    //эта фнкция может вызываться рекурсивно в случае если при запросе к API Деловых линий будет получена ошибка 180012 (Выбранная дата недоступна)
    //для первого запроса дата устанавливается "завтрашним днём" относительно сегодня :)
    //при рекурсивном вызове к produceDate добавляются сутки
    //рекурсия прекратится если разница между produceDate и сегодня будет более определённого количества дней (см. обработку этой ошибки)
    if (!ctx.request.body.produceDate) {
        ctx.request.body.produceDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
    }
    else {
        ctx.request.body.produceDate = new Date(ctx.request.body.produceDate.getTime() + 1000 * 60 * 60 * 24);
    }

    const data = await makeSearchParameters(ctx.request.body);
    // console.log('+++++++++++++++++++++++++++++');
    // console.log(data);
    // console.log(data.delivery.derival.variant, '-', data.delivery.arrival.variant);
    // throw new Error("hi");

    await fetch('https://api.dellin.ru/v2/calculator.json', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(data)
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                // console.log(res);
                //здесь надо вернуть информацию о перевозчике (тел. терминала, адреса и т.д.)
                //...
                res.carrier = 'Деловые линии';
                ctx.body = res;
            }
            else if (response.status === 400) {
                const res = await response.json();

                for (const err of res.errors) {
                    console.log(err);

                    if (err.code === 180003) { //Выбранный терминал не может принять груз с указанными ВГХ
                        //...
                    }

                    if (err.code === 180002) { //Выбран некорректный адрес
                        if (err.fields[0] == 'delivery.derival.address.search') {
                            ctx.status = 400;
                            return ctx.body = { path: 'derival', message: 'Выбран некорректный адрес' };
                        }
                        if (err.fields[0] == 'delivery.arrival.address.search') {
                            ctx.status = 400;
                            return ctx.body = { path: 'arrival', message: 'Выбран некорректный адрес' };
                        }
                    }

                    if (err.code === 180012) { //Выбранная дата недоступна
                        if (new Date(ctx.request.body.produceDate - Date.now()).getDate() > 10) {
                            break;
                        }
                        await delay(1000); //пауза, чтобы не задолбить API деловых линий
                        return await this.calculation(ctx); //recursion
                    }
                }
                ctx.status = 400;
                ctx.body = { carrier: 'Деловые линии' };
            }
            else {
                const res = await response.json();
                for (const err of res.errors) {
                    console.log(err);
                }
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log('~~~~~Error API DelLine~~~~~');
            console.log(err);
            throw new Error(err.message);
        });
}
//поиск населенного пункта
// module.exports.searchCity__ = async ctx => {
//     try {
//         const regexp = new RegExp("^" + ctx.request.body.city);
//         const city = await DellineHandbookPlaces.aggregate([
//             {
//                 $match: {
//                     searchString: {
//                         $regex: regexp, $options: "i"
//                     }
//                 }
//             },
//             { $limit: 5 },
//             {
//                 $project: {
//                     _id: 0,
//                     name: 1
//                 }
//             }
//         ]);
//         console.log(city);
//         ctx.body = city;
//     } catch (error) {
//         console.log(error);
//         ctx.throw(400, error.message);
//     }
// };
//обновить справочник терминалов в БД
module.exports.updateHandbookTerminals = async ctx => {
    const fpath = path.join(__dirname, `../files/${ctx.delline.fname}`);

    try {
        let open = await fs.promises.open(fpath);
        const cities = await JSON.parse(await open.readFile());
        await open.close();

        const start = Date.now();

        //очистить коллекцию населённых пунктов
        await DellineHandbookTerminals.deleteMany();
        let i = 0;

        //добавить в БД только терминалы с признаком "по умолчанию для города"
        for (let city of cities.city) {
            for (let terminal of city.terminals.terminal) {
                if (terminal.default !== true) continue;
                i++;
                await DellineHandbookTerminals.create({
                    cityID: city.id,
                    code: city.code,
                    terminalID: terminal.id,
                    name: terminal.name,
                    addres: terminal.addres,
                    fullAddress: terminal.fullAddress,
                    default: terminal.default,
                    mainPhone: terminal.mainPhone || undefined,
                })
            }
        }

        console.log('Handbook terminals is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
        ctx.body = 'Handbook terminals is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
    } catch (error) {
        throw new Error(error.message);
    }

    fs.unlink(fpath, err => {
        if (err) console.log(err);
    });
}
//обновить справочник улиц в БД
module.exports.updateHandbookStreets = async ctx => {
    const fpath = path.join(__dirname, `../files/${ctx.delline.fname}`);
    const workbook = XLSX.readFile(fpath, {
        raw: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json(worksheet)
        .map(r => { //преобразование кода в строку (иначе преобразуется в экспоненциальное число)
            r.code = r.code + '';
            return r;
        });

    const start = Date.now();

    //очистить коллекцию населённых пунктов
    await DellineHandbookStreets.deleteMany();

    let i = 0;
    for (const data of arr) {
        if (!(++i % 10000)) console.log('write: ', i);

        try {
            await DellineHandbookStreets.create({
                cityID: data.cityID,
                name: data.name,
                code: data.code,
                searchString: data.searchString,
            })
        }
        catch (error) {
            console.log(error)
            continue;
        }
    }

    fs.unlink(fpath, err => {
        if (err) console.log(err);
    });

    console.log('Handbook streets is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
    ctx.body = 'Handbook streets is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
}
//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    const fpath = path.join(__dirname, `../files/${ctx.delline.fname}`);
    const workbook = XLSX.readFile(fpath, {
        raw: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json(worksheet)
        .map(r => { //преобразование кода в строку (иначе преобразуется в экспоненциальное число)
            r.code = '' + r.code;
            r.regcode = '' + r.regcode;

            //обработать значение None
            r.zonename = r.zonename != 'None' ? r.zonename : undefined;
            r.zoncode = r.zoncode != 'None' ? r.zoncode : undefined;
            r.regname = r.regname != 'None' ? r.regname : undefined;
            r.regcode = r.regcode != 'None' ? r.regcode : undefined;

            //длина полей code и regcode должна быть 25 символов
            if (r.code) {
                if (r.code.length === 24) r.code = '0' + r.code;
            }
            if (r.regcode) {
                if (r.regcode.length === 24) r.regcode = '0' + r.regcode;
            }


            return r;
        });

    const start = Date.now();

    //очистить коллекцию населённых пунктов
    await DellineHandbookPlaces.deleteMany();

    let i = 0;
    for (const data of arr) {
        if (!(++i % 10000)) console.log('write: ', i);

        try {
            await DellineHandbookPlaces.create({
                cityID: data.cityID,
                name: data.name,
                code: data.code,
                searchString: data.searchString,
                regname: data.regname,
                regcode: data.regcode,
                zonename: data.zonename,
                zoncode: data.zoncode,
            })
        }
        catch (error) {
            console.log(error)
            continue;
        }
    }

    fs.unlink(fpath, err => {
        if (err) console.log(err);
    });

    console.log('Handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
    ctx.body = 'Handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
}
//получить ссылку на скачивание справочника
module.exports.getHandbook = async (ctx, next) => {
    await fetch(ctx.delline.link, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ appkey: process.env.DELLINE })
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                await downloadHandbook(res.url, ctx.delline.fname);
                return next();
            }
            else {
                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            console.log(err);
            ctx.throw(400, err.message);
        });
}
//скачать справочник
async function downloadHandbook(url, fname) {
    await fetch(url)
        .then(async response => {
            if (response.ok) {
                // csv файл должен быть записан в кодировке UTF8 с BOM, иначе при чтении возникает проблема с кодировкой
                //все, что нужно сделать, чтобы добавить спецификацию в файл, написанный с использованием UTF-8, — это добавить \ufeff к его содержимому
                //этот чанк добавляется методом write(), далее readeble stream пайпится с writeble stream-ом
                //при этом необходимо всё это обернуть в промис и подписаться на событие 'close', чтобы дождаться завершения скачивания файла
                //если этого не сделать порядок выполнения операций будет нарушен
                //при скачивании json файла добавлять спецификацию BOM нельзя - это сломает структуру файла
                const ws = fs.createWriteStream(path.join(__dirname, `../files/${fname}`), { flags: 'w' });
                ws.on('error', error => {
                    console.log('error writable stream:');
                    console.log(error);
                });
                if (!~fname.indexOf('json')) {
                    await new Promise(res => {
                        ws.write("\ufeff", _ => res());
                    });
                }
                await new Promise(res => {
                    response.body.pipe(ws);
                    ws.on('close', _ => res());
                });
            }
            else {
                throw new Error(`Error download handbook - status: ${response.status}`);
            }
        })
        .catch(err => {
            throw new Error(err.message);
        });
}
//получает объект даты и возвращает её в отформатированном виде
function getFormatDate(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
//форматирование адреса для запроса
//API требует, чтобы обязательно был указан номер дома,
//это вызывает определенные трудности, т.к. улица выбирается рандомно, либо её может вообще не быть
//чтобы соответствовать требованиям API номер дома устанавливается равным 1, не зависимо от того есть улица или нет
//это даже забавно, но есть ещё одна проблема, связанная с улицами
//если в качестве улицы попадается что-то вроде СНТ, или улица начинается с цифры (250-лет...), то это приводит к ошибке
//поэтому при запросе улицы используется регулярка (см. контроллер checkCredentials)
//
function makeAddress(data) {
    const street = data.streets.length ? data.streets[0].name + ', ' : '';
    return `1, ${street}${data.name}`;
}

function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}





// const data = {
//     appkey: process.env.DELLINE,
//     delivery: { //Информация по перевозке груза
//         deliveryType: { //Вид межтерминальной перевозки груза для которого будет рассчитана стоимость
//             // Возможные значения:
//             //      "auto"- автодоставка;
//             //      "express" - экспресс-доставка;
//             //      "letter" - письмо;
//             //      "avia" - авиадоставка;
//             //      "small" - доставка малогабаритного груза.
//             type: 'auto'
//         },
//         derival: { //Данные по доставке груза от отправителя
//             produceDate: '2022-03-02', //Дата выполнения заказа. Формат: "ГГГГ-ММ-ДД" (Используется только для параметра "request.delivery.derival")
//             // Способ доставки груза
//             // Возможные значения:
//             //      "address"- доставка груза непосредственно от адреса отправителя/до адреса получателя;
//             //      "terminal" - доставка груза от/до терминала;
//             variant: 'terminal',
//             terminalID: '36', //ID терминала отправки/доставки груза из "Справочника терминалов"
//             // city: "7700000000000000000000000",
//         },
//         arrival: { //Данные по доставке груза до получателя
//             // Способ доставки груза
//             // Возможные значения:
//             //      "address"- доставка груза непосредственно от адреса отправителя/до адреса получателя;
//             //      "terminal" - доставка груза от/до терминала;
//             //      "airport" - доставка груза до аэропорта, вариант используется, если в городе, в который необходимо доставить груз, нет терминала "Деловых Линий"
//             variant: 'terminal',
//             // terminalID: '1', //ID терминала отправки/доставки груза из "Справочника терминалов"
//             city: "7800000000000000000000000",
//         },
//         // packages: [ //(не обязательно) Данные по упаковке. При отсутствии параметра расчёт производится без учёта услуги

//         // ]
//     },
//     cargo: { //Информация о грузе
//         quantity: 1,
//         length: 1,
//         width: 1,
//         height: 1,
//         weight: 100,
//         totalVolume: 1,
//         totalWeight: 100,
//         hazardClass: 0,
//         oversizedWeight: 100,
//         oversizedVolume: 1,
//     }
// }



// module.exports.microCalculation = async ctx => {
//     const data = {
//         appkey: process.env.DELLINE,
//         derival: {
//             city: "7700000000000000000000000"
//         },
//         arrival: {
//             city: "7800000000000000000000000"
//         },
//     }

//     await fetch('https://api.dellin.ru/v1/micro_calc.json', {
//         headers: { 'Content-Type': 'application/json' },
//         method: 'POST',
//         body: JSON.stringify(data)
//     })
//         .then(async response => {
//             if (response.ok) {
//                 const res = await response.json();
//                 console.log(res);
//             }
//             else {
//                 throw new Error(`Error fetch query - status: ${response.status}`);
//             }
//         })
//         .catch(err => {
//             console.log(err);
//             ctx.throw(400, err.message);
//         });

//     ctx.body = 'ok';
// }