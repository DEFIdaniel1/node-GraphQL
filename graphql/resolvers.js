const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')

const { jwtSecret } = require('../config')
const User = require('../models/user')
const Post = require('../models/post')
const { clearImage } = require('../util/file')

module.exports = {
    /* 
        Input fields on front-end userInput{email, name, password} to create a new user
        Saves new user to database
        Returns new user data with _id added                       
    */
    createUser: async function ({ userInput }, req) {
        const { email, name, password } = userInput
        //Validation checks for email and password min length
        passwordValidationCheck(password)
        emailValidationCheck(email)
        // Hash password for database storage
        const hashedPw = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            name: name,
            password: hashedPw,
        })
        const createdUser = await user.save()
        return { ...createdUser._doc }
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
            `${jwtSecret}`,
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
        authCheck(req.isAuth)
        // Validate input data
        const { title, content, imageUrl } = postInput
        inputValidationCheck(title, content)
        // Check user database
        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('Invalid user.')
            error.statusCode = 401
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
        await user.save()
        return {
            ...createdPost._doc,
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        }
    },

    /*
        Function to get all posts for logged in/authenticated users
        Checks authentication. Outputs post array with pagination and totalPost count
    */
    posts: async function ({ page }, req) {
        authCheck(req.isAuth)
        if (!page) {
            page = 1
        }
        const itemsPerPage = 2
        const totalPosts = await Post.find().countDocuments()
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .populate('creator')
        return {
            posts: posts.map((p) => {
                return {
                    ...p._doc,
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString(),
                }
            }),
            totalPosts: totalPosts,
        }
    },

    /*
        Return a single post based on the postId
        Expect postId as input
    */
    post: async function ({ id }, req) {
        // authCheck(req.isAuth)
        const post = await Post.findById(id).populate('creator')
        if (!post) {
            const error = new Error('No post found.')
            error.statusCode = 404
            throw error
        }
        return {
            ...post._doc,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
        }
    },

    /* 
        Function to update post. Input: postId and postInput(title, content, imageUrl) 
        Returns updated post document
    */
    updatePost: async function ({ id, postInput }, req) {
        authCheck(req.isAuth)
        const { title, content, imageUrl } = postInput
        const post = await Post.findById(id).populate('creator')
        postExistsCheck(post)
        userIsCreatorCheck(post, req)
        inputValidationCheck(title, content)
        post.title = title
        post.content = content
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = imageUrl
        }
        const updatedPost = await post.save()
        return {
            ...updatedPost._doc,
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString(),
        }
    },

    /* 
        Delete post. Input: postId
        Removes post from database and returns boolean
    */
    deletePost: async function ({ id }, req) {
        authCheck(req.isAuth)
        const post = await Post.findById(id)
        if (!post) {
            const error = new Error('No post found!')
            error.statusCode = 404
            throw error
        }
        userIsCreatorCheck(post, req)
        // Delete image file, post document, and post in user post array
        clearImage(post.imageUrl)
        await Post.findByIdAndRemove(id)
        const user = await User.findById(req.userId)
        user.posts.pull(id)
        user.save()

        return true
    },

    /*
        Check for user and return user data
        Password field null for privacy
    */
    user: async function (args, req) {
        const id = req.userId
        authCheck(req.isAuth)
        const user = await User.findById(id).populate('posts')
        userExistsCheck(user)
        return { ...user._doc, password: null }
    },

    /*
        Ability to edit user data with validation checks on data types
        editUserData: name, email, password, status (all nullable)
        Saves to database, outputs saved user with null password
    */
    editUser: async function (editUserData, req) {
        const id = req.userId
        authCheck(req.isAuth)
        const { name, status, email, password } = editUserData.userInput
        const user = await User.findById(id).populate('posts')
        userExistsCheck(user)
        if (name) {
            user.name = name
        }
        if (status) {
            user.status = status
        }
        if (email) {
            const validEmail = emailNotUsedCheck(email)
            if (validEmail) {
                user.email = email
            }
        }
        if (password) {
            const validPassword = passwordValidationCheck(password)
            if (validPassword) {
                user.password = password
            }
        }
        await user.save()
        return { ...user._doc, password: null }
    },
}

// Check authorization of user
function authCheck(isAuth) {
    if (!isAuth) {
        const error = Error('Not authenticated.')
        error.statusCode = 401
        throw error
    }
}

// Validate password
function passwordValidationCheck(password) {
    if (
        validator.isEmpty(password) ||
        !validator.isLength(password, { min: 5 })
    ) {
        const error = new Error('Password must be at least 5 characters long.')
        error.statusCode = 422
        throw error
    }
    return true
}

// Validate Email input and ensure it is not in use
async function emailValidationCheck(email) {
    if (!validator.isEmail(email)) {
        const error = new Error('Invalid email.')
        error.statusCode = 422
        throw error
    }
    const user = await User.findOne({ email: email })
    if (user) {
        const error = Error('User already exists.')
        error.statusCode = 404
        throw error
    }
    return true
}

// Ensure title and content inupts meet validation requirements for length and type
function inputValidationCheck(title, content) {
    const errors = []
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
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
        const error = new Error('Post cannot be submitted. Invalid field(s).')
        error.data = errors
        error.statusCode = 422
        throw error
    }
    return true
}

// Ensure post exists
function postExistsCheck(post) {
    if (!post) {
        const error = new Error('No post found!')
        error.statusCode = 404
        throw error
    }
}

// Ensure user exists
function userExistsCheck(user) {
    if (!user) {
        const error = Error('User not found.')
        error.statusCode = 404
        throw error
    }
    return true
}

// Ensure user is the correct 'owner' of the changeElement.
// changeElement is either posts or user for modification
function userIsCreatorCheck(changeElement, req) {
    if (changeElement.creator._id.toString() !== req.userId.toString()) {
        const error = new Error('Not authorized!')
        error.statusCode = 403
        throw error
    }
    return true
}
