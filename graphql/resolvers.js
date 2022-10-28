const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')

const jwtPassword = process.env.JWT_PASSWORD //TO DO: resolve using passport
const User = require('../models/user')
const Post = require('../models/post')

module.exports = {
    /* 
        Input fields on front-end userInput{email, name, password} to create a new user
        Saves new user to database
        Returns new user data with _id added
    */
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

    /* 
        Input fields on front-end: email, password
        Validates credentials
        Returns JWT, userId 
    */
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

    /* 
        Input fields on front-end: postInput{title, content, imageUrl}
        Saves new post to database
        Returns document data and adds _id, createdAt, updatedAt 
    */
    createPost: async function ({ postInput }, req) {
        // Check JWT authentication
        if (!req.isAuth) {
            const error = new Error('Not authenticated.')
            error.code = 401
            throw error
        }
        // Validate input data
        const { title, content, imageUrl } = postInput
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
        // Check user database
        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('Invalid user.')
            error.code = 401
            throw error
        }
        // Save post to database
        const post = new Post({
            title: title,
            content: content,
            imageUrl: imageUrl,
            creator: user,
        })
        const createdPost = await post.save()
        user.posts.push(createdPost)
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        }
    },
}
