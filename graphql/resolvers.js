const bcrypt = require('bcryptjs')
const User = require('../models/user')

module.exports = {
    createUser: async function ({ userInput }, req) {
        const { email, name, password } = userInput
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
