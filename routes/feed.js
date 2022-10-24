const express = require('express')
const { body } = require('express-validator')
const router = express.Router()

const isAuth = require('../middleware/is-auth')
const feedController = require('../controllers/feed')

// GET /feed/posts
router.get('/posts', isAuth, feedController.getPosts)
// POST /feed/posts
router.post(
    '/post',
    isAuth,
    [
        body('title').trim().isLength({ min: 5 }),
        body('content').trim().isLength({ min: 5 }),
    ],
    feedController.createPost
)
router.get('/post/:postId', isAuth, feedController.getSinglePost)

//PUT Edit post
router.put(
    '/post/:postId',
    isAuth,
    [
        body('title').trim().isLength({ min: 5 }),
        body('content').trim().isLength({ min: 5 }),
    ],
    feedController.editPost
)

//DELETE
router.delete('/post/:postId', isAuth, feedController.deletePost)

module.exports = router
