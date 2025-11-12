const { ExecuteSQL, ExCRUD } = require('../db')
const { viewFailed, view, viewParamRequest, paramRequired } = require('../utils/views')
const { checkUndefined } = require('../utils/checkUndefined')

async function getAllRepairOrders(req, res) {
    try {
        const db = new ExCRUD(res, 'repair_order r')

        const { offset, limit, search, type_search, filter } = req.body
        await db.checkUndefinedParams({ offset, limit, search, type_search, filter })

        const ITypeSearch = {
            repair_no: 'r.repair_no',
            date: 'r.date',
        }
        await db.checkInterface(ITypeSearch, type_search, search)

        let sqlWhere = ``
        const IFilter = {}
        if (filter) {
            for (const f of Object.keys(filter)) {
                if (filter[f].length == 0) continue

                if (sqlWhere !== '') {
                    sqlWhere += ' AND '
                }

                switch (f) {
                    case 'status_repair':
                        const sqlStatus = filter[f].map((status) => {
                            switch (status) {
                                case 'wait_confirm': {
                                    return `s.status = 'WAITING'`
                                }
                                case 'confirmed': {
                                    return `s.status = 'APPROVED'`
                                }
                            }
                        })
                        sqlWhere += `( ${sqlStatus.join(' OR ')} )`
                        break

                    // case 'cancel':
                    //     // console.log('>> do cancel filter')
                    //     const sqlCancel = filter[f].map((cancel) => {
                    //         return cancel
                    //             ? `(ISNULL(cn.status,'') = 'C' )`
                    //             : `(ISNULL(cn.status,'') != 'C' )`
                    //     })
                    //     sqlWhere += `( ${sqlCancel.join(' OR ')} )`
                    //     break

                    default:
                        sqlWhere += `${IFilter[f]} IN ('${filter[f].join("','")}')`
                        break
                }
            }
        }

        await db.getByLimit(
            {
                c_select: [
                    'r.status',
                    's.status AS aprovel',
                    'r.repair_no',
                    'r.date',
                    'v.vehicle_name',
                    "CONCAT_WS(' - ', dp1.dep_name, dv1.division_name) AS from_org",
                    "CONCAT_WS(' - ', dp2.dep_name, dv2.division_name) AS to_org",
                    'a.asset_no',
                    'a.asset_name',
                    "CONCAT_WS(' ', u.prefix, u.fullname, CONCAT('(', u.phone, ')')) AS contact_name",
                    "CASE WHEN s.status = 'APPROVED' THEN CONCAT_WS('', s.approver_position, ' (', s.approved_date, ')') ELSE '' END AS approved",
                    'r.created_by',
                    'r.created_date',
                    'r.edit_by',
                    'r.edit_date'
                ],
                search: {
                    s_column: ITypeSearch[type_search],
                    s_value: search,
                },
                where: sqlWhere,
                order: 'r.repair_id DESC',
                join: `
                        INNER JOIN vehicle_type v ON r.vehicle_type = v.vehicle_type
                        INNER JOIN department dp1 ON r.from_department = dp1.dep_code
                        INNER JOIN department dp2 ON r.to_department = dp2.dep_code
                        INNER JOIN division dv1 ON r.from_division = dv1.division_id
                        INNER JOIN division dv2 ON r.to_division = dv2.division_id
                        INNER JOIN asset a ON r.asset_id = a.asset_id
                        INNER JOIN users u ON r.contact_person = u.emp_id
                        INNER JOIN repair_approval s ON r.repair_id = s.repair_id
                    `,
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

async function getBadgeRepair(req, res) {
    try {
        const db = new ExecuteSQL(res)
        const total_repair = await db.query('repair_order').getByLimitTotal({})

        const total_wait_confirm = await db.query('repair_order r').getByLimitTotal({
            where: ` a.status = 'WAITING'`,
            join: ` INNER JOIN repair_approval a ON r.repair_id = a.repair_id`
        })

        const total_confirmed = await db.query('repair_order r').getByLimitTotal({
            where: ` a.status = 'APPROVED'`,
            join: ` INNER JOIN repair_approval a ON r.repair_id = a.repair_id`
        })

        res.send(
            view({
                confirmed: total_confirmed,
                wait_confirm: total_wait_confirm,
                all: total_repair,
            }),
        )
    } catch (e) {
        res.send(viewFailed(e.message || e))
        if (e.message) {
            throw new Error(e)
        }
    }
}

module.exports = {
    getAllRepairOrders,
    getBadgeRepair
}