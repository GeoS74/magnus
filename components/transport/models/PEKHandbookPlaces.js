const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: Number, //уникальный идентификатор города в рамках системы ПЭК
    name: { //наименование населённого пункта
        type: String,
        index: true
    },
    region: String //наименование региона
}, {
    timestamps: true,
})


module.exports = connection.model('PEKHandbookPlaces', Schema)