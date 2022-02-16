const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы Деловых линий
        type: String,
        index: true
    },
    name: String, //полное наименование улицы
    code: String, //код КЛАДР улицы
    searchString: { //наименование улицы сформированное специальным образом для поиска, например для реализации автодополнения
        type: String,
        index: true
    },
}, {
    timestamps: true
})

module.exports = connection.model('DellineHandbookStreets', Schema)