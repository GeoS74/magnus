const connection = require('@root/libs/connection');
const mongoose = require('mongoose');
const LetterThema = require('./LetterThema');

const schema = new mongoose.Schema({
    thema: {
        type: mongoose.Schema.Types.ObjectId,
        ref: LetterThema,
        required: 'поле {PATH} обязательно для заполнения',
        index: true //обязательно индексировать, т.к. это поле используется в poopulate
    },
    thema_tags: { //поле для быстрого поиска с учётом связанной темы
        type: String,
        required: 'поле {PATH} обязательно для заполнения',
    },
    description: {
        type: String
    },
    number: {
        type: String,
        default: 'б/н'
    },
    date: {
        type: Date,
        default: Date.now()
    },
    scanCopyFile: {
        type: String,
        required: 'поле {PATH} обязательно для заполнения',
    },
}, {
    timestamps: true,
});


schema.index(
    {
        description: 'text',
        thema_tags: 'text'
    }, 
    {
      name: 'LetterSearchIndex',
      default_language: 'russian'
  });

module.exports = connection.model('Letter', schema);