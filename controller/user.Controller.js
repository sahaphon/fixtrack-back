const { ExecuteSQL, ExCRUD } = require('../db')
const { viewFailed, view, viewParamRequest } = require('../utils/views')
const { sendErrorIO } = require('./socketIO.Controller')
const { checkUndefined } = require('../utils/checkUndefined')
const { permit_list, formatPermission } = require('../utils/permission')
const { PROGRAM_NAME } = require('../config')
const { MYSQL_DATABASE } = process.env

const moment = require('moment')
const { hashPassword } = require('../middlewares/auth')

async function getEmpData(req, res) {
    try {
        const { emp_id } = req.body

        const db = new ExecuteSQL(res)

        await db.checkUndefinedParams({ emp_id })

        const check_dup_sql = `SELECT * FROM registered WHERE emp_id = '${emp_id}'`
        const check_dup_result = await db.executeSQL(check_dup_sql)

        if (check_dup_result.length > 0) {
            return res.send(viewFailed('User นี้ถูกใช้งานแล้ว'))
        }

        const get_emp_sql = `SELECT emp_id,name_th,surname_th,name_eng,surname_eng,department_id
        ,department_description,position,emp_status,level_manager
        FROM [Employees].[dbo].[employees] WHERE emp_id = '${emp_id}'`
        const get_emp_result = await db.executeSQL(get_emp_sql)

        if (get_emp_result.status === 'failed') {
            return res.send({
                success: false,
                message: get_emp_result.message,
            })
        }
        if (get_emp_result.length === 0) {
            return res.send(viewFailed('ไม่พบรหัสพนักงาน'))
        }

        const emp_data = get_emp_result[0]
        if (!emp_data.emp_status) {
            return res.send(viewFailed('ไม่พบรหัสพนักงาน (2)'))
        }

        return res.send(view(emp_data))
    } catch (error) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getUsers(req, res) {
    try {
        const db = new ExCRUD(res, 'users u')
        const { limit, offset, search, type_search } = req.body

        const ITypeSearch = {
            user_id: 'u.user_id',
            name: 'u.fullname',
            dep_name: 'dp.dep_name',
            division_name: 'dv.division_name',
        }
        await db.checkUndefinedParams({ limit, offset, search, type_search })

        await db.checkInterface(ITypeSearch, type_search, search)
        await db.getByLimit(
            {
                c_select: [
                    'u.is_active',
                    'u.user_id',
                    'u.user_level',
                    'u.prefix',
                    'u.fullname',
                    'u.last_login',
                    'u.dep_code',
                    'dp.dep_name',
                    'u.division_id',
                    'dv.division_name',
                    'u.level_id',
                    'lv.level_name',
                    'po.position_name',
                    'u.created_by',
                    'u.created_date',
                    'u.edit_by',
                    'u.edit_date',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                order: 'u.user_id',
                limit,
                offset,
                join: `
                    LEFT JOIN department dp ON dp.dep_code = u.dep_code
                    LEFT JOIN division dv ON dv.division_id = u.division_id
                    LEFT JOIN level lv ON lv.level_id = u.level_id
                    LEFT JOIN position po ON po.position_id = u.position_id
                `,
            },
            (send = true),
        )
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getUserDetail(req, res) {
    try {
        const db = new ExCRUD(res, 'users u')

        const { user_id } = req.body
        await db.checkUndefinedParams({ user_id })

        const strSql = `SELECT u.is_active,IFNULL(u.emp_id, '') emp_id,u.user_level,u.last_login
                            ,u.prefix,u.fullname,u.position_id,u.dep_code
                            ,u.division_id,u.level_id,dp.dep_code AS department_id
                            ,dp.dep_name AS department_name
                            ,dv.division_id,dv.division_name
                            ,lv.level_name AS position
                            ,po.position_id,po.position_name
                            ,m.menu_id,m.menu_name
                            ,up.action_open,up.action_view,up.action_add,up.action_edit
                            ,up.action_delete,up.action_print,up.action_confirm
                            ,up.action_cancel,up.action_other
                            FROM users u
                            LEFT JOIN user_permit up ON up.user_id = u.user_id
                            LEFT JOIN menu m ON up.menu_id = m.menu_id
                            LEFT JOIN division dv ON dv.division_id = u.division_id
                            LEFT JOIN department dp ON dp.dep_code = u.dep_code
                            LEFT JOIN level lv ON lv.level_id = u.level_id
                            LEFT JOIN position po ON po.position_id = u.position_id
                            WHERE u.user_id ='${user_id}'
                            ORDER BY m.menu_id`
                          
        const result = await db.executeSQL(strSql)
        const menu = await db.executeSQL(`SELECT menu_id,menu_name FROM menu`)
        // const signData = await db.executeSQL(
        //     `SELECT [position],[group] FROM user_sign WHERE user_id = '${user_id}'`,
        // )

        // let sign = {}
        // console.log(signData)
        // for (const s of signData) {
        //     console.log(s)
        //     if (!(s.position in sign)) {
        //         sign[s.position] = [s.group]
        //     } else {
        //         sign[s.position].push(s.group)
        //     }
        // }

        return res.send(
            view({
                status_user: result[0].is_active,
                emp_id: result[0].emp_id,
                name: result[0].prefix + ' ' + result[0].fullname,
                user_level: result[0].user_level,
                position_id: result[0].position_id,
                position_name: result[0].position_name,
                department_id: result[0].department_id,
                department_name: result[0].department_name,
                division_id: result[0].division_id,
                division_name: result[0].division_name,
                last_login: result[0].last_login,
                name_th: result[0].name_th,
                surname_th: result[0].surname_th,
                menu: menu.map((value) => {
                    const user_permit = result.find((e) => e.menu_id === value.menu_id)
                    return user_permit
                        ? {
                              menu_id: user_permit.menu_id,
                              menu_name: user_permit.menu_name,
                              action_open: user_permit.action_open,
                              action_view: user_permit.action_view,
                              action_add: user_permit.action_add,
                              action_edit: user_permit.action_edit,
                              action_delete: user_permit.action_delete,
                              action_print: user_permit.action_print,
                              action_confirm: user_permit.action_confirm,
                              action_cancel: user_permit.action_cancel,
                            //   action_calculate: user_permit.action_calculate,
                              action_other: user_permit.action_other,
                          }
                        : {
                              menu_id: value.menu_id,
                              menu_name: value.menu_name,
                              action_open: false,
                              action_view: false,
                              action_add: false,
                              action_edit: false,
                              action_delete: false,
                              action_print: false,
                              action_confirm: false,
                              action_cancel: false,
                            //   action_calculate: false,
                              action_other: false,
                          }
                }),
                // sign: sign,
            }),
        )
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getProfile(req, res) {
    try {
        const db = new ExecuteSQL(res)
        const { user_id } = req.body

        await db.checkUndefinedParams({ user_id })
        const check_password = `SELECT prefix,fullname,position_id,dep_code,user_level,is_active 
                                FROM users WHERE user_id ='${user_id}'`

        const result_check_password = await db.executeSQL(check_password)

        const user = result_check_password[0]
        if (!user.is_active) return res.send(viewFailed('USER ID ไม่สามารถใช้งานได้'))

        res.send(
            view({
                ...user
            }),
        )
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function addNewUser(req, res) {
    try {
        const db = new ExecuteSQL(res)
        const { emp_id, user_level, menu, sign, created_by } = req.body

        await db.checkUndefinedParams({ emp_id, user_level, menu, created_by })

        const result = await db.executeSQL(`SELECT emp_id FROM registered WHERE emp_id='${emp_id}'`)

        if (result.length !== 0) {
            return res.send(viewFailed(`userID : ${emp_id} exist!`))
        }

        const SQLList = []

        SQLList.push(`INSERT INTO registered (emp_id,user_level,created_by,created_date)
                  VALUES ( '${emp_id}', '${user_level}', '${created_by}', 
                  '${moment().format('YYYY-MM-DD HH:mm:ss')}')`)

        let permissions = []
        // menu.forEach((value) => {
        //     let have_permit = false
        //     for (const permit of permit_list) {
        //         have_permit = have_permit || value[permit]
        //     }
        //     if (have_permit)
        //         for (const permit of permit_list) {
        //             permissions.push(`( '${emp_id}',
        //           '${value.menu_id}','${permit}',${value[permit] ? 1 : 0}
        //           )`)
        //         }
        // })

        const chunkSize = 500
        for (let i = 0; i < permissions.length; i += chunkSize) {
            const chunk = permissions.slice(i, i + chunkSize)
            SQLList.push(`INSERT INTO user_permit VALUES ${chunk.join()}`)
        }

        if (sign) {
            for (const position of Object.keys(sign)) {
                for (const group of sign[position]) {
                    SQLList.push(
                        `INSERT INTO user_sign VALUES ('${emp_id}','${position}','${group}')`,
                    )
                }
            }
        }

        const add_user_program = `INSERT INTO [Employees].[dbo].[programs] VALUES ('${emp_id}' , '${PROGRAM_NAME}' , '${MSSQL_DATABASE}','${emp_id}')`
        SQLList.push(add_user_program)

        await db.executeTransactionAndSend(SQLList)
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function editUser(req, res) {
    try {
        const db = new ExecuteSQL(res)

        const { user_id, user_level, menu, sign, edit_by } = req.body
        await db.checkUndefinedParams({ emp_id, user_level, menu, edit_by })

        const SQLList = []

        SQLList.push(`UPDATE registered  SET 
                  user_level='${user_level}'
                  ,edit_by='${edit_by}'
                  ,edit_date='${moment().format('YYYY-MM-DD HH:mm:ss')}'
                  WHERE emp_id ='${emp_id}'`)

        SQLList.push(`DELETE FROM user_permit WHERE user_id='${emp_id}'`)

        let permissions = []
        // menu.forEach((value) => {
        //     let have_permit = false
        //     for (const permit of permit_list) {
        //         have_permit = have_permit || value[permit]
        //     }
        //     if (have_permit)
        //         for (const permit of permit_list) {
        //             permissions.push(`( '${emp_id}',
        //           '${value.menu_id}','${permit}',${value[permit] ? 1 : 0}
        //           )`)
        //         }
        // })

        const chunkSize = 500
        for (let i = 0; i < permissions.length; i += chunkSize) {
            const chunk = permissions.slice(i, i + chunkSize)
            SQLList.push(`INSERT INTO user_permit VALUES ${chunk.join()}`)
        }

        SQLList.push(`DELETE FROM user_sign WHERE user_id='${emp_id}'`)

        // if (sign) {
        //     for (const position of Object.keys(sign)) {
        //         for (const group of sign[position]) {
        //             SQLList.push(
        //                 `INSERT INTO user_sign VALUES ('${emp_id}','${position}','${group}')`,
        //             )
        //         }
        //     }
        // }
        await db.executeTransactionAndSend(SQLList)
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function changeStatus(req, res) {
    try {
        const db = new ExecuteSQL(res)

        const { emp_id, is_active, edit_by } = req.body
        await db.checkUndefinedParams({ emp_id, is_active, edit_by })

        const sql = `UPDATE registered SET is_active = ${is_active ? 1 : 0}
        WHERE emp_id = '${emp_id}'`

        await db.executeSQLAndSend(sql)
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getPermission(req, res) {
    try {
        const db = new ExecuteSQL(res)

        const { user_id, menu_id } = req.body

        const permit = await db.executeSQL(` 
            SELECT up.menu_id,m.menu_name,up.*
            FROM user_permit up
            LEFT JOIN menu m ON m.menu_id = up.menu_id
            WHERE up.user_id ='${user_id}'
                AND up.menu_id = '${menu_id}'`)

        const permission = formatPermission(permit)

        res.send(view(permission[0]))
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getAllUser(req, res) {
    const db = new ExecuteSQL(res)

    await db.executeSQLAndSend(`
        SELECT r.emp_id,e.name_th , e.surname_th ,e.name_eng , e.surname_eng  FROM [OEE].[dbo].[registered] r 
            LEFT JOIN [Employees].[dbo].[employees] e ON  e.emp_id = r.emp_id `)
}

async function changePassword(req, res) {
    try {
        const db = new ExecuteSQL(res)
        const { user_id, pass_old, pass_new } = req.body
        await db.checkUndefinedParams({ user_id, pass_old, pass_new })

        let strSql = `SELECT salt FROM [Employees].[dbo].[employees] WHERE emp_id='${user_id}' `
        const salt = await db.executeSQL(strSql)

        if (salt.status === 'failed') {
            return res.send({ success: true, message: '', response: salt })
        }
        if (salt.length === 0) {
            return res.send(viewFailed('ไม่พบรหัสพนักงาน'))
        }

        strSql = `SELECT emp_id 
            FROM [Employees].[dbo].[employees]
            WHERE emp_id='${user_id}' 
            AND password = '${hashPassword(pass_old, salt[0].salt)}'`

        let result = await db.executeSQL(strSql)

        if (result.status === 'failed') {
            return res.send(viewFailed(result.message))
        }

        if (result.length === 0) {
            return res.send(viewFailed('Old password has incorrect'))
        }

        strSql = `UPDATE [Employees].[dbo].[employees] SET password ='${hashPassword(
            pass_new,
            salt[0].salt,
        )}'
            WHERE emp_id='${user_id}'`

        await db.executeSQL(strSql)
        res.send(view('Change password successfully'))
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

module.exports = {
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
}
