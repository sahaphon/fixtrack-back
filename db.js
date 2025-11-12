const mysql = require('mysql2/promise')
const { view } = require('./utils/views')
const { checkUndefined } = require('./utils/checkUndefined')
const { dbConfig } = require('./config')
const moment = require('moment')

// Create connection pool for better performance and connection management
let pool = null

// Initialize connection pool
const initializePool = () => {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            queueLimit: 0,
            reconnect: true,
            idleTimeout: 28800000,
            maxLifetime: 86400000,
        })

        pool.on('connection', (connection) => {
            console.log(`New MySQL connection established as ID ${connection.threadId}`)
        })

        pool.on('error', (err) => {
            console.error('MySQL pool error:', err)
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('Attempting to reconnect to MySQL...')
            }
        })

        console.log('MySQL connection pool initialized successfully')
    }
    return pool
}

// Get connection from pool
const getConnection = async () => {
    if (!pool) {
        initializePool()
    }
    
    try {
        const connection = await pool.getConnection()
        return connection
    } catch (error) {
        console.error('Error getting connection from pool:', error)
        throw error
    }
}

// Test database connection
const testConnection = async () => {
    try {
        const connection = await getConnection()
        await connection.ping()
        connection.release()
        // console.log('Database connection test successful')
        return true
    } catch (error) {
        console.error('Database connection test failed:', error)
        return false
    }
}

// Initialize pool on startup
initializePool()
testConnection()

async function handleCallFunction(func = async () => {}, body = {}, req = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            await func({
                body: body,
                ...req,
            }, {
                send: (response) => {
                    return resolve(response)
                },
            })
        } catch (err) {
            reject(err)
        }
    })
}

class ExecuteSQLNoRes {
    async executeSQL(query, params = []) {
        let connection = null
        
        try {
            if (!query || typeof query !== 'string') {
                throw new Error('Invalid query provided')
            }

            connection = await getConnection()
            const [rows, fields] = await connection.execute(query, params)

            if (query.trim().toLowerCase().startsWith('select')) {
                return rows
            } else {
                return {
                    status: 'success',
                    message: `${rows.affectedRows || 0} row(s) affected`,
                    affectedRows: rows.affectedRows || 0,
                    insertId: rows.insertId || null,
                    changedRows: rows.changedRows || 0
                }
            }

        } catch (err) {
            let message = this.checkMessage(err.message)
            console.error('SQL execution error:', message)
            throw new Error(message)
        } finally {
            if (connection) {
                connection.release()
            }
        }
    }

