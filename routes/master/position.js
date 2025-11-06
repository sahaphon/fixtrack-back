const express = require('express')
const router = express.Router()
const { 
    getPosition
 } = require('../../controller/master/position')


router.post('/', getPosition)

module.exports = router
