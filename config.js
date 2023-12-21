
module.exports = {
    APP_PORT: process.env.APP_PORT ?? 3000,
    DB_HOST: process.env.DB_HOST ?? "localhost",
    DB_NAME: process.env.DB_NAME ?? "checker",
    DB_USER: process.env.DB_USER ?? "root",
    DIALECT: process.env.DB_DIALECT ?? "mysql",
    DB_PASSWORD: process.env.DB_PASSWORD ?? "",
}