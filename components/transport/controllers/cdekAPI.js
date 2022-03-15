const fetch = require('node-fetch');
const CdekHandbookPlaces = require('@transport/models/CdekHandbookPlaces');


//расчет доставки
module.exports.calculation = async (ctx) => {
}


//обновить справочник населённых пунктов в БД
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
                            regcode: (d.kladr_code ? d.kladr_code.slice(0,2)+"00000000000" : undefined)
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