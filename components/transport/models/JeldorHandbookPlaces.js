const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы ЖДЭ
        type: Number,
    },
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },
    searchString: { //наименование населённого пункта, сформированное специальным образом для поиска. Например, для реализации автодополнения
        type: String,
        index: true
    },
    aexOnly: { //Прием/Выдача груза осуществляется только путем автоэкспедирования (забора/доставки) 0/1
        type: Number,
    },
}, {
    timestamps: true,
})


module.exports = connection.model('JeldorHandbookPlaces', Schema)