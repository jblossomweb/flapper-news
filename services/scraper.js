var cheerio = require('cheerio')
var url = require('url')
var http = require('follow-redirects').http
var https = require('follow-redirects').https
var methods = {
    "http:": http,
    "https:": https
}

var Exts = require("../tools/extensions")
var Service = {}

Service.scrape = function (link, callback) {
	var Url = url.parse(link)
    methods[Url.protocol].get(link, function onResponse(response) {
        if (response.statusCode >= 400) {
            var error = new Error('error ' + response.statusCode + ' retrieving ' + link)
            error.status = response.statusCode
            return callback(error)
        }
        var body = ''
        response.on("data", function(chunk){
            body += chunk
        })
        response.on("end", function(){
            var obj = cheerio.load(body)
            if(!obj) {
                var error = new Error('error ' + response.statusCode + ' could not scrape ' + link)
                error.status = response.statusCode
            	return callback(error)
            } else {
            	return callback(null, obj)
            }
        })
    }).on('error', function onError(err) {
        return callback(err)
    })
}

Service.getInfo = function (link, callback) {
    var Url = url.parse(link)
    var info = {
        link: link
    }
    if(Exts.isImage(link) || Exts.isIco(link)) {
        info.image = link
        callback(null, info)
    } else {
        Service.scrape(link, function(error, result) {
          if(error){
            return callback(error)
          }
          if(!result){ return callback(new Error('no result from scrape')) }
          if(!error && result) {
            var $ = result

            $.metaTag = function (tag) {
                var el = $('meta[property="'+tag+'"]')
                if(!el.length) {
                    el = $('meta[name="'+tag+'"]')
                }
                if(!el.length) {
                    el = $('meta[itemprop="'+tag+'"]')
                }
                if(!el.length) {
                    el = $('meta[http-equiv="'+tag+'"]')
                }
                if(el.length && el.attr('content') && el.attr('content').length) {
                    return el.attr('content')
                } else {
                    return false
                }
            }

            // type
            if($.metaTag('og:type')) {
                info.type = $.metaTag('og:type')
            }

            // site
            if($.metaTag('og:site_name')) {
                info.site = $.metaTag('og:site_name')
            }

            // title
            if($.metaTag('og:title')) {
                info.title = $.metaTag('og:title')
            }

            // teaser
            if($.metaTag('og:description')) {
                info.teaser = $.metaTag('og:description')
            }

            // description
            if($.metaTag('og:description')) {
                info.desc = $.metaTag('og:description')
            }

            // image
            if($.metaTag('og:image')) {
                info.image = $.metaTag('og:image')
                if($.metaTag('og:image:width') && $.metaTag('og:image:height')) {
                    info.imageWidth = $.metaTag('og:image:width')
                    info.imageHeight = $.metaTag('og:image:height')
                    if(Number(info.imageWidth) < 600 && info.image.indexOf('/'+info.imageWidth+'/') > -1) {
                        // obscure hack
                        info.image = info.image.replace('/'+info.imageWidth+'/', '/0/')
                        delete info.imageWidth
                        delete info.imageHeight
                    }
                }
            }

            // embed
            if($.metaTag('og:video')) {
                info.embed = $.metaTag('og:video')
            } else if ($.metaTag('og:video:url')) {
                info.embed = $.metaTag('og:video:url')
            }

            if ($.metaTag('og:video:width')) {
                info.embedWidth = $.metaTag('og:video:width')
            }

            if ($.metaTag('og:video:height')) {
                info.embedHeight = $.metaTag('og:video:height')
            }

            // defaults / twitter

            if(!info.type || !info.type.length) {
                if($.metaTag('twitter:card') && $.metaTag('twitter:card') === 'player') {
                    info.type = 'video'
                } else {
                    info.type = 'web'
                }
            }

            if(!info.title || !info.title.length) {
                if($('title').length) {
                    info.title = $('title').text()
                } else {
                    info.title = ""
                }
            }

            if(!info.teaser || !info.teaser.length) {
                if($.metaTag('description')) {
                    info.teaser = $.metaTag('description')
                } else if($.metaTag('DESCRIPTION')) {
                    info.teaser = $.metaTag('DESCRIPTION')
                }
            }

            if(!info.desc || !info.desc.length) {
                if($.metaTag('description')) {
                    info.desc = $.metaTag('description')
                } else if($.metaTag('DESCRIPTION')) {
                    info.desc = $.metaTag('DESCRIPTION')
                }
            }

            if(!info.image || !info.image.length) {
                if($.metaTag('twitter:image')) {
                    info.image = $.metaTag('twitter:image')
                } else if($.metaTag('twitter:image:src')) {
                    info.image = $.metaTag('twitter:image:src')
                }
            }

            if(!info.embed || !info.embed.length) {
                if($.metaTag('twitter:player')) {
                    // set all 3 at once in case there is ever a mismatch
                    info.embed = $.metaTag('twitter:player')
                    delete info.embedWidth
                    delete info.embedHeight
                    if($.metaTag('twitter:player:width') && $.metaTag('twitter:player:height')) {
                        info.embedWidth = $.metaTag('twitter:player:width')
                        info.embedHeight = $.metaTag('twitter:player:height')
                    }
                }
            }

            if($.metaTag('twitter:site')) {
                info.twitter = $.metaTag('twitter:site')
            }

            if($('link[rel="shortcut icon"]').length) {
                info.icon = $('link[rel="shortcut icon"]').attr('href')
            } else if($('link[rel="SHORTCUT ICON"]').length) { 
                // neulion thinks its 1996
                info.icon = $('link[rel="SHORTCUT ICON"]').attr('href')
            }

            // make sure not a relative path.
            if(info.image) {
                info.image = prependRelativePath(link, info.image)
            }
            if(info.icon) {
                info.icon = prependRelativePath(link, info.icon)
            }
            if(info.embed) {
                info.embed = prependRelativePath(link, info.image)
            }

            // image: check Content-Type
            if(info.image) {
                return Service.checkType(info.image, function(error, type) {
                    if(!error && type && type.indexOf('image') !== -1) {
                        // image is valid. ok
                        info.imageType = type
                    } else if (!error) {
                        // not an image
                        delete info.image
                    } else {
                        // error eg 404
                        delete info.image
                    }
                    return callback(null, info)
                })
            } else {
                return callback(null, info)
            }

            
          }
        })
    }
}


Service.checkStatus = function (link, callback) {
    var Url = url.parse(link)
    methods[Url.protocol].get(link, function onResponse(response) {
        callback(null, response.statusCode)
    })
}

Service.checkType = function (link, callback) {
    var Url = url.parse(link)
    methods[Url.protocol].get(link, function onResponse(response) {
        if(response && response.headers && response.headers['content-type']) {
            callback(null, response.headers['content-type'])
        } else {
            var error = new Error('could not get Content-Type for '+link)
            error.status = response.statusCode
            callback(error)
        }
    })
}

// export module
module.exports = Service

prependRelativePath = function (link, path) {
    var Url = url.parse(link)
    if(path && path.indexOf('http') !== 0) {
        if(path.charAt(0) === '/') {
            path = Url.protocol + '//' + Url.host + path
        } else {
            path = Url.protocol + '//' + Url.host + '/' + path
        }
    }
    return path
}