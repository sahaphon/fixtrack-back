const express = require('express')
const router = express.Router()
const { 
    getAllAssets,
    getAssets,
 } = require('../../controller/master/asset.Controller')

router.post('/', getAllAssets)
router.post('/get', getAssets)

module.exports = router