const Sequelize = require("sequelize");
const config = require("../../config");
const DB = new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASSWORD, {
  host:config.DB_HOST,
  dialect: config.DIALECT /* 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
  logging: false
});

module.exports = DB;