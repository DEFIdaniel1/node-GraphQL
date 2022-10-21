const express = require('express')
const router = express.Router()
const feedController = require('../controllers/feed')

// GET /feed/posts
router.get('/posts', feedController.getPosts)
// POST /feed/posts
router.post('/posts', feedController.postPosts)

module.exports = router
