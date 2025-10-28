const { viewParamRequest } = require('./views')

function checkUndefined(body = {}, except = []) {
  const key = Object.keys(body).map((key) => ({
    key: key,
    val: body[key],
  }))
  const is_undefined = key.find((ele) => ele.val === undefined && !except.includes(ele.key))
  if (is_undefined) {
    return viewParamRequest(is_undefined.key)
  } else {
    return false
  }
}

module.exports = {
  checkUndefined,
}
