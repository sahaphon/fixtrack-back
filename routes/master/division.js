const express = require('express')
const router = express.Router()
const { 
    getDivision
 } = require('../../controller/master/division.Controller')

router.post('/', getDivision)

module.exports = router
