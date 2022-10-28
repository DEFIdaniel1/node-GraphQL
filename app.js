const path = require('path')
require('dotenv').config()
const mongoDbPassword = process.env.MONGO_DB_PASSWORD

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const multer = require('multer')

const app = express()

// Multer & Body Parser Setup
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
app.use(bodyParser.json())
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)

//CORS - middleware for allowing diff server requests
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    )
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200)
    }
    next()
})

//IMAGES - middleware to deal static images folder
app.use('/images', express.static(path.join(__dirname, 'images')))

// GraphQL
const { graphqlHTTP } = require('express-graphql')
const graphqlSchema = require('./graphql/schema')
const graphqlResolver = require('./graphql/resolvers')
app.use(
    '/graphql',
    graphqlHTTP({
        schema: graphqlSchema,
        rootValue: graphqlResolver,
        graphiql: true,
        customFormatErrorFn: (error) => ({
            message: error.message || 'An error occured',
            code: error.statusCode || 500,
            data: error.data,
        }),
    })
)

// Error handling
app.use((error, req, res, next) => {
    console.log(error)
    const status = error.statusCode || 500
    const message = error.message
    const data = error.data
    res.status(status).json({ message: message, data: data })
})

mongoose
    .connect(
        `mongodb+srv://dpisterzi:${mongoDbPassword}@cluster0.wdwpbii.mongodb.net/messages?retryWrites=true&w=majority`
    )
    .then((result) => {
        app.listen(4040)
    })
    .catch((err) => console.log(err))
