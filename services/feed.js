var request = require('request')
var parser = require('feedparser')
var entities = require('entities')
var config = require('../config')

var apiBase = config.api.base
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
      postItem(item, function(err, result){
        // do nothing.
        if(err) {
          console.log(err)
        } else {
          console.log('posted '+result.title)
        }
      })
    }
  })
}

// export module
module.exports = Service


var postItem = function postItem(item, callback) {
  request(apiBase + 'lookup/'+ encodeURIComponent(item.link), function(error, response, body) {
    if(!error && response.statusCode < 400) {

      var lookup = JSON.parse(body)

      if(!lookup.wasPosted) {
        var post = request({
          url: apiBase + 'posts',
          method: 'POST',
          json: {
            link: item.link,
            title: entities.decodeXML(item.title).substring(0,70),
            teaser: item.description ? entities.decodeXML(item.description).substring(0,140) : item.title.substring(0,140),
            desc: item.description ? entities.decodeXML(item.description) : entities.decodeXML(item.title),
            created: item.pubDate ? new Date(item.pubDate) : new Date()
          }
        })
        post.on('error', callback)
        post.on('response', function(res) {
          callback(null, item)
        })
      } else {
        var error = new Error('Link was already posted. Automated feed injest does not allow dupes.')
        error.status = response.statusCode
        callback(error)
      }

      
    } else if(!error) {
      var error = new Error('Link lookup returned bad status code')
      error.status = response.statusCode
      callback(error)
    } else {
      callback(error)
    }
  })
}