    async executeTransaction(queries, params = []) {
        let connection = null
        
        try {
            if (!Array.isArray(queries) || queries.length === 0) {
                throw new Error('Invalid queries provided for transaction')
            }

            connection = await getConnection()
            await connection.beginTransaction()

            const results = []
            for (let i = 0; i < queries.length; i++) {
                const query = queries[i]
                const queryParams = Array.isArray(params[i]) ? params[i] : []
                
                const [rows] = await connection.execute(query, queryParams)
                results.push(rows)
            }

            await connection.commit()

            return {
                status: 'success',
                message: 'Transaction completed successfully',
                results: results
            }

        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback()
                } catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError)
                }
            }

            let message = this.checkMessage(error.message)
            console.error('Transaction error:', message)
            throw new Error(message)

        } finally {
            if (connection) {
                connection.release()
            }
        }
    }

    async autoID(table_name, column, digit = 1, preFix = '', middle = '') {
        try {
            const sql = `SELECT ${column} FROM ${table_name} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`
            
            const searchPattern = `${preFix}${middle}%`
            let new_id = '0'.repeat(digit - 1) + '1'
            
            let last_id = await this.executeSQL(sql, [searchPattern])
            
            if (last_id.length === 0) {
                new_id = preFix + middle + new_id
                return new_id
            }
            
            const lastIdValue = last_id[0][column].replace(`${preFix}${middle}`, '')
            const nextNum = Number(lastIdValue) + 1
            const paddedNum = nextNum.toString().padStart(digit, '0')
            new_id = preFix + middle + paddedNum
            
            return new_id
        } catch (error) {
            console.error('Error generating auto ID:', error)
            throw error
        }
    }

    checkMessage(err_message) {
        let message = err_message
        
        if (err_message.includes('Duplicate entry')) {
            message = 'ข้อมูลซ้ำ: มีข้อมูลนี้อยู่ในระบบแล้ว'
        }
        
        if (err_message.includes('foreign key constraint') || err_message.includes('CONSTRAINT')) {
            message = 'ไม่สามารถลบได้ เนื่องจากมีการใช้งานแล้ว'
        }
        
        if (err_message.includes('ECONNREFUSED') || err_message.includes('ER_ACCESS_DENIED')) {
            message = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
        }
        
        if (err_message.includes('SQL syntax')) {
            message = 'รูปแบบคำสั่ง SQL ไม่ถูกต้อง'
        }
        
        if (err_message.includes("doesn't exist") || err_message.includes("Unknown column")) {
            message = 'ไม่พบตารางหรือคอลัมน์ที่ระบุ'
        }
        
        return message
    }

    async checkUndefinedParams(body = {}, prefix_message = '', except = []) {
        return new Promise(async (resolve, reject) => {
            const _check = checkUndefined(body, except)
            if (_check) {
                reject(prefix_message + ' ' + _check.message)
            }
            resolve()
        })
    }

    async checkInterface(Iinterface = {}, type_search = '', search = '') {
        return new Promise(async (resolve, reject) => {
            if (Iinterface[type_search] === undefined && search !== '') {
                reject(`type_search Could IN  [ ${Object.keys(Iinterface).join(', ')} ]`)
            }
            resolve()
        })
    }
}

class ExecuteSQL extends ExecuteSQLNoRes {
    constructor(res) {
        super()
        this.res = res
    }

    query(table_name) {
        if (table_name) {
            return new ExCRUD(this.res, table_name)
        } else {
            throw Error(`table_name is Required`)
        }
    }

    async executeSQLAndSend(query, params = []) {
        let connection = null
        
        try {
            if (!query || typeof query !== 'string') {
                throw new Error('Invalid query provided')
            }

            connection = await getConnection()
            const [rows, fields] = await connection.execute(query, params)
            this.res.send(view(rows))

        } catch (err) {
            let message = this.checkMessage(err.message)
            console.error('SQL execution error:', message)
            this.res.send(view(message, false))
        } finally {
            if (connection) {
                connection.release()
            }
        }
    }

    async executeSQL(query, params = []) {
        let connection = null
        
        try {
            if (!query || typeof query !== 'string') {
                throw new Error('Invalid query provided')
            }

            connection = await getConnection()
            const [rows, fields] = await connection.execute(query, params)

            if (query.trim().toLowerCase().startsWith('select')) {
                return rows
            } else {
                return {
                    status: 'success',
                    message: `${rows.affectedRows || 0} row(s) affected`,
                    affectedRows: rows.affectedRows || 0,
                    insertId: rows.insertId || null,
                    changedRows: rows.changedRows || 0
                }
            }

        } catch (err) {
            let message = this.checkMessage(err.message)
            console.error('SQL execution error:', message)
            this.res.send(view(message, false))
            throw new Error(message)
        } finally {
            if (connection) {
                connection.release()
            }
        }
    }

