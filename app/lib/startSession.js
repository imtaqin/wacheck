const { Boom } = require("@hapi/boom");
const fs = require("fs");
const sendDify = require("./sdk/SulaimanAI");
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
const qrCode = require('qrcode');
const LLAMA = require("./sdk/Llama");
const botNumbers = ['62895338495789', '6289651661876'];  
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
      const { connection, lastDisconnect, qr } = update;
      console.log(update);
      if (connection === "close") {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.badSession) {
          Logger('error', `Bad Session File, Please Delete Session and Scan Again`);
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.connectionClosed) {
          Logger('error', false);
        } else if (reason === DisconnectReason.connectionLost) {
          Logger('error', "Restart Required, Restarting...");
          Session.upsert({ sessionName, status: false });
        } else if (reason === DisconnectReason.connectionReplaced) {
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.loggedOut) {
          Logger('error', "Account has been logged out...");
          await deleteSession(sessionName);
        } else if (reason === DisconnectReason.restartRequired) {
          Logger('error', "Restart Required, Restarting...");
          Session.upsert({ sessionName, status: true });
          startSession(sessionName);
        } else if (reason === DisconnectReason.timedOut) {
          Logger('error', "Connection TimedOut, Reconnecting...");
          Session.upsert({ sessionName, status: false });
          startSession(sessionName);
        } else {
          Logger('error', `Unknown DisconnectReason: ${reason}|${connection}`);
          startSession(sessionName);
        }
      }
      if (connection === "open") {
        Logger('info', "Connection successfully opened with session: " + sessionName);
        await SulaimanWhitelist.upsert({ sessionName });
        global.io.to(sessionName).emit('connectionOpen');
        Session.upsert({ sessionName, status: true });
      }
      if (qr) {
        Logger('info', "QR Updated for session: " + sessionName);
        qrCode.toDataURL(qr).then(url => {
          global.sessions[sessionName].qrCodeUrl = url;
          global.io.to(sessionName).emit('qrCode', { sessionName, url });
        });
      }
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.process(async (events) => {
      if (events["messages.upsert"]) {
        const upsert = events["messages.upsert"];
        for (const msg of upsert.messages) {
          if (msg.message) {
            let text;
            if (msg.message.conversation) {
              text = msg.message.conversation;
            } else if (msg.message.extendedTextMessage?.text) {
              text = msg.message.extendedTextMessage.text;
            }

            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const isMentioned = mentionedJid.some(jid => botNumbers.includes(jid.split('@')[0]));

            if (isMentioned) {
              const text = msg.message.extendedTextMessage.text;
              const mentions = msg.message.extendedTextMessage.contextInfo.mentionedJid;
              const mentionedText = mentions.map(jid => '@' + jid.split('@')[0]).join(' ');
              const messageWithoutMention = text.replace(mentionedText, '').trim();
              const textmsg = messageWithoutMention;
              const waitMsg = `\nPesan anda : _*${textmsg}*_\n\nAku sedang memprosesnya.. \nMohon tunggu sebentar ya :)`;
              await client.sendMessage(msg.key.remoteJid, { text: waitMsg }, { quoted: msg });

              console.log("Dify Query:", textmsg);
              console.log("Dify Session:", sessionName);
              const answer = await sendDify(textmsg, sessionName);
              console.log("Dify response:", answer);

              await client.sendMessage(msg.key.remoteJid, { text: answer }, { quoted: msg });
            } else {
              console.log("The bot was not mentioned in the message.");
            }
          } else {
            console.log("Received an unsupported message format.");
          }
        }
      }
    });

    global.sessions[sessionName] = { client: client, qrCodeUrl: null };
    return client;
  } catch (error) {
    console.log(error);
    return error;
  }
}

module.exports = {
  startSession
};
