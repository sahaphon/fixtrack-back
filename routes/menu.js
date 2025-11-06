const express = require('express')
const router = express.Router()
const {
    getMenus,
    getMenuDetail,
    addMenus,
    updateMenu,
    deleteMenu,
    getAllMenus,
    getNavigation,
} = require('../controller/menu.Controller')

router.post('/', getMenus)
router.post('/get', getMenuDetail)
router.post('/add', addMenus)
router.post('/delete', deleteMenu)
router.post('/update', updateMenu)
router.post('/get_all', getAllMenus)
router.post('/nav', getNavigation)

module.exports = router
