const connection = require('@root/libs/connection');
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    lastVisit: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

schema.path('lastVisit').index({expires: '2m'});

module.exports = connection.model('Session', schema);