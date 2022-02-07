const config = require('./config');
const app = require('./app');
const socket = require('./socket');

const server = app.listen(config.server.port, _ => {
    console.log('server run http://localhost:', config.server.port);
});

socket(server);