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

  const check_user = `SELECT salt FROM [Employees].[dbo].[employees] WHERE emp_id = '${user_id}'`
  const result_check = await db.executeSQL(check_user)
  if (result_check.status === 'failed') return res.send(viewFailed(result_check.message))
  if (result_check.length === 0) return res.send(viewFailed('ไม่พบ USER'))

  const check_password = `SELECT emp_id,name_th , surname_th , name_eng , surname_eng , department_id
                                , department_description , emp_status , is_active 
                                FROM [Employees].[dbo].[employees] 
                                WHERE emp_id='${user_id}' 
                                AND password = '${hashPassword(password, result_check[0].salt)}'
                                `
  const result_check_password = await db.executeSQL(check_password)
  if (result_check_password.status === 'failed') return res.send(viewFailed(result_check.message))
  if (result_check_password.length === 0) return res.send(viewFailed('รหัสผ่านผิดพลาด'))

  const user = result_check_password[0]
  if (!user.emp_status) return res.send(viewFailed('ไม่พบ USER_2'))
  if (!user.is_active) return res.send(viewFailed('USER ID ไม่สามารถใช้งานได้'))

  // return res.send(result_check_password)

  let strSql = `SELECT emp_id,user_level FROM registered WHERE emp_id='${user_id}'  `
  const check_registered = await db.executeSQL(strSql)

  if (check_registered.status === 'failed') {
    return res.send(viewFailed(check_registered.message))
  }

  if (check_registered.length === 0) {
    return res.send(viewFailed('คุณไม่มีสิทธิ์เข้าใช้งานโปรแกรมนี้'))
  }

  const token = genRandomString(323)

  const loginDate = moment().format('YYYY-MM-DD HH:mm:ss')

  strSql = `UPDATE registered SET
                    last_login='${loginDate}'
                    ,token='${token}'
                    WHERE emp_id='${user_id}'`

  const update = await db.executeSQL(strSql)

  if (update.status === 'failed') {
    return res.send({ status: 'failed', data: update })
  }

  strSql = `WITH uLog AS (
        SELECT ROW_NUMBER() OVER(ORDER BY login_date DESC) AS RowDate,user_id,login_date
        FROM users_log
        WHERE user_id='${user_id}')
        DELETE FROM uLog WHERE RowDate >= 10`

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
      user_level: check_registered[0].user_level,
    }),
  )
}

module.exports = {
  login,
}
