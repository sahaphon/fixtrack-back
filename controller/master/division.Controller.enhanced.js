const { ExCRUD } = require('../../db')
const { viewFailed, view, paramRequired, viewParamRequest } = require('../../utils/views')
const { SearchPatterns, buildLikeWhere } = require('../../utils/searchPatterns')

async function getDivision(req, res) {
    try {
        const db = new ExCRUD(res, 'division')

        const { offset, limit, search, type_search, search_pattern } = req.body
        await db.checkUndefinedParams({ offset, limit, search, type_search })

        const ITypeSearch = {
            division_id: 'division_id',
            division_name: 'division_name',
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        // Determine search pattern based on request or default to CONTAINS
        let pattern = SearchPatterns.CONTAINS
        switch (search_pattern) {
            case 'exact':
                pattern = SearchPatterns.EXACT
                break
            case 'starts_with':
                pattern = SearchPatterns.STARTS_WITH
                break
            case 'ends_with':
                pattern = SearchPatterns.ENDS_WITH
                break
            case 'contains':
            default:
                pattern = SearchPatterns.CONTAINS
                break
        }

        await db.getByLimit(
            {
                c_select: [
                    'division_id',
                    'division_name',
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                    s_pattern: pattern // Pass pattern to getByLimit
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

// Alternative function with multiple search fields
async function getDivisionMultiSearch(req, res) {
    try {
        const db = new ExCRUD(res, 'division')

        const { offset, limit, search_conditions } = req.body
        await db.checkUndefinedParams({ offset, limit, search_conditions })

        // Example: search_conditions = [
        //     { column: 'division_id', value: 'DIV', pattern: 'starts_with' },
        //     { column: 'division_name', value: 'การ', pattern: 'contains' }
        // ]

        await db.getByLimit(
            {
                c_select: [
                    'division_id',
                    'division_name',
                ],
                search: {
                    s_multiple: search_conditions // Use multiple search conditions
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
    getDivisionMultiSearch,
}