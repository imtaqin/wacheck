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
        defaultValue: false // false means connection not opened
    },
    isQrUsed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    qrUsedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

module.exports = Session;
