require('dotenv').config()
const path = require('path')
let redisConfig = {}

const {
    MYSQL_SERVER,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
    TEST_MYSQL_SERVER,
    TEST_MYSQL_USER,
    TEST_MYSQL_PASSWORD,
    TEST_MYSQL_DATABASE,
    SERVER_PORT,
} = process.env

const dbConfig =
    process.env.NODE_ENV === 'production'
        ? {
              host: MYSQL_SERVER,
              user: MYSQL_USER,
              password: MYSQL_PASSWORD,
              database: MYSQL_DATABASE,
              port: 3306,
              // Connection pool settings
              connectionLimit: 10,
              acquireTimeout: 60000,
              timeout: 60000,
              reconnect: true,
              // Performance optimizations
              charset: 'utf8mb4',
              timezone: 'local',
              dateStrings: false,
              // Security settings
              ssl: false,
              // Additional MySQL specific options
              multipleStatements: false,
              supportBigNumbers: true,
              bigNumberStrings: true,
          }
        : {
              host: TEST_MYSQL_SERVER,
              user: TEST_MYSQL_USER,
              password: TEST_MYSQL_PASSWORD,
              database: TEST_MYSQL_DATABASE,
              port: 3306,
              // Connection pool settings
              connectionLimit: 5,
              acquireTimeout: 60000,
              timeout: 60000,
              reconnect: true,
              // Performance optimizations
              charset: 'utf8mb4',
              timezone: 'local',
              dateStrings: false,
              // Security settings
              ssl: false,
              // Additional MySQL specific options
              multipleStatements: false,
              supportBigNumbers: true,
              bigNumberStrings: true,
          }

let PORT = SERVER_PORT
const PROGRAM_NAME = 'Fixtrack'

const DATE_FORMAT = {
    SQL_DATE: 'YYYY-MM-DD',
    SQL_DATE_TIME: 'YYYY-MM-DD HH:mm:ss',
    DISPLAY: 'DD/MM/YYYY',
    DISPLAY_DATE_TIME: 'DD/MM/YYYY HH:mm:ss',
    DISPLAY_DATE_TIME_MINUTE: 'DD/MM/YYYY HH:mm',
}
const NUM_FORMAT = {
    D0: '0,0',
    D1: '0,0.0',
    D2: '0,0.00',
    D3: '0,0.000',
    D4: '0,0.0000',
}

let STORE_FILES = path.join(__dirname, './files/')
let STORE_FILES_PDF = path.join(__dirname, './files/')
let STORE_IMAGE_FILES = path.join(__dirname, './image_files/')

if (process.env.NODE_ENV === 'production') {
    STORE_FILES = path.join(
        __dirname,
        // "../../../home/share_windows/app-files/oee/"
        '../../../home/share_windows/server57data1/oee/',
    )
    STORE_IMAGE_FILES = path.join(__dirname, '../../../home/share_windows/server32ser-picture/')
    STORE_FILES_PDF = path.join(
        __dirname,
        // "../../../home/share_windows/app-files/oee/"
        '../../../home/share_windows/server57data1/oee/',
    )
}

const os = process.env.NODE_ENV === 'production' ? 'linux' : 'windows'
switch (os) {
    case 'windows':
        pathDBF = '//10.32.0.17/data2/account/gsf/'
        // pathDBF = '//10.32.0.47/data2/account/gsf/'
        break

    case 'linux':
        pathDBF = '../../../home/share_windows/server17data2/account/gsf/' //สำหรับ Production
        // pathDBF = "../../../home/share_windows/server47data2/"; //สำหรับเทสเบอร์ 47
        break

    case 'mac':
        pathDBF = '../../../../../Volumes/DATA2/account/gsf/' //smb ไปที่ 47
        break
}

redisConfig = {
    port: 6379,
    host: process.env.NODE_ENV === 'production' ? 'redis' : 'localhost',
}

module.exports = {
    dbConfig,
    PORT,
    PROGRAM_NAME,
    STORE_FILES,
    redisConfig,
    DATE_FORMAT,
    NUM_FORMAT,
    STORE_FILES_PDF,
}
