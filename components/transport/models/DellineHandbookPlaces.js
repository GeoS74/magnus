const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    cityID: { //уникальный идентификатор города в рамках системы Деловых линий
        type: Number,
        unique: true
    },
    name: String, //полное наименование населённого пункта
    code: String, //код КЛАДР населенного пункта
    searchString: { //наименование населённого пункта, сформированное специальным образом для поиска. Например, для реализации автодополнения
        type: String,
        index: true
    },
    regname: String, //наименование региона для населённого пункта
    regcode: String, //код КЛАДР региона для населённого пункта
    zonename: String, //наименование района для населённого пункта
    zoncode: String, //код КЛАДР района для населённого пункта
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

Schema.virtual('streets', {
    ref: 'DellineHandbookStreets',
    localField: 'cityID',
    foreignField: 'cityID'
});

Schema.virtual('terminals', {
    ref: 'DellineHandbookTerminals',
    localField: 'code',
    foreignField: 'code'
});

module.exports = connection.model('DellineHandbookPlaces', Schema)