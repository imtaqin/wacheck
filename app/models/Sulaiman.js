const { DataTypes } = require('sequelize');
const DB = require('../config/DB');

const SulaimanWhitelist = DB.define('SulaimanWhitelist', {
    sessionName: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
      },
      token : {
        type: DataTypes.STRING,
        allowNull: true
      }
});

module.exports = SulaimanWhitelist;