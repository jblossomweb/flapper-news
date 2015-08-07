var fs = require('fs')
var env = require('node-env-file')

if (fs.existsSync('.env')) {
  env('.env')
}

module.exports = {
	mongo: {
    connection: process.env.MONGO_CONNECTION || 'mongodb://localhost/flapper-news'
  }
}