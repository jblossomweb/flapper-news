var express = require('express')
var mongoose = require('mongoose')
var path = require('path')
var favicon = require('serve-favicon')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')

var config = require('./config')

require('./models/Posts')
require('./models/Comments')

var routes = require('./routes/index')
var views = require('./routes/views')
var api = require('./routes/api')

var app = express()

// connect to database
mongoose.connect(config.mongo.connection)

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', routes)
app.use('/libs', express.static('bower_components'))
app.use('/views', views)
app.use('/api', api)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500)
    res.json(err)
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500)
  res.json({
    message: err.message,
    name: err.name,
    errors: err.errors || null
  })
})


module.exports = app
