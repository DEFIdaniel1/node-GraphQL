require('dotenv').config()

module.exports = {
    jwtSecret: process.env.JWT_SECRET,
    mongoDbPassword: process.env.MONGO_DB_PASSWORD,
    mongoUser: process.env.MONGO_USER,
    port: process.env.PORT,
}
