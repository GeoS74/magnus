const config = require('./config');
const app = require('./app');
const socket = require('./socket');

// const server = app.listen(config.server.port, _ => {
//     console.log('server run http://localhost:', config.server.port);
// });

// socket(server);

const http = require('http');
const https = require('https');

const fs = require('fs')

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}

https.createServer(options, app.callback()).listen(config.server.port, _ => {
    console.log('server run https://localhost:', config.server.port);
});

// http.createServer(options, app.callback()).listen(config.server.port, _ => {
//     console.log('server run http://localhost:', config.server.port);
// });