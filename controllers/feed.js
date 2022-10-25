const { validationResult } = require('express-validator')
const fs = require('fs')
const path = require('path')

const Post = require('../models/post')
const User = require('../models/user')
const io = require('../socket')

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1
    const perPage = 2
    try {
        const totalItems = await Post.find().countDocuments()
        const posts = await Post.find()
            .skip((currentPage - 1) * perPage)
            .limit(perPage)
            .populate('creator', 'name')
            .sort({ createdAt: -1 })
        // Skips data before the page we're on
        // Limit the data for JUST the page (2 items per page, for example)
        res.status(200).json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems,
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode = 422
        throw error
    }
    if (!req.file) {
        const error = new Error('No image provided.')
        error.statusCode = 422
        throw error
    }
    const imageUrl = req.file.path
    const title = req.body.title
    const content = req.body.content
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId,
    })
    try {
        await post.save()
        const user = await User.findById(req.userId)
        user.posts.push(post)
        await user.save()
        // push post to other users
        //sending full post DB doc, and adding creator field so it can display as need on the FE
        io.getIO().emit('posts', {
            action: 'create',
            post: {
                ...post._doc,
                creator: { _id: req.userId, name: user.name },
            },
        })
        res.status(201).json({
            message: 'Post created successfully!',
            post: post,
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.getSinglePost = (req, res, next) => {
    const postId = req.params.postId
    Post.findById(postId)
        .then((post) => {
            if (!post) {
                const error = new Error('Could not find post.')
                error.statusCode = 404
                throw error
            }
            res.status(200).json({ message: 'Post fetched.', post: post })
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.editPost = async (req, res, next) => {
    const postId = req.params.postId
    const title = req.body.title
    const content = req.body.content
    //Validate content
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode = 422
        throw error
    }
    //Image validation
    //If image doesn't change; front-end name is image (not imageURl, which is why the difference)
    let imageUrl = req.body.image
    //If image is changed
    if (req.file) {
        imageUrl = req.file.path
    }
    //If unable to load image from previous or new
    if (!imageUrl) {
        const error = new Error('No image file selected')
        error.statusCode = 422
        throw error
    }
    //Find and update post in database
    try {
        const post = await Post.findById(postId).populate('creator')
        if (!post) {
            const error = new Error('Could not find post.')
            error.statusCode = 404
            throw error
        }
        // Check user = post creator
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not authorized: not post author.')
            error.statusCode = 403
            throw error
        }
        //delete old image file if changed
        if (imageUrl !== post.imageUrl) {
            deleteImage(post.imageUrl)
        }
        post.title = title
        post.imageUrl = imageUrl
        post.content = content
        await post.save()
        io.getIO().emit('posts', { action: 'update', post: post })
        res.status(200).json({ message: 'Post updated!', post: post })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId
    try {
        const post = await Post.findById(postId)
        if (!post) {
            const error = new Error('Could not find post to delete')
            error.statusCode = 404
            throw error
        }
        // Check user = post creator
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorized: not post author.')
            error.statusCode = 403
            throw error
        }
        // remove image from file system
        deleteImage(post.imageUrl)
        await Post.findByIdAndDelete(postId)

        const user = await User.findById(req.userId)
        user.posts.pull(postId)
        await user.save()
        io.getIO().emit('posts', { action: 'delete', post: postId })
        res.status(200).json({ message: 'Post deleted' })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

const deleteImage = (filePath) => {
    filePath = path.join(__dirname, '..', filePath)
    fs.unlink(filePath, (err) => console.log(err))
}
