const config = require('./config');
const app = require('./app');
// const socket = require('./socket');

const server = app.listen(config.server.port, _ => {
    console.log('server run http://localhost:', config.server.port);
});

// socket(server);

////////////////////////////////////////////////////////////////////////

// const http = require('http');
// http.createServer(options, app.callback()).listen(config.server.port, _ => {
//     console.log('server run http://localhost:', config.server.port);
// });

////////////////////////////////////////////////////////////////////////

// const https = require('https');
// const fs = require('fs')

// // ssl_certificate "/var/www/httpd-cert/geos/cargobox.site_le1.crtca";
// // ssl_certificate_key "/var/www/httpd-cert/geos/cargobox.site_le1.key";
// // /root/www/nodejs/magnus


// const options = {
//     key: fs.readFileSync('./ssl_cert/key.pem'),
//     cert: fs.readFileSync('./ssl_cert/cert.pem')
// }

// https.createServer({}, app.callback()).listen(config.server.portSSL, _ => {
//     console.log('server run https://localhost:', config.server.portSSL);
// });

 