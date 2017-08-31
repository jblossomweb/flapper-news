var url = require('url')

// export module
module.exports = function(req, res, next, id) {
  try {
    req.link = url.parse(id)
    return next()
  } catch (error) {
    return next(error)
  }
}
