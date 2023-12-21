const { DataTypes } = require('sequelize');
const DB = require('../config/DB');

const Session = DB.define('Session', {
    sessionName: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
});

module.exports = Session;