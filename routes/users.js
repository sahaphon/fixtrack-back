const express = require('express')
const router = express.Router()
const {
    getEmpData,
    getUsers,
    getUserDetail,
    getProfile,
    addNewUser,
    editUser,
    changeStatus,
    getPermission,
    getAllUser,
    changePassword,
} = require('../controller/user.Controller.js')

router.post('/', getUsers)
router.post('/permission', getPermission)
router.post('/get', getUserDetail)
router.post('/get_emp', getEmpData)
router.post('/get_all', getAllUser)
router.post('/profile', getProfile)
router.post('/add', addNewUser)
router.post('/update', editUser)
router.post('/change/status', changeStatus) //{ emp_id, is_active, edit_by }
router.post('/change/password', changePassword) //{ emp_id, old_password, new_password }

module.exports = router
