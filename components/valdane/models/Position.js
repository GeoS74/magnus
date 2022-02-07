//модель коллекции должностей внутри организации
//
const mongoose = require('mongoose');
const connection = require('@root/libs/connection');

const PositionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: 'этот {PATH} не должен пустовать'
    }
});

module.exports = connection.model('Position', PositionSchema);