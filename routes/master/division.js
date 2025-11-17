const express = require('express')
const router = express.Router()
const { 
    getDivision,
    getAllDivisions
 } = require('../../controller/master/division.Controller')

router.post('/', getAllDivisions)
router.post('/get', getDivision)

module.exports = router
