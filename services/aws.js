var AWS = require('aws-sdk')
var config = require("../config")
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
    var ext = key.substr(key.lastIndexOf('.') + 1)
    var contentType = getMimeType(ext)
    console.log(contentType)
    s3.upload({Bucket: Service.bucket, Key: key, Body: stream, ACL: "public-read", ContentType: contentType }, function(err, data) {
      if(err) {
        console.log("========> ERROR")
        console.log(err.message)
      }
      callback(err)
    })
}

// export module
module.exports = Service

function getMimeType(ext) {
  switch(ext) {
      case 'ico':
        return 'image/x-icon'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'gif':
        return 'image/gif'
      break;
      case 'png':
        return 'image/png'
      break;
      case 'txt':
        return 'text/plain'
      break;
      default:
        return 'application/octet-stream'
    }
}