const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')

const jwtPassword = process.env.JWT_PASSWORD //TO DO: resolve using passport
const User = require('../models/user')
const Post = require('../models/post')

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
            errors.push({ message: 'Password is too short' })
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
    login: async function ({ email, password }, req) {
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

    createPost: async function ({ postInput }, req) {
        const { title, content, imageUrl } = postInput
        //Validation
        const errors = []
        if (
            validator.isEmpty(title) ||
            !validator.isLength(title, { min: 5 })
        ) {
            errors.push({
                message: 'Title is invalid: must be >5 characters.',
            })
        }
        if (
            validator.isEmpty(content) ||
            !validator.isLength(content, { min: 5 })
        ) {
            errors.push({
                message: 'Content is invalid: must be > 5 characters.',
            })
        }
        if (errors.length > 0) {
            const error = new Error(
                'Post cannot be submitted. Invalid field(s).'
            )
            error.data = errors
            error.statusCode = 422
            throw error
        }

        // Save post to database
        const post = new Post({
            title: title,
            content: content,
            imageUrl: imageUrl,
        })
        const createdPost = await post.save()
        // Return post with additional mongodb data (id, createdAt, updatedAt)
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        }
    },
}
