const { Session, synchronizeModels } = require('../models/index.js');
const fs = require("fs");

async function deleteSession(sessionName) {
    try {
      // Delete the session from the database
      await Session.destroy({ where: { sessionName } });
      console.log(`Session ${sessionName} deleted from database.`);
  
      // Delete the session folder
      const sessionPath = `./sessions/${sessionName}`;
       fs.rmSync(sessionPath, { recursive: true, force: true });
       fs.rmdirSync(sessionPath)
     // console.log(`Session folder ${sessionPath} deleted.`);
    } catch (err) {
    //  console.error('Error handling session close:', err);
    }
  }

  module.exports = {
    deleteSession
  }