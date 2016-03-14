var express = require('express')
var router = express.Router()

router.get('/home', function(req, res, next) {
  res.render('home')
})

router.get('/posts', function(req, res, next) {
  res.render('posts')
})

module.exports = router