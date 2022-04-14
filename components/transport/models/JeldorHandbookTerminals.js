const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    terminalID: { //Идентификатор терминала, использутся для расчета стоимости доставки при использовании /calculator/price
        type: String,
        index: true
    },
    //title и city дублируют друг друга, надо проверить на сколько
    title: String, // Название города
    city: String, // Название города
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },
    aexOnly: { //Прием/Выдача груза осуществляется только путем автоэкспедирования (забора/доставки) 0/1
        type: Number,
    },
    type: Number //тип терминала приём-1/выдача-2
}, {
    timestamps: true,
})


module.exports = connection.model('JeldorHandbookTerminals', Schema)