const express = require('express')
const router = express.Router()
const { 
    getBadgeRepair,
    getAllRepairOrders
 } = require('../controller/repairOrder.Controller')


router.post('/', getAllRepairOrders)
router.post('/badge', getBadgeRepair) 

module.exports = router