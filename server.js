require('dotenv').config();
global.sessions = {};
global.io;
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
global.io = new Server(server);
const port = 3000;
var fs = require("fs");
var path = require("path");
const morgan = require("morgan");
const { synchronizeModels } = require('./app/models');
const { loadAndInitializeActiveSessions } = require('./app/lib/loadSession');

const { startSession } = require('./app/lib/startSession');

synchronizeModels();

loadAndInitializeActiveSessions(io);
app.use(express.json());

app.use(morgan("combined"));
app.set('view engine', 'pug');
app.set('views', './public'); // the directory where your Pug templates are located
app.use(express.static(path.join(__dirname, 'public')));
io.on('connection', (socket) => {
  socket.on('joinRoom', (room) => {
    console.log(`Client joined room: ${room}`);
    socket.join(room);
  });
});

function includeRouter(folderName) {
  console.log(" ======================================= ");
  fs.readdirSync(folderName).forEach(function (file) {
    var fullName = path.join(folderName, file);
    var stat = fs.lstatSync(fullName);

    if (stat.isDirectory()) {
      includeRouter(fullName);
    } else if (file.toLowerCase().indexOf(".js")) {
      require("./" + fullName)(app);
      console.log(" Found Router => '" + fullName + "'");
    }
  });
  console.log(" ======================================= ");
}

includeRouter("app/router/");



server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});