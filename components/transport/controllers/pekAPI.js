const fetch = require('node-fetch');
const PEKHandbookPlaces = require('@transport/models/PEKHandbookPlaces');

//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('http://www.pecom.ru/ru/calc/towns.php')
        .then(async response => {
            const res = await response.json();
            // console.log(res);

            const start = Date.now();
            let i = 0;

            //очистить коллекцию населённых пунктов
            await PEKHandbookPlaces.deleteMany();

            for (const region in res) {
                for (const cityID in res[region]) {
                    if (!(++i % 50)) console.log('write: ', i);

                    try {
                        await PEKHandbookPlaces.create({
                            cityID: cityID,
                            name: res[region][cityID],
                            region: region,
                        })
                    }
                    catch (error) {
                        console.log(error)
                        continue;
                    }
                }
            }

            console.log('PEK handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
            ctx.body = 'PEK handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
        })
        .catch(error => {
            console.log(err);
            ctx.throw(400, err.message);
        });
};