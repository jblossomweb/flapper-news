var cheerio = require('cheerio')
var url = require('url')
var http = require('http')
var https = require('https')
var methods = {
    "http:": http,
    "https:": https
}

var Service = {}

Service.scrape = function (link, callback) {
	var Url = url.parse(link)
    methods[Url.protocol].get(link, function onResponse(response) {
        if (response.statusCode >= 300) {
            return callback(new Error('error ' + response.statusCode + ' retrieving ' + link))
        }
        var body = ''
        response.on("data", function(chunk){
            body += chunk
        })
        response.on("end", function(){
            var obj = cheerio.load(body)
            if(!obj) {
            	return callback(new Error('error ' + response.statusCode + ' could not scrape ' + link))
            } else {
            	return callback(null, obj)
            }
        })
    }).on('error', function onError(err) {
        return callback(err)
    })
}

// export module
module.exports = Service