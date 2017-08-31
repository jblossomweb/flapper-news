var Comment = require('mongoose').model('Comment')

// export module
module.exports = function(req, res, next, id) {
  Comment.findById(id).exec(function (err, comment){
    if (err) { return next(err) }
    if (!comment) { return next(new Error('can\'t find comment')) }
    req.comment = comment
    return next()
  })
}
