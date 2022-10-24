const jwt = require('jsonwebtoken')
require('dotenv').config()
const jwtSecret = process.env.JWT_SECRET

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization')
    console.log(jwtSecret)
    if (!authHeader) {
        const error = new Error('No authentication header.')
        error.statusCode = 401
        throw error
    }
    // get token value. value is 'bearer tokenValue' splitting at space
    const token = req.get('Authorization').split(' ')[1]
    let decodedToken
    console.log(token)
    try {
        decodedToken = jwt.verify(token, jwtSecret)
    } catch (err) {
        err.statusCode = 500
        throw err
    }
    // if decoded, but undefined
    if (!decodedToken) {
        const error = new Error('Not authenticated')
        error.statusCode = 401
        throw error
    }
    // valid token
    req.userId = decodedToken.userId // assigning userId from token to req object for use
    next()
}