    async executeTransactionAndSend(queries = [], params = []) {
        let connection = null
        
        try {
            // Validate queries
            if (!Array.isArray(queries) || queries.length === 0) {
                throw new Error('Invalid queries provided for transaction')
            }

            // Get connection from pool
            connection = await getConnection()

            // Start transaction
            await connection.beginTransaction()

            // Execute all queries in transaction
            const results = []
            for (let i = 0; i < queries.length; i++) {
                const query = queries[i]
                const queryParams = Array.isArray(params[i]) ? params[i] : []
                
                console.log(`Executing query ${i + 1}:`, query)
                const [rows] = await connection.execute(query, queryParams)
                results.push(rows)
            }

            // Commit transaction
            await connection.commit()
            console.log('Transaction completed successfully')

            // Send success response
            this.res.send(view({
                status: 'success',
                message: 'Transaction completed successfully',
                results: results
            }))

        } catch (error) {
            // Rollback transaction on error
            if (connection) {
                try {
                    await connection.rollback()
                    console.log('Transaction rolled back due to error')
                } catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError)
                }
            }

            let message = this.checkMessage(error.message)
            console.error('Transaction error:', message)
            this.res.send(view(message, false))
            throw new Error(message)

        } finally {
            // Always release connection back to pool
            if (connection) {
                connection.release()
            }
        }
    }
    async checkDuplicate(obj = {}, table_name = '') {
        return new Promise(async (resolve, reject) => {
            const columns = Object.keys(obj)
            const _where = columns.map((c) => `${c} = '${obj[c]}'`)
            const sql = `SELECT ${columns.join(', ')} FROM ${table_name} WHERE ${_where.join(
                ' AND ',
            )}`
            const result = await this.executeSQL(sql)
            if (result.length > 0) {
                resolve(this.res.send(view(true)))
            } else {
                resolve(this.res.send(view(false)))
            }
        })
    }
}

class ExCRUD extends ExecuteSQL {
    constructor(res, table_name) {
        super(res)
        this.table_name = table_name
    }

    async selectGetAll({ column = [], order_by = '', send = true }) {
        let sql = `SELECT ${column.join(', ')} FROM ${this.table_name} WHERE is_active = 1  ${
            order_by ? `ORDER BY ${order_by}` : ''
        }`
        if (send) {
            await this.executeSQLAndSend(sql)
        } else {
            return await this.executeSQL(sql)
        }
    }

    async getByLimit(
        {
            c_select = [],
            search = {
                s_column: '',
                s_value: '',
            },
            order = '',
            limit = 0,
            offset = 0,
            where = {},
            join = '',
            convert = {},
        },
        send = true,
    ) {
        let sql_where = search.s_value
        if (sql_where !== '') {
            // Use full wildcard search for better partial matching
            sql_where = ` WHERE ${search.s_column} LIKE '%${search.s_value}%' `
        }
        if (typeof where === 'object') {
            const where_arr = Object.keys(where)
            where_arr.forEach((col, idx) => {
                if (sql_where === '') {
                    sql_where += ' WHERE ' + `${col} = ${this.convertToString(where[col])}`
                } else {
                    sql_where += ` AND ${col} = ${this.convertToString(where[col])}`
                }
            })
        } else if (typeof where === 'string') {
            if (where) {
                if (sql_where === '') {
                    sql_where = ' WHERE ' + where
                } else {
                    sql_where += ' AND ' + where
                }
            }
        }

        const total_row_sql = `SELECT COUNT(*) as total_record FROM ${this.table_name}
                            ${join}
                            ${sql_where}
                          `
        // console.log("sql: ", total_row_sql);
        let total_record = await this.executeSQL(total_row_sql)
        total_record = total_record[0].total_record

        let query_offset = ''
        if (limit > 0) {
            query_offset = `LIMIT ${limit} OFFSET ${offset}`
        }

        const sql = `SELECT ${c_select.join(', ')} 
                    FROM ${this.table_name}
                    ${join}
                    ${sql_where}
                    ORDER BY ${order} 
                    ${query_offset}`

        // console.log("sql: ", sql);
        let result = await this.executeSQL(sql)
        const col_convert = Object.keys(convert)
        col_convert.forEach((col) => {
            result = result.map((item) => {
                return {
                    ...item,
                    [col]: convert[col] ? convert[col][item[col]] : item[col],
                }
            })
        })

        if (send) {
            return this.res.send(
                view({
                    result: result,
                    total: total_record,
                }),
            )
        } else {
            return result
        }
    }
    async getByLimitTotal({
        search = {
            s_column: '',
            s_value: '',
        },
        where = {},
        join = '',
    }) {
        let sql_where = search.s_value
        if (sql_where !== '') {
            sql_where = ` WHERE ${search.s_column} LIKE '${search.s_value}%' `
        }
        if (typeof where === 'object') {
            const where_arr = Object.keys(where)
            where_arr.forEach((col, idx) => {
                if (sql_where === '') {
                    sql_where += ' WHERE ' + `${col} = ${this.convertToString(where[col])}`
                } else {
                    sql_where += ` AND ${col} = ${this.convertToString(where[col])}`
                }
            })
        } else if (typeof where === 'string') {
            if (where) {
                if (sql_where === '') {
                    sql_where = ' WHERE ' + where
                } else {
                    sql_where += ' AND ' + where
                }
            }
        }

        const total_row_sql = `SELECT COUNT(*) as total_record FROM ${this.table_name}
                            ${join}
                            ${sql_where}
                          `
        // console.log("sql: ", total_row_sql);
        let total_record = await this.executeSQL(total_row_sql)
        return total_record[0].total_record
    }
    async checkDuplicate(obj = {}, send = true) {
        return new Promise(async (resolve, reject) => {
            const columns = Object.keys(obj)
            const _where = columns.map((c) => `${c} = '${obj[c]}'`)
            const sql = `SELECT ${columns.join(', ')} FROM ${this.table_name} WHERE ${_where.join(
                ' AND ',
            )}`

            const result = await this.executeSQL(sql)

            if (send) {
                resolve(this.res.send(view(result.length > 0)))
            } else {
                resolve(result.length > 0)
            }
        })
    }

