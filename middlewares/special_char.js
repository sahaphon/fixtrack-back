const { sendErrorIO } = require("../controller/socketIO.Controller")

const isNotChrSpecial = async (req, res, next) => {
  const authToken = req.headers.authorization
  if (authToken === undefined || authToken === 'null' || !authToken) {
    return res.send({
      success: false,
      message: 'token is required',
      response: {
        status: 'failed',
        err: 'token is required'
      }
    })
  }

  const [userID, token] = authToken.split(':')

  if (isSpecialCharsPresent(userID)) {
    return res.send({
      success: false,
      message: 'Not used special char',
      response: {
        status: 'failed',
        err: 'Not used special char'
      }
    })
  }
  const { ...params } = req.body
  const _params = { ...params }

  const keys = Object.keys(_params).some(s => isSpecialCharsPresent(_params[s]))

  if (keys) {
    return res.send({
      success: false,
      message: 'Not used special char',
      response: {
        status: 'failed',
        err: 'Not used special char'
      }
    })
  }

  if (isSpecialCharsPresent(token)) {
    return res.send({
      success: false,
      message: 'Not used special char',
      response: {
        status: 'failed',
        err: 'Not used special char'
      }
    })
  }
  next()
}

function isSpecialCharsPresent(string) {
  if (typeof string !== 'string') {
    return false
  }
  const specialChars = '[!#$%^&*=[]{};\'"\\|<>?];'
  const specialChr = specialChars.split('').some(char => {
    const temp = string.includes(char)
    if (temp) {
      sendErrorIO(`text => ${string}`)
      sendErrorIO(`include => ${char}`)
    }
    return temp
  }
  ) // true if present and false if not
  return specialChr
}

module.exports = {
  isNotChrSpecial
}
