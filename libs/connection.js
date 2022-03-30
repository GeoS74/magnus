const config = require('../config.js');
const mongoose = require('mongoose');

// mongoose.set('useNewUrlParser', true);
// mongoose.set('useFindAndModify', false);
// mongoose.set('useCreateIndex', true);
// mongoose.set('useUnifiedTopology', true);
// mongoose.plugin(require('mongoose-beautiful-unique-validation'));

mongoose.plugin( require('mongoose-unique-validator') );

module.exports = mongoose.createConnection(config.mongodb.uri, { autoIndex: config.mongodb.autoindex });