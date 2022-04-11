const fetch = require('node-fetch');

// определение типа коробки
// Тип S: 260×170×80 мм - код 10
// Тип M: 300×200×150 мм - код 20
// Тип L: 400×270×180 мм - код 30
// Тип XL: 530×360×220 мм - код 40
function getTypeBox(length, width, height){
    if(length*1000 <= 261 && width*1000 <= 170 && height*1000 <= 80) {
        return 10;
    }
    if(length*1000 <= 300 && width*1000 <= 200 && height*1000 <= 150) {
        return 20;
    }
    if(length*1000 <= 400 && width*1000 <= 270 && height*1000 <= 180) {
        return 30;
    }
    if(length*1000 <= 530 && width*1000 <= 360 && height*1000 <= 220) {
        return 40;
    }
    return 99;
}

//формирование параметров запроса для расчёта перевозки
//ограничение по весу для посылки 31,5 кг
function makeSearchParameters(parameters, index) {
    if(parameters.weight[index] > 31.5) throw new Error('Почта России: превышение максимального веса');

    // console.log('type box: ', getTypeBox(parameters.length[index], parameters.width[index], parameters.height[index]));
    const typeBox = getTypeBox(parameters.length[index], parameters.width[index], parameters.height[index]);

    let arr = [
        `object=${typeBox === 99 ? 4030 : 27030}`, //Код объекта расчёта (27030 - посылка / 4030 - не стандартная посылка / 3000 - бандероль)
        `weight=${parameters.weight[index]}`, //Вес, кг 
        `pack=${typeBox}`, //код типа упаковки 
        `from=${parameters.derival.postalIndex}`, //индекс отправителя
        `to=${parameters.arrival.postalIndex}`, //индекс получателя
    ];

    return arr.join('&');
}

//возвращает запрос к API Почты России
function getQuery(data) {
    return fetch('https://tariff.pochta.ru/v1/calculate/tariff/delivery?' + data)
        .then(async response => {
            if (response.ok) {
                return await response.json();
            }
            else {
                const res = await response.json();
                console.log(res);

                throw new Error(`Error fetch query - status: ${response.status}`);
            }
        })
        .catch(err => {
            throw new Error(err.message);
        });
}

//пост обработка данных перед отдачей клиенту
function postProcessing(res) {
    const data = {
        main: {
            carrier: 'Почта России',
            price: 0,
            days: '',
        },
        detail: []
    };

    for(let i = 0; i < res.length; i++) {
        data.main.price += +res[i].paynds/100; //стоимость в копейках

        data.detail.push({
            name: `Место ${i+1} (${res[i].name})`,
            value: +res[i].paynds/100 + ' р.'
        });
    }

    data.main.days = `${res[0].delivery.min} - ${res[0].delivery.max}` || '';

    return data;
}

//расчет доставки
module.exports.calculation = async (ctx) => {
    //сформировать массив с запросами
    const queries = [];
    for (let i = 0; i < ctx.request.body.width.length; i++) {
        for (let n = 0; n < ctx.request.body.quantity[i]; n++) {
            queries.push(getQuery(makeSearchParameters(ctx.request.body, i)));
        }
    }

    await Promise.all(queries)
        .then(res => {
            console.log(res);
            console.log(res[0].tariff);
            ctx.body = postProcessing(res);
        })
        .catch(err => {
            // console.log(err.message);
            throw new Error(err.message);
        });
}



function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}
