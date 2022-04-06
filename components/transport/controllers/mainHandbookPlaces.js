const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx'); //https://github.com/SheetJS/sheetjs
const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');


//поиск населенного пункта
module.exports.searchCity = async ctx => {
    try {
        const regexp = new RegExp("^" + ctx.request.body.city);
        const city = await MainHandbookPlaces.aggregate([
            {
                // $match: {
                //     searchString: {
                //         $regex: regexp, $options: "i"
                //     }
                // }
                $match: {
                    $or: [
                        {
                            name: { $regex: regexp, $options: "i" }
                        },
                        {
                            searchStringEng: { $regex: regexp, $options: "i" }
                        }
                    ]
                }
            },
            { $limit: 15 },
            {
                $project: {
                    _id: 0,
                    fullName: 1
                }
            }
        ]);
        // console.log(city);
        ctx.body = city;
    } catch (error) {
        console.log(error.message);
        ctx.throw(400, error.message);
    }
};


//обновление основного справочника населенных пунктов системы
//файл .csv создается вручную и должен иметь кодировку UTF-8 with BOM
//надо проработать возможность загрузки файла через форму (дальнейшие доработки системы)
module.exports.update = async ctx => {
    // console.log(changeEngSymb("привет"))
    // return;

    const fpath = path.join(__dirname, `../files/kladr2.csv`);
    const workbook = XLSX.readFile(fpath, {
        raw: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json(worksheet)
        .map(r => { //преобразование данных
            //надо учитывать, что файл .csv готовится руками, поэтому надо обращать внимание на названия ключей
            //вообще, лучше всего сделать форму загрузки файла с возможностью указать на клиенте где какая колонка заливается
            // console.log(r);
            return {
                fullName: r[12],
                name: r[11],
                code: r[13].slice(1),
                searchString: r[1],
                searchStringEng: changeEngSymb(r[1]),
                regname: r[9],
                regcode: r[14].slice(1),
                postalIndex: r[4],
            };
        });
        return;

    const start = Date.now();

    //очистить коллекцию населённых пунктов
    await MainHandbookPlaces.deleteMany();

    let i = 0;
    for (const data of arr) {
        if (!(++i % 100)) console.log('write: ', i);

        try {
            await MainHandbookPlaces.create({
                fullName: data.fullName,
                name: data.name,
                code: data.code,
                searchString: data.searchString,
                searchStringEng: data.searchStringEng,
                regname: data.regname,
                regcode: data.regcode,
                postalIndex: data.postalIndex,
            })
        }
        catch (error) {
            console.log(error)
            continue;
        }
    }

    //нужно ли удалять файл пока не понятно
    // fs.unlink(fpath, err => {
    //     if (err) console.log(err);
    // });

    console.log('Handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
    ctx.body = 'Handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
}


// module.exports.__update = async ctx => {
//     // console.log(changeEngSymb("привет"))
//     // return;

//     const fpath = path.join(__dirname, `../files/kladr.csv`);
//     const workbook = XLSX.readFile(fpath, {
//         raw: true
//     });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     const arr = XLSX.utils.sheet_to_json(worksheet)
//         .map(r => { //преобразование данных
//             //надо учитывать, что файл .csv готовится руками, поэтому надо обращать внимание на названия ключей
//             //вообще, лучше всего сделать форму загрузки файла с возможностью указать на клиенте где какая колонка заливается
//             // console.log(r);
//             const name = `${r[1]} ${r[2]}.`;
//             const regname = `${r[5]} ${r[6] ? r[6] + "." : ""}`;
//             return {
//                 fullName: `${name} (${regname})`,
//                 name: name,
//                 code: r[4].slice(1),
//                 searchString: r[1],
//                 searchStringEng: changeEngSymb(r[1]),
//                 regname: regname,
//                 regcode: r[3].slice(1),
//             };
//         });

//     const start = Date.now();

//     //очистить коллекцию населённых пунктов
//     await MainHandbookPlaces.deleteMany();

//     let i = 0;
//     for (const data of arr) {
//         if (!(++i % 100)) console.log('write: ', i);

//         try {
//             await MainHandbookPlaces.create({
//                 fullName: data.fullName,
//                 name: data.name,
//                 code: data.code,
//                 searchString: data.searchString,
//                 searchStringEng: data.searchStringEng,
//                 regname: data.regname,
//                 regcode: data.regcode,
//             })
//         }
//         catch (error) {
//             console.log(error)
//             continue;
//         }
//     }

//     //нужно ли удалять файл пока не понятно
//     // fs.unlink(fpath, err => {
//     //     if (err) console.log(err);
//     // });

//     console.log('Handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
//     ctx.body = 'Handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
// }

//переводит строку на кириллице в раскладку на английском языке
function changeEngSymb(str) {
    const map = new Map(Object.entries(transSymbol));
    let res = '';
    for (let s of str) {
        res += map.get(s.toLowerCase()) ? map.get(s.toLowerCase()) : s;
    }
    return res;
}
const transSymbol = {
    'а': 'f',
    'б': ',',
    'в': 'd',
    'г': 'u',
    'д': 'l',
    'е': 't',
    'ё': '`',
    'ж': ';',
    'з': 'p',
    'и': 'b',
    'й': 'q',
    'к': 'r',
    'л': 'k',
    'м': 'v',
    'н': 'y',
    'о': 'j',
    'п': 'g',
    'р': 'h',
    'с': 'c',
    'т': 'n',
    'у': 'e',
    'ф': 'a',
    'х': '[',
    'ц': 'w',
    'ч': 'x',
    'ш': 'i',
    'щ': 'o',
    'ъ': ']',
    'ы': 's',
    'ь': 'm',
    'э': '\'',
    'ю': '.',
    'я': 'z',
}