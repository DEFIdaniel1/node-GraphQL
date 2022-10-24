const { validationResult } = require('express-validator')
const fs = require('fs')
const path = require('path')

const Post = require('../models/post')
const User = require('../models/user')

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1
    const perPage = req.query.perPage || 1
    let totalItems
    Post.find()
        .countDocuments()
        .then((documentCount) => {
            totalItems = documentCount
            return (
                // PAGINATION
                Post.find()
                    // Skips data before the page we're on
                    .skip((currentPage - 1) * perPage)
                    // Limit the data for JUST the page (2 items per page, for example)
                    .limit(perPage)
                    .populate('creator', 'name')
            )
        })
        .then((posts) => {
            res.status(200).json({
                message: 'Fetched posts successfully.',
                posts: posts,
                totalItems: totalItems,
            })
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.createPost = (req, res, next) => {
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
    post.save()
        .then((result) => {
            return User.findById(req.userId)
        })
        .then((user) => {
            user.posts.push(post)
            return user.save()
        })
        .then((result) => {
            res.status(201).json({
                message: 'Post created successfully!',
                post: post,
            })
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
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

exports.editPost = (req, res, next) => {
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
    Post.findById(postId)
        .then((post) => {
            if (!post) {
                const error = new Error('Could not find post.')
                error.statusCode = 404
                throw error
            }
            //delete old image file if changed
            if (imageUrl !== post.imageUrl) {
                deleteImage(post.imageUrl)
            }
            post.title = title
            post.imageUrl = imageUrl
            post.content = content
            return post.save()
        })
        .then((result) => {
            res.status(200).json({ message: 'Post updated!', post: result })
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId
    Post.findById(postId)
        .then((post) => {
            if (!post) {
                const error = new Error('Could not find post to delete')
                error.statusCode = 404
                throw error
            }
            deleteImage(post.imageUrl)
            return Post.findByIdAndDelete(postId)
        })
        .then((response) => {
            res.status(200).json({ message: 'Post deleted' })
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

const deleteImage = (filePath) => {
    filePath = path.join(__dirname, '..', filePath)
    fs.unlink(filePath, (err) => console.log(err))
}
