const express = require('express')
const router = express.Router()
const { 
    getDepartments
 } = require('../../controller/master/department.Controller')

router.post('/',getDepartments)

module.exports = router
