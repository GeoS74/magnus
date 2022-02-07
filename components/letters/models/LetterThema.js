const connection = require('@root/libs/connection');
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: 'заполните поле Тема письма',
    },
    user: {
        type: mongoose.ObjectId,
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


schema.virtual('letters', {
    ref: 'Letter',
    localField: '_id',
    foreignField: 'thema'
});

schema.index(
    { title: 'text' }, 
    {
      name: 'TextSearchIndex',
      default_language: 'russian'
  });

module.exports = connection.model('LetterTheme', schema);