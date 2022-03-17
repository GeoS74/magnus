const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: String, //уникальный идентификатор города в рамках системы Байкал
    name: { //наименование населённого пункта
        type: String,
        index: true
    },
    regname: String //наименование региона для населённого пункта
}, {
    timestamps: true,
})


module.exports = connection.model('BaikalHandbookPlaces', Schema)