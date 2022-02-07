//модель коллекции временных блоков графика
//
const mongoose = require('mongoose');
const connection = require('@root/libs/connection');

const ChartSchema = new mongoose.Schema({
    tech: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TechCenter',
        required: 'этот {PATH} не должен пустовать'
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staffer',
        required: 'этот {PATH} не должен быть пустым'
    },
    period: {
        start: {
            type: Date,
            required: 'этот {PATH} не должен быть пустым',
            index: true
        },
        end: {
            type: Date,
            required: 'этот {PATH} не должен быть пустым',
            index: true
        }
    }
});

module.exports = connection.model('Chart', ChartSchema);