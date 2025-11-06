const { ExecuteSQL, ExCRUD } = require('../db')
const { viewFailed, view, viewParamRequest, paramRequired } = require('../utils/views')
const { checkUndefined } = require('../utils/checkUndefined')
const { genRandomString, hashPassword } = require('../middlewares/auth')
const moment = require('moment')

async function login(req, res) {
  const db = new ExecuteSQL(res)
  const { user_id, password } = req.body

  const check_undefined = checkUndefined({ user_id, password })
  if (check_undefined) {
    return res.send(check_undefined)
  }

  let strSql = `SELECT salt FROM users WHERE user_id = '${user_id}'`
  console.log(strSql)
  const result_check = await db.executeSQL(strSql)

  if (result_check.status === 'failed') return res.send(viewFailed(result_check.message))
  if (result_check.length === 0) return res.send(viewFailed('ไม่พบ USER'))

  const check_password = `SELECT user_id,prefix,fullname,user_level,position_id
                                ,is_active 
                                FROM users
                                WHERE user_id='${user_id}' 
                                AND password = '${hashPassword(password, result_check[0].salt)}'
                                `
  const result_check_password = await db.executeSQL(check_password)
  if (result_check_password.status === 'failed') return res.send(viewFailed(result_check.message))
  if (result_check_password.length === 0) return res.send(viewFailed('รหัสผ่านผิดพลาด'))

  const user = result_check_password[0]
  if (!user.user_id) return res.send(viewFailed('ไม่พบ USER'))
  if (!user.is_active) return res.send(viewFailed('USER ID ไม่สามารถใช้งานได้'))

  // return res.send(result_check_password)

  const token = genRandomString(323)
  const loginDate = moment().format('YYYY-MM-DD HH:mm:ss')

  strSql = `UPDATE users SET
                    last_login='${loginDate}'
                    ,token='${token}'
                    WHERE user_id='${user_id}'`

  const update = await db.executeSQL(strSql)

  if (update.status === 'failed') {
    return res.send({ status: 'failed', data: update })
  }

  strSql = `WITH uLog AS (
        SELECT ROW_NUMBER() OVER(ORDER BY login_date DESC) AS RowDate,user_id,login_date
        FROM users_log
        WHERE user_id='${user_id}')

        DELETE FROM users_log
        WHERE user_id IN (
          SELECT user_id FROM (
            SELECT user_id
            FROM users_log
            WHERE user_id='${user_id}'
            ORDER BY login_date DESC
            LIMIT 999999 OFFSET 9
          ) AS t
        );`

  let userLog = await db.executeSQL(strSql)

  if (userLog.status === 'failed') {
    return res.send(viewFailed({ message: 'Log error', error: userLog.message }))
  }

  strSql = `INSERT INTO users_log (user_id,login_date)
                VALUES (
                    '${user_id}',
                    '${loginDate}'
                )`

  userLog = await db.executeSQL(strSql)
  if (userLog.status === 'failed') {
    return res.send({ status: 'failed', data: userLog })
  }

  res.send(
    view({
        message: 'Login Success',
        access_token: token,
        ...user,
        user_level: check_password[0].user_level,
    }),
  )
}

module.exports = {
  login,
}
