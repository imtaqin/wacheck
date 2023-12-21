const { makeid } = require("../../lib/makeID");
const { startSession } = require("../lib/startSession");
const { Session } = require("../models");
const sequelize = require('sequelize');

module.exports = function (app) {
  app.get('/', async (req, res) => {
    const sessionName = makeid(4);
  
    try {
      await startSession(sessionName,global.io);
  
      res.render('index', { sessionName });
  
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
  
      const client = global.sessions[activeSession.sessionName].client;
      const result = await client.onWhatsApp(`${number}@s.whatsapp.net`);
      //console.log(result)
      if (result && result.length > 0 && result[0].exists) {
        res.send({ number, status: true });
      } else {
        res.send({ number, status: false });
      }
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: 'Error checking the number' });
    }
  });

  app.get('/active-sessions', async (req, res) => {
    try {
      const activeSessions = await Session.findAll({
        where: { status: true }
      });
      res.render('activeSession', { activeSessions });
    } catch (error) {
      console.error('Error retrieving active sessions:', error);
      res.status(500).send({ error: 'Error retrieving active sessions' });
    }
  });
};