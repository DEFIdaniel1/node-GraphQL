const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const jwtPassword = process.env.JWT_PASSWORD
const User = require('../models/user')

module.exports = {
    // Input fields on front-end (email, name password) to create a new user
    createUser: async function ({ userInput }, req) {
        const { email, name, password } = userInput
        //Validation checks for email and password min length
        const errors = []
        if (!validator.isEmail(email)) {
            errors.push({ message: 'Email is invalid' })
        }
        if (
            validator.isEmpty(password) ||
            !validator.isLength(password, { min: 5 })
        ) {
            errors.push({ message: 'Password too short' })
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input')
            error.data = errors
            error.statusCode = 422
            throw error
        }
        // Validate user does not exist
        const existingUser = await User.findOne({ email: email })
        if (existingUser) {
            const error = new Error('User already exists')
            throw error
        }
        // Hash password for database
        const hashedPw = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            name: name,
            password: hashedPw,
        })
        const createdUser = await user.save()
        // Need to overwrite createdUser to a string object for graphql
        return { ...createdUser._doc, _id: createdUser._id.toString() }
    },
    // Login function. Inputs are email and password.
    login: async function ({ email, password }) {
        const user = await User.findOne({ email: email })
        // Validate user exists
        if (!user) {
            const error = new Error('User not found.')
            error.statusCode = 401
            throw error
        }
        // Validate hashed password
        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            const error = new Error('Password does not match.')
            error.statusCode = 401
            throw error
        }
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email,
            },
            'lkjasdlkfjsntakljsdfamzxclfalksjdflkasdfklj',
            { expiresIn: '1h' }
        )
        return { token: token, userId: user._id.toString() }
    },
}
