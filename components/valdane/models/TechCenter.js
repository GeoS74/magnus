//модель коллекции производственных площадок внутри организации
//
const mongoose = require('mongoose');
const connection = require('@root/libs/connection');

const TechCenterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: 'заполните этот {PATH}'
    },
    address: String,
    quantity: Number
});

module.exports = connection.model('TechCenter', TechCenterSchema);