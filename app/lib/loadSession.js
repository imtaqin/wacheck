
const { Session, synchronizeModels } = require('../models/index.js');
const { startSession } = require('./startSession.js');
const fs = require("fs");
async function loadAndInitializeActiveSessions() {
    try {
      const activeSessions = await Session.findAll({ where: { status: true } });
      for (const session of activeSessions) {
        console.log(`Initializing session: ${session.sessionName}`);
        await startSession(session.sessionName,global.io);
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
    }
  }
  

 module.exports ={
    loadAndInitializeActiveSessions
 }