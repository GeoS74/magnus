const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    name: String, //наименование населённого пункта
    code: String, //код КЛАДР населенного пункта
    searchString: { //наименование населённого пункта, сформированное специальным образом для поиска. Например, для реализации автодополнения
        type: String,
        index: true
    },
    cityID: { //Код города в boxberry
        type: String,
        unique: true
    },
    regname: String, //наименование региона для населённого пункта
    regcode: String, //код КЛАДР региона для населённого пункта
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

Schema.virtual('inputPoints', {
    ref: 'BoxberryHandbookInputPoints',
    localField: 'searchString',
    foreignField: 'name'
})

Schema.virtual('outputPoints', {
    ref: 'BoxberryHandbookOutputPoints',
    localField: 'cityID',
    foreignField: 'cityID'
})

module.exports = connection.model('BoxberryHandbookPlaces', Schema)