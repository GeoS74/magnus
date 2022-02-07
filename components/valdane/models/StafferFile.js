const connection = require('@root/libs/connection');
const mongoose = require('mongoose');
// const Staffer = require('./Staffer');

const StafferFileSchema = new mongoose.Schema({
    staffer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staffer',
        required: 'поле {PATH} обязательно для заполнения',
    },
    scanCopyFile: {
        type: String,
        required: 'поле {PATH} обязательно для заполнения',
    },
    alias: {
        type: String,
        default: 'Скан-копия файла'
    },
}, {
    timestamps: true,
});

module.exports = connection.model('StafferFile', StafferFileSchema);