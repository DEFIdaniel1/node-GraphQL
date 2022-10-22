const express = require('express')
const { body, validationResult } = require('express-validator')
const router = express.Router()

const feedController = require('../controllers/feed')

// GET /feed/posts
router.get('/posts', feedController.getPosts)
// POST /feed/posts
router.post(
    '/posts',
    [
        body('title').trim().isLength({ min: 7 }),
        body('content').trim().isLength({ min: 5 }),
    ],
    feedController.postPosts
)

module.exports = router