    async autoID(column, digit = 1, preFix = '', middle = '') {
        try {
            // MySQL syntax - use LIMIT instead of TOP and use prepared statements
            const sql = `SELECT ${column} 
                        FROM ${this.table_name} 
                        WHERE ${column} LIKE ? 
                        ORDER BY ${column} DESC 
                        LIMIT 1`
            
            const searchPattern = `${preFix}${middle}%`
            let new_id = '0'.repeat(digit - 1) + '1'
            
            let last_id = await this.executeSQL(sql, [searchPattern])
            
            if (last_id.length === 0) {
                new_id = `${preFix}${middle}${new_id}`
                return new_id
            }

            // Extract the numeric part and increment
            const lastIdValue = last_id[0][column].replace(`${preFix}${middle}`, '')
            const nextNum = Number(lastIdValue) + 1
            
            // Pad with zeros to maintain digit length
            const paddedNum = nextNum.toString().padStart(digit, '0')
            new_id = preFix + middle + paddedNum
            
            return new_id
        } catch (error) {
            console.error('Error generating auto ID:', error)
            throw error
        }
    }

    convertToString = (s) => {
        if (
            s === 'null' ||
            s === 'NULL' ||
            s === '' ||
            s === ' ' ||
            s === null ||
            s === undefined
        ) {
            return 'null'
        }

        if (typeof s === 'string') {
            if (!s.endsWith('()')) {
                return `'${s}'`
            }
            if (s.toUpperCase() === 'GETDATE()') {
                return `'${moment().format('YYYY-MM-DD HH:mm:ss')}'`
            }
        } else if (typeof s === 'boolean') {
            return s ? 1 : 0
        }
        return s
    }

