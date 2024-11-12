
const { Session, synchronizeModels } = require('../models/index.js');
const { startSession } = require('./startSession.js');
const fs = require("fs");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function loadAndInitializeActiveSessions() {
    try {
      const activeSessions = await Session.findAll();
      console.log(`Found ${activeSessions.length} active sessions`);
      for (const session of activeSessions) {
        console.log(`Initializing session: ${session.sessionName}`);
        await startSession(session.sessionName,global.io);
        //await delay(5000);
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
    }
  }
  

 module.exports ={
    loadAndInitializeActiveSessions
 }