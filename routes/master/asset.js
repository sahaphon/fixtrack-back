const express = require('express')
const router = express.Router()
const { 
    getAssetsByLimit,
 } = require('../../controller/master/asset.Controller')

router.post('/', getAssetsByLimit)

module.exports = router