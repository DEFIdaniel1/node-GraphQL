exports.getPosts = (req, res, next) => {
    res.status(200).json({
        title: 'First Post',
        content: 'This is the first post!',
    })
}

exports.postPosts = (req, res, next) => {
    const title = req.body.title
    const content = req.body.content
    // Create post in db
    res.status(201).json({
        message: 'Post created successfully',
        post: { id: new Date(), title: title, content: content },
    })
}
