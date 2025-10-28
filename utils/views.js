const moment = require('moment')
const db = require('../db')

function view(response) {
  return {
    success: true,
    message: 'success',
    response,
  }
}

function viewFailed(message) {
  return {
    success: false,
    message,
  }
}

function viewParamRequest(message) {
  return viewFailed(message + ' is required')
}

const checkNull = (string) => {
  if (string === '' || string === null || string === undefined) {
    return null
  } else {
    return `'${string}'`
  }
}

const paramRequired = (paramName) => {
  return {
    success: true,
    message: paramName + ' is required',
    response: {
      status: 'failed',
    },
  }
}

const checkMessageDelete = (str) => {
  return str.includes('REFERENCE constraint')
}

const geneNewId = async (chrIdx, id) => {
  // console.log('id:', id)
  let new_id // Format PO23020001, J23020001
  const y = new Date().getFullYear().toString()
  const m = (new Date().getMonth() + 1).toString()
  const strYear = y.slice(2, 4)
  const strMonth = ('0' + m).slice(m.length - 1)

  // compare year
  if (id === null) {
    new_id = chrIdx + strYear + strMonth + '0001'
  } else {
    if (id.slice(chrIdx.length, id.length - 6) !== y.slice(2, 4)) {
      new_id = chrIdx + strYear + strMonth + '0001'
    } else {
      // compare month
      if (id.slice(chrIdx.length + 2, id.length - 4) !== strMonth) {
        new_id = chrIdx + strYear + strMonth + '0001'
      } else {
        new_id = (parseInt(id.slice(id.length - 4, id.length)) + 1).toString()
        new_id = id.slice(0, id.length - 4) + ('0000' + new_id).slice(new_id.length)
      }
    }
  }

  return new_id
}

// แยก array to string data
const arraySpread = async (data) => {
  const arrayLength = data.length
  let str = ''
  for (let i = 0; i < arrayLength; i++) {
    str = str + "'" + data[i] + "'"
    if (i + 1 < arrayLength) {
      str = str + ', '
    }
  }

  return str
}

module.exports = {
  view,
  viewFailed,
  viewParamRequest,
  checkNull,
  paramRequired,
  checkMessageDelete,
  geneNewId,
  arraySpread,
}
