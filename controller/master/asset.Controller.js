const { ExCRUD, ExecuteSQL } = require('../../db')
const { viewFailed, view, paramRequired, viewParamRequest } = require('../../utils/views')

async function getAssetsByLimit(req, res) {
     try {
        const db = new ExCRUD(res, 'asset a')

        const { offset, limit, search, type_search } = req.body
        console.log('Request Body:', req.body);
        await db.checkUndefinedParams({ offset, limit, search, type_search })

        const ITypeSearch = {
            asset_no: 'a.asset_no',
            asset_name: 'a.asset_name'
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        await db.getByLimit(
            {       
                c_select: [
                    'a.asset_id',
                    'a.asset_no',
                    'a.asset_name',
                    'a.asset_type',
                    'at.description AS asset_type_name',
                    'a.brand',
                    'a.model',
                    'a.plate_no',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                where: `a.status = 'ACTIVE'`,
                join: `INNER JOIN asset_type at ON a.asset_type = at.asset_type`,
                order: 'a.asset_no',
                limit,
                offset,
            },
            (send = true),
            log = true
        )
    } catch (e) {
        console.error(e);
        res.send(viewFailed(e.message || e))
    }
}

module.exports = {
    getAssetsByLimit,
}       
