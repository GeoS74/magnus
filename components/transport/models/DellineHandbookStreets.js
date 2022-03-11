const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы Деловых линий
        type: Number,
        index: true
    },
    name: String, //полное наименование улицы
    code: String, //код КЛАДР улицы
    searchString: String, //наименование улицы сформированное специальным образом для поиска, например для реализации автодополнения
}, {
    timestamps: true
})

module.exports = connection.model('DellineHandbookStreets', Schema)