const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    name: { //наименование населённого пункта
        type: String,
        unique: true
    },
}, {
    timestamps: true,
})

module.exports = connection.model('LuchHandbookOutputPoints', Schema)