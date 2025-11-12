const { ExecuteSQL, ExCRUD } = require('../db')
const { viewFailed, view, paramRequired, viewParamRequest } = require('../utils/views')
const { checkUndefined } = require('../utils/checkUndefined')

const moment = require('moment')

async function getAllMenus(req, res) {
    const db = new ExecuteSQL(res)

    const strSql = 'SELECT menu_id,menu_name FROM menu ORDER BY menu_id'
    await db.executeSQLAndSend(strSql)
}

async function addMenus(req, res) {
    const db = new ExecuteSQL(res)

    const { menu_name, users, created_by } = req.body

    await db.checkUndefinedParams({ menu_name, created_by })

    const new_menu_id = await db.autoID('menu', 'menu_id', (digit = 3), (preFix = 'M'))

    const SQLList = []

    SQLList.push(`INSERT INTO menu (menu_id,menu_name,created_by,created_date) VALUES (
                    '${new_menu_id}',
                    '${menu_name}',
                    '${created_by}',
                    '${moment().format('YYYY-MM-DD HH:mm:ss')}') `)

    let permissions = []
 
    users.forEach(value => {
        strSql = `INSERT INTO user_permit (user_id,menu_id,open_count,action_open,action_view,
                action_add,action_edit,action_delete,action_copy,action_confirm,action_cancel, 
                action_print,action_other)
                    VALUES (
                        '${value.user_id}',
                        '${strNewID}',
                        0,
                        ${value.action_view ? 1 : 0},
                        ${value.action_open ? 1 : 0},
                        ${value.action_add ? 1 : 0},
                        ${value.action_edit ? 1 : 0},
                        ${value.action_delete ? 1 : 0},
                        ${value.action_copy ? 1 : 0},
                        ${value.action_confirm ? 1 : 0},
                        ${value.action_cancel ? 1 : 0},
                        ${value.action_print ? 1 : 0},
                        ${value.action_other ? 1 : 0}
                        )`
            SQLList.push(strSql)
    })


    const chunkSize = 500
    for (let i = 0; i < permissions.length; i += chunkSize) {
        const chunk = permissions.slice(i, i + chunkSize)
        SQLList.push(`INSERT INTO user_permit VALUES ${chunk.join()}`)
    }

    console.log("SQLList: ", SQLList);
    await db.executeTransactionAndSend(SQLList)
}

async function deleteMenu(req, res) {
    const db = new ExecuteSQL(res)

    const { menu_id } = req.body

    await db.checkUndefinedParams({ menu_id })

    const SQLList = []

    SQLList.push(`DELETE FROM menu WHERE menu_id = '${menu_id}' `)
    SQLList.push(`DELETE FROM user_permit WHERE menu_id = '${menu_id}'  `)

    await db.executeTransactionAndSend(SQLList)
}

