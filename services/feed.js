var request = require('request')
var parser = require('feedparser')

var apiBase = "http://localhost:3000/api/" // TODO: get from config
var Service = {}

Service.ingest = function ingest(feedUrl, callback) {
  console.log(feedUrl)
  var req = request(feedUrl)
  var parse = new parser()
  req.on('error', callback)
  parse.on('error', callback)
  req.on('response', function (res) {
    var stream = this
    if (res.statusCode > 400) {
      var error = new Error('Feed returned bad status code')
      error.status = res.statusCode
      callback(error)
    }
    stream.pipe(parse)
  })
  parse.on('readable', function() {
    var stream = this
    var item
    while (item = stream.read()) {
      console.log(item.title)
      var post = request({
        url: apiBase + 'posts',
        method: 'POST',
        json: {
          link: item.link,
          title: item.title.substring(0,70), //TODO: de-escape escaped html (70)
          teaser: item.description ? item.description.substring(0,140) : item.title.substring(0,60), // (140)
          desc: item.description || item.title
        }
      })
      post.on('error', callback)
      post.on('response', function(res) {
        // callback(null, res)
      })
    }
  })
}

// export module
module.exports = Service