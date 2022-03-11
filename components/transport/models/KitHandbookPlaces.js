const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: Number, //уникальный идентификатор города в рамках системы КИТ
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },
}, {
    timestamps: true,
})


module.exports = connection.model('KitHandbookPlaces', Schema)