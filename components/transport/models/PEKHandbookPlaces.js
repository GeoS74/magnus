const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы ПЭК
        type: Number,
        unique: true
    },
    name: String, //наименование населённого пункта
    region: String //наименование региона
}, {
    timestamps: true,
})


module.exports = connection.model('PEKHandbookPlaces', Schema)