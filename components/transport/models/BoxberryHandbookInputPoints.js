const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    name: { //наименование населённого пункта
        type: String,
        index: true
    },
    code: String, //код пункта приёма посылок
}, {
    timestamps: true,
})

module.exports = connection.model('BoxberryHandbookInputPoints', Schema)