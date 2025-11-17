const express = require('express')
const router = express.Router()
const { getAllFireStation, getFireStation } = require('../../controller/master/fireStation.Controller')

router.post('/', getAllFireStation)
router.post('/get', getFireStation)

module.exports = router
