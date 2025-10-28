const express = require('express')
const router = express.Router()
const { login } = require('../controller/login.Controller')

router.post('/', login)

module.exports = router
