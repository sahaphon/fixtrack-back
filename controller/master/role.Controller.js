const { ExCRUD } = require('../../db')
const { viewFailed, view, paramRequired, viewParamRequest } = require('../../utils/views')

async function getRole(req, res) {
     try {
        const db = new ExCRUD(res, 'role_master')

        const { offset, limit, search, type_search } = req.body
        await db.checkUndefinedParams({ offset, limit, search, type_search })

        const ITypeSearch = {
            role_id: 'role_id',
            role_name: 'role_name_th',
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        await db.getByLimit(
            {
                c_select: [
                    'role_id',
                    'role_name_th',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                order: 'role_id',
                limit,
                offset,
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

module.exports = {
    getRole,
}