const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    code: String, //Код пункта выдачи в базе boxberry
    cityID: { //Код города в boxberry
        type: String,
        index: true
    },
    name: String, //наименование населённого пункта
    volumeLimit: String, //Ограничение объема, м3
    loadLimit: String, //Ограничение веса, кг
}, {
    timestamps: true,
})

module.exports = connection.model('BoxberryHandbookOutputPoints', Schema)