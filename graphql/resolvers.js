const bcrypt = require('bcryptjs')
const validator = require('validator')

const User = require('../models/user')

module.exports = {
    createUser: async function ({ userInput }, req) {
        const { email, name, password } = userInput
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
        const existingUser = await User.findOne({ email: email })
        if (existingUser) {
            const error = new Error('User already exists')
            throw error
        }
        const hashedPw = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            name: name,
            password: hashedPw,
        })
        const createdUser = await user.save()
        // syntax below overrides the createdUser to a string object, which we need for graphQL output
        return { ...createdUser._doc, _id: createdUser._id.toString() }
    },
}
