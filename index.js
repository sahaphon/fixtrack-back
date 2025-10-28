const express = require('express')
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser')
const http = require('http').Server(app)
const { socketConnection, sendLogIO } = require('./controller/socketIO.Controller')
const { PORT, STORE_FILES } = require('./config')
const { authenticated, hashPassword } = require('./middlewares/auth')
const { isNotChrSpecial } = require('./middlewares/special_char')

const url = '/api'

http.listen(PORT)
app.use(cors())
socketConnection(http)

module.exports.server = http

app.use(bodyParser.json({ limit: '50mb' }))
app.use(
    bodyParser.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000,
    }),
)
app.use(url + '/login', require('./routes/login'))
app.use(url + '/users', authenticated, isNotChrSpecial, require('./routes/users'))
app.use(url + '/menus', authenticated, isNotChrSpecial, require('./routes/menu'))
