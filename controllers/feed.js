const { validationResult } = require('express-validator')
const Post = require('../models/post')

exports.getPosts = (req, res, next) => {
    res.status(200).json({
        _id: '1',
        title: 'First Post',
        content: 'This is the first post!',
        imageUrl: 'images/cat.webp',
        creator: {
            name: 'Daniel',
        },
        date: new Date().toISOString(),
    })
}

exports.postPosts = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res
            .status(422)
            .json({ message: 'Validation failed.', errors: errors.array() })
    }
    const title = req.body.title
    const content = req.body.content
    const post = new Post({
        title: title,
        content: content,
        creator: { name: 'Daniel' },
        // mongodb will add new ID and timestamp
    })
    post.save().then((postResult) => {
        console.log(postResult)
        res.status(201)
            .json({
                message: 'Post created successfully',
                post: postResult,
            })
            .catch((err) => console.log(err))
    })
}
