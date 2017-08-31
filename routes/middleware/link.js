var url = require('url')

// export module
module.exports = function(req, res, next, link) {
  try {
    req.link = url.parse(link)
    return next()
  } catch (error) {
    return next(error)
  }
}
