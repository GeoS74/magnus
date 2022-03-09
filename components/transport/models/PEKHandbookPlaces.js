const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы ПЭК
        type: Number,
        unique: true
    },
    name: String, //полное наименование населённого пункта
}, {
    timestamps: true,
})


module.exports = connection.model('PEKHandbookPlaces', Schema)