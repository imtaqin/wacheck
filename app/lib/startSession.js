const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  Browsers
} = require("@whiskeysockets/baileys");

const { Session, SulaimanWhitelist } = require('../models');
const pino = require("pino");
const { Logger } = require('./logger');
const { deleteSession } = require("./DeleteSession");

const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
const logger = require('pino')({ level: 'silent' });

async function startSession(sessionName, io) {
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionName}`);
  const version = await fetchLatestBaileysVersion();
  Logger('info', `Starting session: ${sessionName}, using WA v${version.isLatest}`);

  try {
    const client = makeWASocket({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    store.bind(client.ev);

    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        Logger('info', "Connection successfully opened with session: " + sessionName);
        await SulaimanWhitelist.upsert({ sessionName });
        global.io.to(sessionName).emit('connectionOpen');
        Session.upsert({ sessionName, status: true });
      } else if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.badSession) {
          Logger('error', `Bad Session File, Please Delete Session and Scan Again`);
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.loggedOut) {
          Logger('error', "Account has been logged out...");
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut) {
          Logger('error', "Restarting session...");
          startSession(sessionName);
        }
      }
    });

    // Listen for the phone number from the client
    io.on('connection', (socket) => {
      socket.on('submitPhoneNumber', async (data) => {
        const { phoneNumber } = data;

        // Retry function to attempt requesting the pairing code
        async function retryRequestPairingCode(attempt = 1) {
          try {
            if (!state.creds.registered) {
              let code = await client.requestPairingCode(phoneNumber);
              code = formatPairingCode(code);
              Logger('info', `Your Pairing Code: ${code}`);
              
              // Emit the pairing code to the client
              global.io.to(sessionName).emit('pairingCode', { sessionName, code });
            } else {
              if (attempt <= 3) { // Limit retries to 3 attempts
                Logger('info', `Connection not open, retrying to request pairing code in 30 seconds... (Attempt ${attempt})`);
                setTimeout(() => retryRequestPairingCode(attempt + 1), 30000); // Retry after 30 seconds
              } else {
                Logger('error', 'Failed to request pairing code after 3 attempts.');
              }
            }
          } catch (err) {
            Logger('error', `Error requesting pairing code: ${err.message}`);
          }
        }

        // Start the retry process immediately
        retryRequestPairingCode();
      });
    });

    client.ev.on('creds.update', saveCreds);
    global.sessions[sessionName] = { client: client, pairingCode: null };
    return client;

  } catch (error) {
    console.log(error);
    return error;
  }
}

// Helper function to format pairing code
function formatPairingCode(code) {
  return code?.match(/.{1,4}/g)?.join("-") || code;
}

module.exports = {
  startSession
};
