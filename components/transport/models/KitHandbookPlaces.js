const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },
    name: { //наименование населённого пункта
        type: String,
        index: true
    },
    regcode: String, //код региона для населённого пункта, точнее первые 2 цифры
    requiredPickup: Number, //Обязательность забора (0 - нет, 1 -да)
    requiredDelivery: Number, //Обязательность доставки (0 - нет, 1 -да)
}, {
    timestamps: true,
})

module.exports = connection.model('KitHandbookPlaces', Schema)