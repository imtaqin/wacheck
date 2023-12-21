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
const { Session } = require('../models');
const pino = require("pino");
const { Logger } = require('./logger');
const { deleteSession } = require("./DeleteSession");
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
const qrCode = require('qrcode');

async function startSession(sessionName, io) {
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionName}`);
  const version = await fetchLatestBaileysVersion();
  Logger('info', `Starting session: ${sessionName}, using WA v${version.isLatest}`);
  try {

  const client = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Desktop'),
    auth: state,
  });


    store.bind(client.ev);

    client.ev.on('creds.update', saveCreds);


    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (connection === "close") {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.badSession) {
          Logger('error', `Bad Session File, Please Delete Session and Scan Again`);
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.connectionClosed) {
          Logger('error', false);
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.connectionLost) {
          Logger('error', false);
          Logger('error', "Restart Required, Restarting...");
          Session.upsert({ sessionName, status: false })
            .then(() => Logger('info', `Session ${sessionName} saved/updated in database.`))
        } else if (reason === DisconnectReason.connectionReplaced) {
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.loggedOut) {
          Logger('error', "Account has been logout...");
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.restartRequired) {
          Logger('error', "Restart Required, Restarting...");
          Session.upsert({ sessionName, status: false })
            .then(() => Logger('info', `Session ${sessionName} saved/updated in database.`))
            .catch(err => console.error('Error saving session to database:', err));
          startSession(sessionName);
        } else if (reason === DisconnectReason.timedOut) {
          Logger('error', "Connection TimedOut, Reconnecting...");
          Session.upsert({ sessionName, status: false })
            .then(() => Logger('info', `Session ${sessionName} saved/updated in database.`))
            .catch(err => console.error('Error saving session to database:', err));
          startSession(sessionName);
        } else {
          Logger('error', `Unknown DisconnectReason: ${reason}|${connection}`);
          startSession(sessionName);
        }
      }
      if (connection === "open") {
        Logger('info', "Connection successfully opened");
        global.io.to(sessionName).emit('connectionOpen');

        Session.upsert({ sessionName, status: true })
          .then(() => Logger('info', `Session ${sessionName} saved/updated in database.`))
          .catch(err => console.error('Error saving session to database:', err));
      }
      if (qr) {
        Logger('info', "QR Updated");
        qrCode.toDataURL(qr).then(url => {
          global.sessions[sessionName].qrCodeUrl = url;
          global.io.to(sessionName).emit('qrCode', { sessionName, url }); // Emit to a specific room
        }).catch(err => {
          Logger('error', 'Error generating QR code:', err);
        });
      }

    });

    global.sessions[sessionName] = { client: client, qrCodeUrl: null };
    return client;
  } catch (error) {
    console.log(error)
    return error
  }
}

module.exports = {
  startSession
}