var express = require('express')
var router = express.Router()

router.get('/:view', function(req, res, next) {
  var view = req.params.view
  res.render(view)
})

router.get('/modals/:view', function(req, res, next) {
  var view = req.params.view
  res.render('modals/'+view)
})

router.get('/directives/:view', function(req, res, next) {
  var view = req.params.view
  res.render('directives/'+view)
})

module.exports = router