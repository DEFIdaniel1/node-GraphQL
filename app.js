const path = require('path')
require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const multer = require('multer')

// const upload = multer({ dest: 'uploads/' })
const feedRoutes = require('./routes/feed')
const mongoDbPassword = process.env.MONGO_DB_PASSWORD

const app = express()
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images')
    },
    fileName: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname)
    },
})
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true)
    } else {
        cb(null, false)
    }
}

app.use(bodyParser.json()) // application/json
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)
//middleware for allowing diff server requests (CORS)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    )
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
})

//middleware to deal static images folder
app.use('/images', express.static(path.join(__dirname, 'images')))

app.use('/feed', feedRoutes)

// Error handling
app.use((error, req, res, next) => {
    console.log(error)
    const status = error.statusCode || 500
    const message = error.message
    res.status(status).json({ message: message })
})

mongoose
    .connect(
        `mongodb+srv://dpisterzi:${mongoDbPassword}@cluster0.wdwpbii.mongodb.net/messages?retryWrites=true&w=majority`
    )
    .then((result) => {
        console.log('Connected to DB')
        app.listen(8080)
    })
    .catch((err) => console.log(err))
