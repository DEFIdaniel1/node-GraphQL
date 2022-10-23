const express = require('express')
const { body } = require('express-validator')
const router = express.Router

const User = require('../models/user')
const authController = require('../controllers/auth')

router.put(
    '/signup',
    [
        // Validation
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            // Add custom validation requirement. Checking our DB if user already exists
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then((matchingUser) => {
                    if (matchingUser) {
                        return Promise.reject('Email already exists')
                    }
                })
            })
            .normalizeEmail(),
        body('password').trim().isLength({ min: 7 }),
        body('name').trim().not().isEmpty(),
    ],
    authController.signup
)

module.exports = router