    async create(columns = {} || [], execute = true) {
        let _columns = []
        let _val = []
        const objToString = (obj) => {
            const temp = []
            Object.keys(obj).map((m) => {
                temp.push(this.convertToString(obj[m]))
            })
            return `( ${temp.join(', ')} )`
        }

        if (Array.isArray(columns)) {
            _columns = Object.keys(columns[0])
            columns.forEach((f) => {
                _val.push(objToString(f))
            })
        } else if (typeof columns === 'object') {
            _columns = Object.keys(columns)
            _val.push(objToString(columns))
        }

        const sql = []
        const limit = 1
        for (let i = 0; i < _val.length; i += limit) {
            const slice_val = _val.slice(i, i + limit)
            sql.push(`INSERT INTO ${this.table_name} 
            (${_columns.join(', ')} )
            VALUES 
            ${slice_val.join(', ')}`)
        }

        if (execute) {
            await this.executeTransactionAndSend(sql)
        } else {
            return sql
        }
    }

    async update(columns = {}, target = {}, execute = true) {
        const _columns = Object.keys(columns)
        const _val = _columns.map((m) => {
            return ` ${m} = ${this.convertToString(columns[m])}`
        })

        let where = ''
        if (typeof target === 'object') {
            let tmp = Object.keys(target).map((item, idx) => {
                return `${item} = ${this.convertToString(target[item])}`
            })
            where = tmp.join(' AND ')
        } else if (typeof target === 'string') {
            where = target
        }

        const sql = `UPDATE ${this.table_name} SET 
                    ${_val.join(', ')}
                    WHERE ${where}
                    `
        if (execute) {
            await this.executeTransactionAndSend([sql])
        } else {
            return sql
        }
    }
    async deleteR(target = {}, execute = true) {
        const _columns = Object.keys(target)
        let sql_where = ''
        _columns.forEach((col, idx) => {
            if (idx > 0) {
                sql_where += ' AND ' + `${col} = ${this.convertToString(target[col])}`
            } else {
                sql_where += `WHERE ${col} = ${this.convertToString(target[col])}`
            }
        })
        const sql = `DELETE ${this.table_name} ${sql_where}`
        if (execute) {
            await this.executeTransactionAndSend([sql])
        }
        return sql
    }
}

class ExCRUD2 {
    constructor(res, table_name) {
        this.res = res
        this.table_name = table_name
        this.ext = new ExecuteSQL(res)
    }

    async select(query = '', print = true) {
        const sql = `SELECT * FROM ${this.table_name} ${query}`
        if (print) {
            await this.ext.executeSQLAndSend(sql)
        } else {
            return await this.ext.executeSQL(sql)
        }
    }

    async insert(body, column_except = [], print = true) {
        await this.ext.checkUndefinedParams(body, 'Insert Error', column_except)
        
        const filteredBody = { ...body }
        column_except.forEach(col => delete filteredBody[col])
        
        const columns = Object.keys(filteredBody).join(', ')
        const placeholders = Object.keys(filteredBody).map(() => '?').join(', ')
        const values = Object.values(filteredBody)
        
        const sql = `INSERT INTO ${this.table_name} (${columns}) VALUES (${placeholders})`
        
        if (print) {
            await this.ext.executeSQLAndSend(sql, values)
        } else {
            return await this.ext.executeSQL(sql, values)
        }
    }

    async update(body, where = '', column_except = [], print = true) {
        await this.ext.checkUndefinedParams(body, 'Update Error', column_except)
        
        const filteredBody = { ...body }
        column_except.forEach(col => delete filteredBody[col])
        
        const setClause = Object.keys(filteredBody).map(key => `${key} = ?`).join(', ')
        const values = Object.values(filteredBody)
        
        const sql = `UPDATE ${this.table_name} SET ${setClause} ${where}`
        
        if (print) {
            await this.ext.executeSQLAndSend(sql, values)
        } else {
            return await this.ext.executeSQL(sql, values)
        }
    }

    async delete(where = '', print = true) {
        const sql = `DELETE FROM ${this.table_name} ${where}`
        
        if (print) {
            await this.ext.executeSQLAndSend(sql)
        } else {
            return await this.ext.executeSQL(sql)
        }
    }

