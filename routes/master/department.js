const express = require('express')
const router = express.Router()
const { 
    getDepartments,
    getAllDepartments
 } = require('../../controller/master/department.Controller')

router.post('/',getAllDepartments)
router.post('/get',getDepartments)

module.exports = router
