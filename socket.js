const config = require('./config');
const socketIO = require('socket.io');

function socket(server){
    const io = socketIO(server, {
        cors: {
          origin: `http://localhost:${config.server.port}`,
          methods: ["GET", "POST"]
        }
      });

    io.use(async (socket, next) => {
        next();
    });

    io.on('connection',async (socket, next) =>{ 
        console.log('connection');

        io.emit('hello', 'Привет');
        socket.on('disconnect', () => {
            console.log('disconnected');
        });
        socket.on('message', message => {
            console.log('message', message);
            io.emit('hello', message);
        });
    });

    return io;
}

module.exports = socket;