    async page(where = '', order_by = '', order_type = 'ASC', limit = 10, offset = 0, column = '*') {
        const total_row_sql = `SELECT COUNT(*) as total FROM ${this.table_name} ${where}`
        let total_record = await this.ext.executeSQL(total_row_sql)
        const total = total_record[0].total

        const total_page = Math.ceil(total / limit)
        const current_page = Math.floor(offset / limit) + 1
        
        const sql = `SELECT ${column} FROM ${this.table_name} ${where} ${order_by !== '' ? `ORDER BY ${order_by} ${order_type}` : ''} LIMIT ${limit} OFFSET ${offset}`
        let result = await this.ext.executeSQL(sql)

        const response = {
            data: result,
            pagination: {
                current_page,
                total_page,
                total_record: total,
                limit,
                offset
            }
        }

        this.res.send(view(response))
        return response
    }

    async autoID(column, digit = 1, preFix = '', middle = '') {
        return await this.ext.autoID(this.table_name, column, digit, preFix, middle)
    }
}

class ExCRUD_V2 {
    constructor(table_name) {
        this.table_name = table_name
        this.ext = new ExecuteSQLNoRes()
    }

    async select(query = '') {
        const sql = `SELECT * FROM ${this.table_name} ${query}`
        return await this.ext.executeSQL(sql)
    }

    async insert(body, column_except = []) {
        await this.ext.checkUndefinedParams(body, 'Insert Error', column_except)
        
        const filteredBody = { ...body }
        column_except.forEach(col => delete filteredBody[col])
        
        const columns = Object.keys(filteredBody).join(', ')
        const placeholders = Object.keys(filteredBody).map(() => '?').join(', ')
        const values = Object.values(filteredBody)
        
        const sql = `INSERT INTO ${this.table_name} (${columns}) VALUES (${placeholders})`
        return await this.ext.executeSQL(sql, values)
    }

    async update(body, where = '', column_except = []) {
        await this.ext.checkUndefinedParams(body, 'Update Error', column_except)
        
        const filteredBody = { ...body }
        column_except.forEach(col => delete filteredBody[col])
        
        const setClause = Object.keys(filteredBody).map(key => `${key} = ?`).join(', ')
        const values = Object.values(filteredBody)
        
        const sql = `UPDATE ${this.table_name} SET ${setClause} ${where}`
        return await this.ext.executeSQL(sql, values)
    }

    async delete(where = '') {
        const sql = `DELETE FROM ${this.table_name} ${where}`
        return await this.ext.executeSQL(sql)
    }

    async page(where = '', order_by = '', order_type = 'ASC', limit = 10, offset = 0, column = '*') {
        const total_row_sql = `SELECT COUNT(*) as total FROM ${this.table_name} ${where}`
        let total_record = await this.ext.executeSQL(total_row_sql)
        const total = total_record[0].total

        const total_page = Math.ceil(total / limit)
        const current_page = Math.floor(offset / limit) + 1
        
        const sql = `SELECT ${column} FROM ${this.table_name} ${where} ${order_by !== '' ? `ORDER BY ${order_by} ${order_type}` : ''} LIMIT ${limit} OFFSET ${offset}`
        let result = await this.ext.executeSQL(sql)

        return {
            data: result,
            pagination: {
                current_page,
                total_page,
                total_record: total,
                limit,
                offset
            }
        }
    }

    async autoID(column, digit = 1, preFix = '', middle = '') {
        return await this.ext.autoID(this.table_name, column, digit, preFix, middle)
    }

    checkMessage(err_message) {
        return this.ext.checkMessage(err_message)
    }
}

module.exports.ExecuteSQL = ExecuteSQL
module.exports.ExCRUD = ExCRUD
module.exports.ExCRUD2 = ExCRUD2
module.exports.ExCRUD_V2 = ExCRUD_V2
module.exports.ExecuteSQLNoRes = ExecuteSQLNoRes
module.exports.handleCallFunction = handleCallFunction
module.exports.getConnection = getConnection
module.exports.testConnection = testConnection
module.exports.pool = () => pool
