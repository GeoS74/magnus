const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const fetch = require('node-fetch'); //https://www.npmjs.com/package/node-fetch#loading-and-configuring-the-module
const XLSX = require('xlsx'); //https://github.com/SheetJS/sheetjs
const DellineHandbookSettlements = require('@transport/models/DellineHandbookSettlements');


//получить ссылку на скачивание справочника населённых пунктов
module.exports.getHandbookSettlements = async (ctx, next) => {
    await fetch('https://api.dellin.ru/v1/public/places.json', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ appkey: process.env.DELLINE })
    })
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                await downloadHandbook(res.url, 'settlements');
                next();
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
                const ws = fs.createWriteStream(path.join(__dirname, `../files/${fname}.csv`), { flags: 'w' });
                ws.write("\ufeff");
                await new Promise(res => {
                    response.body.pipe(ws);
                    ws.on('close', _ => res());
                });
            }
            else {
                throw new Error(`Error download .csv - status: ${response.status}`);
            }
        })
        .catch(err => {
            throw new Error(err.message);
        });
}


//обновить справочник населённых пунктов в БД
module.exports.updateHandbookSettlements = async ctx => {
    const workbook = XLSX.readFile(path.join(__dirname, '../files/settlements.csv'), {
        raw: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json(worksheet)
        .map(r => { //преобразование кода в строку (иначе преобразуется в экспоненциальное число)
            r.code = r.code+'';
            r.regcode = r.regcode+'';
            //обработать значение None
            r.zonename = r.zonename != 'None' ? r.zonename : undefined;
            r.zoncode = r.zoncode != 'None' ? r.zoncode : undefined;
            return r;
        });

    const start = Date.now();

    let i = 0;
    for(const data of arr) {
        if( !(++i % 10000) ) console.log('write: ', i);

        try{
            await DellineHandbookSettlements.create({
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
        catch(error) {
            console.log(error)
            continue;
        }
    }

    console.log('run time: ', ( (Date.now()-start)/1000 ), ' sek rows: ', i)
    ctx.body = 'Handbook settlements is updated. Run time: '+( (Date.now()-start)/1000 )+' sek rows: '+i;
}