async function updateMenu(req, res) {
    try {
        const db = new ExecuteSQL(res)

        const { menu_id, menu_name, users, edit_by } = req.body

        await db.checkUndefinedParams({ menu_id, menu_name, users, edit_by })

        const SQLList = []

        SQLList.push(`UPDATE menu SET 
            menu_name='${menu_name}'
            ,edit_by='${edit_by}'
            ,edit_date='${moment().format('YYYY-MM-DD HH:mm:ss')}'
            WHERE menu_id ='${menu_id}'`)

        SQLList.push(`DELETE FROM user_permit WHERE menu_id='${menu_id}'`)

        let permissions = []
        // users.forEach((value) => {
        //     let have_permit = false
        //     for (const permit of permit_list) {
        //         have_permit = have_permit || value[permit]
        //     }
        //     if (have_permit)
        //         for (const permit of permit_list) {
        //             permissions.push(
        //                 `( '${value.emp_id}','${menu_id}','${permit}',${value[permit] ? 1 : 0})`,
        //             )
        //         }
        // })

        const chunkSize = 500
        for (let i = 0; i < permissions.length; i += chunkSize) {
            const chunk = permissions.slice(i, i + chunkSize)
            SQLList.push(`INSERT INTO user_permit VALUES ${chunk.join()}`)
        }

        await db.executeTransactionAndSend(SQLList)
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getMenus(req, res) {
    try {
        const db = new ExCRUD(res, 'menu m')

        const { offset, limit, search, type_search } = req.body

        await db.checkUndefinedParams({ offset, limit, search, type_search })

        const ITypeSearch = {
            menu_id: 'menu_id',
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        await db.getByLimit(
            {
                c_select: [
                    'm.menu_id',
                    'm.menu_name',
                    'm.created_by',
                    'm.created_date',
                    'm.edit_by',
                    'm.edit_date',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                order: 'm.menu_id',
                limit,
                offset
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

async function getMenuDetail(req, res) {
    try {
        const db = new ExCRUD(res, '')

        const { menu_id } = req.body

        await db.checkUndefinedParams({ menu_id })

        let strSql = `SELECT menu_id,menu_name FROM menu WHERE menu_id='${menu_id}'`
        const menu = await db.executeSQL(strSql)

        if (menu.length === 0) {
            return res.send(viewFailed(`Not found menu:${menu_id}`))
        }

        strSql = `SELECT up.user_id,u.emp_id,CONCAT_WS('', u.prefix, u.fullname) AS full_name,
                action_open,action_view,action_add,action_edit,
                action_delete,action_print,action_confirm,
                action_cancel,action_calculate,action_other
                FROM users u
                LEFT JOIN user_permit up ON u.user_id = up.user_id
                WHERE up.menu_id='${menu_id}'
                ORDER BY u.user_id`

        const users = await db.executeSQL(strSql)
        console.log("users: ", users);

        return res.send(
            view({
                ...menu[0],
                users: users.map((value) => {
                    const user_permit = users.find((e) => e.user_id === value.user_id)
                    return user_permit
                        ? {
                              user_id: value.user_id,
                              emp_id: user_permit.emp_id,
                              full_name: value.full_name,
                            //   name_th: user_permit.name_th,
                            //   surname_th: user_permit.surname_th,
                            //   name_eng: user_permit.name_eng,
                            //   surname_eng: user_permit.surname_eng,
                              action_open: user_permit.action_open,
                              action_view: user_permit.action_view,
                              action_add: user_permit.action_add,
                              action_edit: user_permit.action_edit,
                              action_delete: user_permit.action_delete,
                              action_print: user_permit.action_print,
                              action_confirm: user_permit.action_confirm,
                              action_cancel: user_permit.action_cancel,
                              action_calculate: user_permit.action_calculate,
                              action_other: user_permit.action_other,
                          }
                        : {
                              user_id: value.user_id,
                              emp_id: value.emp_id,
                              full_name: value.full_name,
                            //   surname_th: value.surname_th,
                            //   name_eng: value.name_eng,
                            //   surname_eng: value.surname_eng,
                              action_open: false,
                              action_view: false,
                              action_add: false,
                              action_edit: false,
                              action_delete: false,
                              action_print: false,
                              action_confirm: false,
                              action_cancel: false,
                              action_calculate: false,
                              action_other: false,
                          }
                }),
            }),
        )
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getNavigation(req, res) {
    try {
        const db = new ExecuteSQL(res)

        const actionOpen = (menu_id, link, menu) => {
            console.log('Checking menu access for:', menu_id, 'Available menus:', Object.keys(menu))
            if (menu_id in menu) {
                // console.log('Menu found:', menu[menu_id])
                if (menu[menu_id].action_open === true || menu[menu_id].action_open === 1) {
                    return { to: link }
                } else {
                    return { addLinkClass: 'c-disabled', disabled: true }
                }
            } else {
                console.log('Menu not found for:', menu_id)
                return { addLinkClass: 'c-disabled', disabled: true }
            }
        }

        const { user_id } = req.body
        await db.checkUndefinedParams({ user_id })
        const permission = await db.executeSQL(` 
                SELECT up.*,m.menu_name
                FROM user_permit up
                LEFT JOIN menu m ON m.menu_id = up.menu_id
                WHERE up.user_id ='${user_id}'
                `)

        let menu = {}
        // console.log('Raw Permission: ', permission)
        
        permission.forEach((element) => {
            if (!(element.menu_id in menu)) {
                menu[element.menu_id] = { 
                    menu_name: element.menu_name,
                    action_open: false,
                    action_view: false,
                    action_add: false,
                    action_edit: false,
                    action_delete: false,
                    action_print: false,
                    action_confirm: false,
                    action_cancel: false,
                    action_calculate: false,
                    action_other: false
                }
            }
            
            // Map all action permissions from the database
            menu[element.menu_id].action_open = element.action_open || false
            menu[element.menu_id].action_view = element.action_view || false
            menu[element.menu_id].action_add = element.action_add || false
            menu[element.menu_id].action_edit = element.action_edit || false
            menu[element.menu_id].action_delete = element.action_delete || false
            menu[element.menu_id].action_print = element.action_print || false
            menu[element.menu_id].action_confirm = element.action_confirm || false
            menu[element.menu_id].action_cancel = element.action_cancel || false
            menu[element.menu_id].action_calculate = element.action_calculate || false
            menu[element.menu_id].action_other = element.action_other || false
        })
        
        // console.log('Formatted Permission: ', menu)

        let nav = [
            // {
            //     name: '',
            //     icon: 'cilBarChart',
            //     _tag: 'CSidebarNavItem',
            //     ...actionOpen('M002', '/dashboard', menu),
            // },
            {
                name: 'ใบสั่งซ่อม',
                icon: 'cilDescription',
                _tag: 'CSidebarNavItem',
                ...actionOpen('M003', '/repair', menu),
            },
            {
                name: 'ใบเปิดงาน',
                icon: 'cilDescription',
                _tag: 'CSidebarNavItem',
                ...actionOpen('M004', '/workorder', menu),
            },
           {
                name: 'ใบสั่งจ่ายเครื่องจักร',
                icon: 'cilDescription',
                _tag: 'CSidebarNavItem',
                ...actionOpen('M005', '/vehicleout', menu),
            },
            // {
            //     name: 'มาสเตอร์',
            //     icon: 'cilFolder',
            //     attributes: { rel: 'noopener' },
            //     _children: [
            //         {
            //             name: 'รองเท้า',
            //             icon: 'cilDocument',
            //             _tag: 'CSidebarNavItem',
            //             ...actionOpen('M026', '/master/style', menu),
            //         },
            //         {
            //             name: 'รหัสรุ่นรองเท้า',
            //             icon: 'cilDocument',
            //             _tag: 'CSidebarNavItem',
            //             ...actionOpen('M002', '/master/product', menu),
            //         },

            //     ],
            //     _tag: 'CSidebarNavDropdown',
            // },
        ]

        res.send(view(nav))
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

module.exports = {
    getMenus,
    addMenus,
    updateMenu,
    deleteMenu,
    getAllMenus,
    getNavigation,
    getMenuDetail,
}
