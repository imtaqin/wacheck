const DB = require('../config/DB');
const Session = require('./Session.js');
const SulaimanWhitelist = require('./Sulaiman.js');

async function synchronizeModels() {
  try {
    await DB.sync({alter : true});
    console.log('Database & tables created!');
  } catch (err) {
    console.error('Error creating database & tables: ', err);
  }
}

module.exports = {
    Session,
    synchronizeModels,
    SulaimanWhitelist
}