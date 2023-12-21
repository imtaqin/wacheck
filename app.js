const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;
const { v4: uuidv4 } = require('uuid');
const qrCode = require('qrcode');
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers
} = require("@whiskeysockets/baileys");


const pino = require("pino");
const { makeid } = require('./lib/makeID');
const { Session, synchronizeModels } = require('./app/models/index.js');
const sequelize = require('sequelize');

const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
const sessions = {};
async function loadAndInitializeActiveSessions() {
  try {
    const activeSessions = await Session.findAll({ where: { status: true } });
    for (const session of activeSessions) {
      console.log(`Initializing session: ${session.sessionName}`);
      await startSession(session.sessionName);
    }
  } catch (error) {
    console.error('Error loading active sessions:', error);
  }
}


synchronizeModels().then(() => {
  loadAndInitializeActiveSessions();
});

async function deleteSession(sessionName) {
  try {
    // Delete the session from the database
    await Session.destroy({ where: { sessionName } });
    console.log(`Session ${sessionName} deleted from database.`);

    // Delete the session folder
    const sessionPath = `./sessions/${sessionName}`;
    await fs.rm(sessionPath, { recursive: true, force: true });
    console.log(`Session folder ${sessionPath} deleted.`);
  } catch (err) {
    console.error('Error handling session close:', err);
  }
}
async function startSession(sessionName) {
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionName}`);
  const version = await fetchLatestBaileysVersion();
  console.log(`Starting session: ${sessionName}, using WA v${version.isLatest}`);

  const client = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Desktop'),
    auth: state,
    qrTimeout: 2000

  });

  store.bind(client.ev);

  client.ev.on('creds.update', saveCreds);


  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        await deleteSession(sessionName);
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        await deleteSession(sessionName);
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");

      } else if (reason === DisconnectReason.connectionReplaced) {
        await deleteSession(sessionName);
      } else if (reason === DisconnectReason.loggedOut) {
        await deleteSession(sessionName);
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        startSession(sessionName);
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        startSession(sessionName);
      } else {
        console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        startSession(sessionName);
      }
    }
    if (connection === "open") {
      console.log("Connection successfully opened");
      io.to(sessionName).emit('connectionOpen');

      Session.upsert({ sessionName, status: true })
        .then(() => console.log(`Session ${sessionName} saved/updated in database.`))
        .catch(err => console.error('Error saving session to database:', err));
    }
    if (qr) {
      console.log("QR Updated");
      qrCode.toDataURL(qr).then(url => {
        sessions[sessionName].qrCodeUrl = url;
        io.to(sessionName).emit('qrCode', { sessionName, url }); // Emit to a specific room
      }).catch(err => {
        console.error('Error generating QR code:', err);
      });
    }

  });

  sessions[sessionName] = { client: client, qrCodeUrl: null };
  return client;
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (room) => {
    console.log(`Client joined room: ${room}`);
    socket.join(room);
  });
});


app.get('/auth', async (req, res) => {
  const sessionName = makeid(4);

  try {
    await startSession(sessionName);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code Display</title>
        <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
        <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(to right, #6dd5ed, #2193b0);
          color: #fff;
          text-align: center;
        }
        .card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        #qrCodeImage {
          max-width: 100%;
          height: auto;
          border-radius: 5px;
        }
        .hidden {
          display: none;
        }
        #successMessage {
          font-size: 20px;
          padding: 15px;
          background-color: rgba(0, 255, 0, 0.2);
          color: green;
          margin-top: 20px;
          border-radius: 5px;
          border: 1px solid rgba(0, 255, 0, 0.3);
        }
        </style>
        <script>
          const socket = io();
          console.log("Socket.IO client initialized");
      
          socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
            socket.emit('joinRoom', '${sessionName}');
          });
      
          socket.on('qrCode', data => {
            console.log("QR Code received:", data);
            const img = document.getElementById('qrCodeImage');
            if (img && data.sessionName === '${sessionName}') {
              img.src = data.url;
            }
          });
      
          socket.on('connectionOpen', () => {
            document.getElementById('qrCodeImage').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
          });
        </script>
      </head>
      <body>
        <div class="card">
          <h1>Scan QR Code</h1>
          <img id="qrCodeImage" src="" alt="QR Code" />
          <div id="successMessage" class="hidden">Successfully Connected!</div>
        </div>
      </body>
      </html>
      
    `);


  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message || 'Failed to generate QR code' });
  }
});

app.get('/check-number/:number', async (req, res) => {
  const { number } = req.params;

  try {
    const activeSession = await Session.findOne({
      where: { status: true },
      order: sequelize.literal('RAND()'),
      limit: 1
    });

    if (!activeSession) {
      return res.status(404).send({ error: 'No active sessions found' });
    }

    const client = sessions[activeSession.sessionName].client;
    const result = await client.onWhatsApp(`${number}@s.whatsapp.net`);

    if (result.length === 0) {
      res.send({ number, status: false });
    } else {
      res.send({ number, status: true });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Error checking the number' });
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});