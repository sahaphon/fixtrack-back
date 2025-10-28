const jwt = require('jsonwebtoken')
const moment = require('moment')

const createJWT = (key = 'secret_key', expires_in = 30 * 60) => {
  const token = jwt.sign({}, key, { expiresIn: expires_in })
  // console.log(token)
  return token
}

const verifyJWT = (token, key = secret_key) => {
  try {
    const data = jwt.verify(token, key)
    return data
  } catch (e) {
    console.log(e)
    return 'invalid KEY'
  }
}

const checkExpired = (token, key) => {
  try {
    const result = verifyJWT(token, key)
    if (result && moment.unix(result.exp) > moment()) {
      return true
    }
    return false
  } catch (e) {
    console.log(e)
    return false
  }
}

module.exports = {
  createJWT,
  verifyJWT,
  checkExpired,
}
