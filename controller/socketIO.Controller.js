let io
let resendList = []
let resendPIOver3Day = []

const socketConnection = (server) => {
  console.log('SOCKET IO START')
  io = require('socket.io')(server, {
    allowEIO3: true,
    cors: {
      origin: '*',
      credentials: true,
      transports: ['websocket'],
      methods: ['GET', 'POST'],
    },
  })
  io.on('connect', (socket) => {
    console.log(`Client connected [id=${socket.id}] user = ${socket.request._query.user_id}`)

    socket.on('check-pi', () => {
      resendList.forEach((item) => {
        if (item.user_id === socket.request._query.user_id) {
          console.log('find data')
          socket.emit('alert-pi', item.data)
        }
      })
      resendList = resendList.filter((item) => item.user_id !== socket.request._query.user_id)
    })

    // socket.on('check-piover', () => {
    //   resendPIOver3Day.forEach((item) => {
    //     if (item.user_id === socket.request._query.user_id) {
    //       socket.emit('alert_overpi', item.data)
    //     }
    //   })
    //   resendPIOver3Day = resendPIOver3Day.filter((item) => item.user_id !== socket.request._query.user_id)
    // })

    socket.join(socket.request._query.id)
    socket.on('disconnect', () => {
      console.log(`Client disconnected [id=${socket.id}]`)
    })
  })
}
function sendErrorIO(error) {
  io.sockets.emit('realtime-error', { message: error })
}

function sendLogIO(log) {
  io.sockets.emit('realtime-log', { message: log })
}

function checkHasLogin(user_id) {
  let check = false
  io.sockets.sockets.forEach((key, val, map) => {
    // console.log('sss', key)
    if (key.handshake.query.user_id === user_id) {
      key.emit('someone-login')
      check = true
    }
  })
  return check
}
function forceDisconnect(user_id) {
  io.sockets.sockets.forEach((key, val, map) => {
    if (key.handshake.query.user_id === user_id) {
      key.disconnect(true)
    }
  })
}

function sendAlertPI(
  to_user_id,
  data = { type: 'CONFIRM', pi_id: '', from: '', time: '', message: '' },
) {

  let ids = to_user_id
  if (!Array.isArray(ids)) {
    ids = [ids]
  }
  console.log(ids)
  let checkTemp = []
  ids.forEach(id => {
    io.sockets.sockets.forEach((key, val, map) => {
      if (id === key.handshake.query.user_id) {
        key.emit('alert-pi', data)
        checkTemp.push(id)
      } else {
        if (!checkTemp.includes(id)) {
          resendList.push({
            user_id: id,
            data: data,
          })
          checkTemp.push(id)
        }
      }
    })
  })
}

function warningPIOver3Day(
  to_user_id,
  data = [{ pi_id: '', over_day: 0 }],
) {
  let ids = to_user_id
  if (!Array.isArray(ids)) {
    ids = [ids]
  }

  let checkTemp = []
  ids.forEach(id => {
     io.sockets.sockets.forEach((key, val, map) => {
        if (id === key.handshake.query.user_id) {
           key.emit('alert_overpi', data)
          //  checkTemp.push(id)
        } else {
          if (!checkTemp.includes(id)) {
            resendPIOver3Day.push({
              user_id: id,
              data: data,
            })
            checkTemp.push(id)
          }
        }
     })
  })
}

module.exports = {
  socketConnection,
  checkHasLogin,
  forceDisconnect,
  sendErrorIO,
  sendLogIO,
  sendAlertPI,
  resendList,
  warningPIOver3Day
}
