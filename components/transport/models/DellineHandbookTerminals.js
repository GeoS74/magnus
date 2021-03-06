const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    //поле cityID из справочника терминалов не соответствует cityID справочника населенных пунктов
    cityID: Number, //уникальный идентификатор города в рамках системы Деловых линий
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },

    terminalID: Number, //id терминала в системе Деловых линий (в json-файле это id с типом String)
    name: String, //наименование терминала
    address: String, //адрес терминала
    fullAddress: String, //полный адрес терминала
    // isOffice: Boolean, //признак работы терминала только в режиме офиса
    // receiveCargo: Boolean, //признак работы терминала на прием груза
    // giveoutCargo: Boolean, //признак работы терминала на выдачу груза
    default: Boolean, //признак терминала по умолчанию для города
    mainPhone: String, //номер телефона
}, {
    timestamps: true
})

module.exports = connection.model('DellineHandbookTerminals', Schema)