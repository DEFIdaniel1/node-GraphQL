const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()

const feedRoutes = require('./routes/feed')
const mongoDbPassword = process.env.MONGO_DB_PASSWORD

const app = express()

app.use(bodyParser.json()) // application/json

//middleware for allowing diff server requests (CORS)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE'
    )
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
})

app.use('/feed', feedRoutes)

mongoose
    .connect(
        `mongodb+srv://dpisterzi:${mongoDbPassword}@cluster0.wdwpbii.mongodb.net/messages?retryWrites=true&w=majority`
    )
    .then((result) => {
        console.log('Connected to DB')
        app.listen(8080)
    })
    .catch((err) => console.log(err))
