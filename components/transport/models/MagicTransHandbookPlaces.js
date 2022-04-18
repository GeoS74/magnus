const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы MagicTrans
        type: String,
        unique: true
    },
    name: { //Название населенного пункта
        type: String,
        index: true
    },
    terminal: Boolean, //город является иерминалом
    delivery: Boolean, //осуществляется ли доставка в данный город
    regcode: { //код КЛАДР региона (берётся из mainHandbook)
        type: String,
        index: true
    },
}, {
    timestamps: true,
})

module.exports = connection.model('MagicTransHandbookPlaces', Schema)