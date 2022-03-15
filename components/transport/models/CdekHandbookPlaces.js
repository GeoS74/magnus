const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },
    name: { //Название населенного пункта
        type: String,
        index: true
    },
    codeCDEK: Number, //Код населенного пункта СДЭК
    regcodeCDEK: Number,//Код региона СДЭК
    regname: String, //наименование региона
    subRegion: String, //Название района региона населенного пункта
    postalCodes: Array, //Массив почтовых индексов
    regcode: String, //код КЛАДР региона для населённого пункта (это поле API СДЭКа не отдаёт, формируется на основании code, если оно есть)
}, {
    timestamps: true,
})

module.exports = connection.model('CdekHandbookPlaces', Schema)