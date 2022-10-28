const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    /* 
        JWT token authentication middleware
        Adds userId and isAuth value to req object if authenticated
     */
    const authHeader = req.get('Authorization')
    if (!authHeader) {
        req.isAuth = false
        return next()
    }
    // Check if tokens match
    const token = authHeader.split(' ')[1]
    let decodedToken
    try {
        decodedToken = jwt.verify(
            token,
            'lkjasdlkfjsntakljsdfamzxclfalksjdflkasdfklj'
        )
    } catch (err) {
        req.isAuth = false
        return next()
    }
    if (!decodedToken) {
        req.isAuth = false
        return next()
    }

    req.userId = decodedToken.userId
    req.isAuth = true
    next()
}
