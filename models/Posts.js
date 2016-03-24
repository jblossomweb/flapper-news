var mongoose = require('mongoose')
var slugify = require('slugify')
var url = require('url')
var cheerio = require('cheerio')
var qs = require('querystring')
var ws = require('webshot')
var pt = require('stream').PassThrough
var fv = require('favicon')

var config = require("../config")
var Vimeo = require("../services/vimeo")
var Scraper = require("../services/scraper")

var File = require("../services/filesys")

if(config.aws.use_aws_s3) {
    File = require("../services/aws")
}

var screenshots = 'public/img/screenshots/' //TODO: get from config
var favicons = 'public/img/favicons/' //TODO: get from config

var PostSchema = new mongoose.Schema({
    _id: String,
  title: { type: String, maxlength: 70, required: true },
  link: { type: String, required: true },
  teaser: { type: String, maxlength: 140 },
  desc: String,
  source: String,
  externalId: String,
  videoPlayer: String,
  videoWidth: Number,
  videoHeight: Number,
  image: String,
  created: Date,
  updated: Date,
  upvotes: {type: Number, default: 0},
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
},{ _id : false })

PostSchema.pre('save', function(next) {
    var self = this
    if(self._id) {
        self.updated = new Date()
        next()
    } else {
        self.created = new Date()
        self.updated = new Date()
        var slugSet = function(slug, n) {
            slug = slug.toLowerCase()
            var findId = slug
            if(n) {
                findId = slug + '-' + n
            } else {
                var n = 0
            }
            self.constructor.findOne({ "_id": findId }, function(err, doc){
                if(doc) {
                    n++
                    slugSet(slug, n)
                } else {
                    self._id = findId

                    screenshot(self, screenshots + self._id + '.jpg', function(err){
                        // console.log(self._id + '.jpg was created')
                    })

                    favicon(self,  favicons + self._id + '.ico', function(){
                        // console.log(self._id + '.ico was created')
                    })
                    // don't wait
                    next()
                }
            })
        }
        slugSet(slugify(self.title))
    }
})

PostSchema.methods.upvote = function(done) {
  this.upvotes++
  this.save(done)
}

mongoose.model('Post', PostSchema)

// privates

function favicon(post, path, callback) {
    var link = url.parse(post.link)
    fv(link, function(err, favicon_url) {
        if(!favicon_url) {
            var favicon_url = link.protocol + "//" + link.host + "/favicon.ico"
        }
        File.pipe(favicon_url, path, function(err){
            if(err) {
                // TODO: something here
            }
            callback()
        })
    })
}

function screenshot(post, path, callback) {
    var link = url.parse(post.link)
    switch(link.host) {
        case 'www.youtube.com':
        case 'youtube.com':
        case 'youtu.be':
            post.source = "youtube"
            youtubeShot(post, path, callback)
            break;
        case 'www.vimeo.com':
        case 'vimeo.com':
            post.source = "vimeo"
            vimeoShot(post, path, callback)
            break;
        default:
            post.source = "web"
            if(isJpeg(link.pathname)) {
                imgShot(post, path, callback)
            } else {
                scrapeShot(post, path, callback)
            }
    }
    
}

function imgShot(post, path, callback) {
    File.pipe(post.link, path, callback)
}

function webshot(post, path, callback) {
    var pass = new pt()
    var shot = ws(post.link, {streamType: 'jpg'})
    shot.pipe(pass)
    File.save(pass, path, callback)
}

function scrapeShot(post, path, callback) {
    var Url = url.parse(post.link)
    Scraper.scrape(post.link, function(error, result){
        if(!error && result) {
            var $ = result
            var ogImage = $('meta[property="og:image"]').attr('content')
            var twitterImage = $('meta[property="twitter:image"]').attr('content')
            var twitterImageSrc = $('meta[property="twitter:image:src"]').attr('content')
            if(ogImage && isJpeg(ogImage)) {
                File.pipe(ogImage, path, callback)
            } else if(twitterImage && isJpeg(twitterImage)) {
                File.pipe(twitterImage, path, callback)
            } else if(twitterImageSrc && isJpeg(twitterImageSrc)) {
                File.pipe(twitterImage, path, callback)
            } else {
                webshot(post, path, callback)
            }
        } else {
            webshot(post, path, callback)
        }
    })
}

// not yet used
function scrapePlayer(post, callback) {
    var link = post.link
    var Url = url.parse(link)
    Scraper.scrape(link, function(error, result){
        if(!error && result) {
            var $ = result
            var twPlayer = $('meta[property="twitter:player"]').attr('content')
            var ogPlayer = $('meta[property="og:video"]').attr('content')
            var ogWidth = $('meta[property="og:video:width"]').attr('content')
            var ogHeight = $('meta[property="og:video:height"]').attr('content')
            if(twPlayer) {
                post.videoPlayer = twPlayer
                if(post.source === 'web') {
                    post.source = 'web-video'
                }
                callback(null, post.videoPlayer)
            } else if(ogPlayer) {
                post.videoPlayer = ogPlayer
                if(ogWidth && ogHeight) {
                    post.videoWidth = Number(ogWidth)
                    post.videoHeight = Number(ogHeight)
                }
                if(post.source === 'web') {
                    post.source = 'web-video'
                }
                callback(null, post)
            } else {
                callback(new Error("scrapePlayer could not parse a video embed url: "+link))
            }
        } else {
            callback(error || new Error("scrapePlayer could not scrape: "+link))
        }
    })
}

function youtubeShot(post, path, callback) {
    var link = url.parse(post.link)
    if(link.host === 'youtu.be') {
        post.externalId = link.path.replace("/","")
    } else {
        var params = link.query ? qs.parse(link.query) : {}
        if(params.v) {
            post.externalId = params.v
        }
    }
    if(post.externalId) {
        var thumbUrl = "http://img.youtube.com/vi/" + post.externalId + "/0.jpg"
        File.pipe(thumbUrl, path, callback)
    } else {
        post.source = "web"
        scrapeShot(post.link, path, callback)
    }
}

function vimeoShot(post, path, callback) {
    var link = url.parse(post.link)
    var regExp = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/
    var match = link.href.match(regExp)
    if (match){
        post.externalId = match[5]
        Vimeo.getById(post.externalId, function(err, video) {
            if(video && !err) {
                var thumbUrl = video.thumbnail_small.replace("100x75","800x600")
                if(thumbUrl && isJpeg(thumbUrl)){
                    File.pipe(thumbUrl, path, callback)
                } else {
                    // not a jpeg
                    scrapeShot(post, path, callback)
                }
            } else {
                // console.log("could not talk to vimeo")
                scrapeShot(post, path, callback)
            }
        })
    }else{
        // console.log("not a vimeo url")
        post.source = "web"
        scrapeShot(post, path, callback)
    }
}

function getFileExtension(string) {
    return string.substr(string.lastIndexOf('.') + 1).split(/[?#]/)[0]

}

function isJpeg(string) {
    return getFileExtension(string) === 'jpg' || getFileExtension(string) === 'jpeg'
}