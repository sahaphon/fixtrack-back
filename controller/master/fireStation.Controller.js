const { ExCRUD, ExecuteSQL } = require('../../db')
const { viewFailed, view, paramRequired, viewParamRequest } = require('../../utils/views')

async function getAllFireStation(req, res) {
    try {   
        const db = new ExecuteSQL(res, '')
        const sql = `SELECT station_code, station_name, division_id FROM station ORDER BY station_code ASC`
        const result = await db.executeSQL(sql)
        res.send(view(result))
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

async function getFireStation(req, res) {
     try {
        const db = new ExCRUD(res, 'station s')

        const { offset, limit, search, type_search } = req.body
        await db.checkUndefinedParams({ offset, limit, search, type_search })

        const ITypeSearch = {
            station_code: 'station_code',
            station_name: 'station_name',
            division_id: 'division_id',
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        await db.getByLimit(
            {
                c_select: [
                    's.station_code',
                    's.station_name',
                    's.division_id',
                    'd.division_name',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                order: 's.station_code',
                join: `INNER JOIN division d ON s.division_id = d.division_id`,
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
    getAllFireStation,
    getFireStation,
}