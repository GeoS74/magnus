const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    code: { //код КЛАДР населенного пункта
        type: String,
        index: true
    },
    produceDate: {
        type: Date,
        expires: 1
    }
}, {
    timestamps: true
})

module.exports = connection.model('DellineProduceDate', Schema)