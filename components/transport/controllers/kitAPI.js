const fetch = require('node-fetch');
const KitHandbookPlaces = require('@transport/models/KitHandbookPlaces');

//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('https://capi.gtdel.com/1.0/geography/city/get-list?token=' + process.env.KIT)
        .then(async response => {
            const res = await response.json();
            // console.log(res);

            const start = Date.now();
            let i = 0;

            //очистить коллекцию населённых пунктов
            await KitHandbookPlaces.deleteMany();

            for (const city of res) {
                if (!(++i % 50)) console.log('write: ', i);
                try {
                    await KitHandbookPlaces.create({
                        cityID: city.id,
                        code: city.tdd_city_code,
                    })
                }
                catch (error) {
                    console.log(error)
                    continue;
                }
            }

            console.log('Kit handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
            ctx.body = 'Kit handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
        })
        .catch(error => {
            console.log(err);
            ctx.throw(400, err.message);
        });
};