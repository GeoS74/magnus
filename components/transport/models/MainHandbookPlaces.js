const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    name: String, //полное наименование населённого пункта
    code: String, //код КЛАДР населенного пункта
    searchString: { //наименование населённого пункта, сформированное специальным образом для поиска. Например, для реализации автодополнения
        type: String,
        index: true
    },
    searchStringEng: { //наименование населённого пункта на английской раскладке, сформированное специальным образом для поиска. Например, для реализации автодополнения
        type: String,
        index: true
    },
    regname: String, //наименование региона для населённого пункта
    regcode: String, //код КЛАДР региона для населённого пункта
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

module.exports = connection.model('MainHandbookPlaces', Schema)