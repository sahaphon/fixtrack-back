const express = require('express')
const router = express.Router()
const { 
    getAllFireStation
 } = require('../../controller/master/fireStation.Controller')

router.post('/', getAllFireStation)

module.exports = router
