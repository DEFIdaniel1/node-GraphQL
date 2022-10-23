const express = require('express')
const { body } = require('express-validator')
const router = express.Router()

const feedController = require('../controllers/feed')

// GET /feed/posts
router.get('/posts', feedController.getPosts)
// POST /feed/posts
router.post(
    '/post',
    [
        body('title').trim().isLength({ min: 5 }),
        body('content').trim().isLength({ min: 5 }),
    ],
    feedController.createPost
)
router.get('/post/:postId', feedController.getSinglePost)

//PUT Edit post
router.put(
    '/post/:postId',
    [
        body('title').trim().isLength({ min: 5 }),
        body('content').trim().isLength({ min: 5 }),
    ],
    feedController.editPost
)

//DELETE
router.delete('/post/:postId', feedController.deletePost)

module.exports = router
