const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx'); //https://github.com/SheetJS/sheetjs
const MainHandbookPlaces = require('@transport/models/MainHandbookPlaces');

//обновление основного справочника населенных пунктов системы
//файл .csv создается вручную и должен иметь кодировку UTF-8 with BOM
//надо проработать возможность загрузки файла через форму (дальнейшие доработки системы)
module.exports.update = async ctx => {
    // console.log(changeEngSymb("привет"))
    // return;

    const fpath = path.join(__dirname, `../files/kladr.csv`);
    const workbook = XLSX.readFile(fpath, {
        raw: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json(worksheet)
        .map(r => { //преобразование кода в строку (иначе преобразуется в экспоненциальное число)
            // console.log(r);
            return {
                name: `${r[1]} ${r[2]}.`,
                code: r[4].slice(1),
                searchString: r[1],
                searchStringEng: changeEngSymb(r[1]),
                regname: `${r[5]} ${r[6] ? r[6]+"." : ""}`,
                regcode: r[3].slice(1),
            };
        });

    const start = Date.now();

    //очистить коллекцию населённых пунктов
    await MainHandbookPlaces.deleteMany();

    let i = 0;
    for (const data of arr) {
        if (!(++i % 100)) console.log('write: ', i);

        try {
            await MainHandbookPlaces.create({
                name: data.name,
                code: data.code,
                searchString: data.searchString,
                searchStringEng: data.searchStringEng,
                regname: data.regname,
                regcode: data.regcode,
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


//переводит строку на кириллице в раскладку на английском языке
function changeEngSymb(str) {
    const map = new Map(Object.entries(transSymbol));
    let res = '';
    for(let s of str) {
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