const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы Энергия
        type: Number,
        unique: true
    },
    name: { //Название населенного пункта
        type: String,
        index: true
    },
    parentID: Number, //id родителя в рамках системы Энергии
    isRegionalDelivery: Boolean,
    regname: String, //наименование региона
    regcode: String, //код КЛАДР региона (берётся из mainHandbook)
    type: Number, //какой-то тип
}, {
    timestamps: true,
})

module.exports = connection.model('EnergyHandbookPlaces', Schema)