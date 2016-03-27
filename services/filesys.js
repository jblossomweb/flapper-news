var config = require("../config")
var fs = require('fs')
var URL = require('url')
var http = require('http')
var https = require('https')
var methods = {
    "http:": http,
    "https:": https
}

var Exts = require("../tools/extensions")
var Service = {}

Service.pipe = function pipe(url, path, callback) {
    var Url = URL.parse(url)
    methods[Url.protocol].get(url, function onResponse(response) {
        if (response.statusCode >= 300) {
            return callback(new Error('error ' + response.statusCode + ' retrieving ' + url))
        }
        Service.save(response, path, callback)
    })
    .on('error', function onError(err) {
        return callback(err)
    })
}

Service.save = function save(stream, path, callback) {
    console.log("========> file.save() "+path)
    var ext = Exts.getFileExtension(path)
    var file = fs.createWriteStream(path)
    stream.pipe(file)
    return callback(null, ext)
}

// export module
module.exports = Service