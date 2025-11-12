const express = require('express')
const router = express.Router()
const { 
    getRole
 } = require('../../controller/master/role.Controller')


router.post('/', getRole)

module.exports = router
