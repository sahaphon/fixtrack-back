const { ExCRUD } = require('../../db')
const { viewFailed, view, paramRequired, viewParamRequest } = require('../../utils/views')

async function getDivision(req, res) {
     try {
        const db = new ExCRUD(res, 'division')

        const { offset, limit, search, type_search } = req.body
        await db.checkUndefinedParams({ offset, limit, search, type_search })

        const ITypeSearch = {
            division_id: 'division_id',
            division_name: 'division_name',
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        await db.getByLimit(
            {
                c_select: [
                    'division_id',
                    'division_name',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                order: 'division_id',
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
    getDivision,
}