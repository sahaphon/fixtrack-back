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
app.use(url + '/users', isNotChrSpecial, require('./routes/users')) //authenticated
app.use(url + '/menus', isNotChrSpecial, require('./routes/menu')) //authenticated

app.use(url + '/assets', isNotChrSpecial, require('./routes/master/asset')) //authenticated
app.use(url + '/departments', isNotChrSpecial, require('./routes/master/department')) //authenticated
app.use(url + '/divisions', isNotChrSpecial, require('./routes/master/division')) //authenticated
app.use(url + '/role', isNotChrSpecial, require('./routes/master/role')) //authenticated
app.use(url + '/firestation', isNotChrSpecial, require('./routes/master/fireStation')) //authenticated

app.use(url + '/repair', isNotChrSpecial, require('./routes/repairOrder')) //authenticated
