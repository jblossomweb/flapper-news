var Post = require('mongoose').model('Post')

// export module
module.exports = function(req, res, next, id) {
  Post.findById(id).exec(function (err, post){
    if (err) { return next(err) }
    if (!post) { return next(new Error('can\'t find post')) }
    req.post = post
    return next()
  })
}
