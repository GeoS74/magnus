const fetch = require('node-fetch');



//расчет доставки
module.exports.calculation = async (ctx) => {
    // const data = await makeSearchParameters(ctx.request.body);

    // await fetch(`https://api2.nrg-tk.ru/v2/price`, {
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     method: 'POST',
    //     body: JSON.stringify(data)
    // })
    //     .then(async response => {
    //         if (response.ok) {
    //             const res = await response.json();
    //             // console.log(res);
    //             ctx.body = postProcessing(res);
    //         }
    //         else if (response.status === 429) { //превышение лимита запросов к API
    //             throw new Error(`Error limit query for Energy`);
    //         }
    //         else {
    //             const res = await response.json();
    //             console.log(res);
    //             throw new Error(`Error fetch query - status: ${response.status}`);
    //         }
    //     })
    //     .catch(err => {
    //         // console.log('~~~~~Error API Energy~~~~~');
    //         // console.log(err);
    //         throw new Error(`Error API Energy: ${err.message}`);
    //     });
}



//обновить справочник населённых пунктов в БД
module.exports.updateHandbookPlaces = async ctx => {
    await fetch('http://magic-trans.ru/api/v1/dictionary/getPackageList')
        .then(async response => {
            if (response.ok) {
                const res = await response.json();
                console.log(res);

                // const start = Date.now();
                // let i = 0;

                // // очистить коллекцию населённых пунктов
                // await EnergyHandbookPlaces.deleteMany();

                // for (const city of res.cityList) {
                //     if (!(++i % 1000)) console.log('write: ', i);
                //     try {
                //         await EnergyHandbookPlaces.create({
                //             cityID: city.id,
                //             name: city.name,
                //             parentID: city.parentId,
                //             isRegionalDelivery: city.isRegionalDelivery,
                //             regname: city.description,
                //             type: city.type,
                //         });
                //     }
                //     catch (error) {
                //         console.log(error)
                //         continue;
                //     }
                // }
                // console.log('Energy handbook places is updated. Run time: ', ((Date.now() - start) / 1000), ' sek rows: ', i)
                // ctx.body = 'Energy handbook places is updated. Run time: ' + ((Date.now() - start) / 1000) + ' sec rows: ' + i;
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