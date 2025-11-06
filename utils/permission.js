const { ExecuteSQL, ExCRUD } = require('../db')

const permit_list = [
    'action_add',
    'action_calculate',
    'action_cancel',
    'action_confirm',
    'action_copy',
    'action_delete',
    'action_edit',
    'action_open',
    'action_other',
    'action_print',
    'action_view',
]

const formatPermission = (permission) => {
    if (!Array.isArray(permission) || permission.length === 0) {
        console.log('Invalid or empty permission data')
        return []
    }

    let permit = {}
    // console.log('Raw Permission: ', permission) 
    
    permission.forEach((element) => {
        if (!element.menu_id) {
            console.warn('Permission element missing menu_id:', element)
            return
        }

        if (!(element.menu_id in permit)) {
            permit[element.menu_id] = { 
                menu_name: element.menu_name || 'Unknown Menu',
                user_id: element.user_id,
                open_count: element.open_count || 0
            }
        }
        
        // Add all action permissions to the permit object
        permit_list.forEach((action) => {
            if (element.hasOwnProperty(action)) {
                permit[element.menu_id][action] = element[action]
            }
        })

        // Also add any other action_* properties that might not be in permit_list
        Object.keys(element).forEach((key) => {
            if (key.startsWith('action_') && !permit_list.includes(key)) {
                permit[element.menu_id][key] = element[key]
            }
        })
    })

    const result = []

    for (let menuId of Object.keys(permit)) {
        result.push({
            menu_id: menuId,
            ...permit[menuId],
        })
    }

    // console.log('Formatted Permission: ', result)
    return result
}

module.exports = { permit_list, formatPermission }
