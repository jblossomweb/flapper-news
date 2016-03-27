var AWS = require('aws-sdk')
var config = require("../config")
var Exts = require("../tools/extensions")
var s3 = new AWS.S3()

var URL = require('url')
var http = require('http')
var https = require('https')
var methods = {
    "http:": http,
    "https:": https
}

var Service = {}

Service.bucket = config.aws.s3_bucket

Service.pipe = function pipe(url, key, callback) {
    var Url = URL.parse(url)
    var ext = Exts.getFileExtension(url)
    var keyExt = Exts.getFileExtension(key)
    if(ext !== keyExt) {
      key = key.replace("."+keyExt, "."+ext) 
    }
    methods[Url.protocol].get(url, function onResponse(response) {
        if (response.statusCode >= 300) {
            return callback(new Error('error ' + response.statusCode + ' retrieving ' + url))
        }
        Service.save(response, key, callback)
    })
    .on('error', function onError(err) {
        return callback(err)
    })
}

Service.save = function save(stream, key, callback) {
    console.log("========> aws.save() "+key)
    var ext = Exts.getFileExtension(key)
    var contentType = Exts.getMimeType(ext)
    s3.upload({Bucket: Service.bucket, Key: key, Body: stream, ACL: "public-read", ContentType: contentType }, function(err, data) {
      if(err) {
        console.log("========> ERROR")
        console.log(err.message)
        return callback(err)
      } else {
        // send back the ext, in case it was changed
        return callback(null, ext)
      }
    })
}

// export module
module.exports = Service