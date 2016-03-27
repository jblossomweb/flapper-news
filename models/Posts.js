var mongoose = require('mongoose')
var slugify = require('slugify')
var url = require('url')
var cheerio = require('cheerio')
var qs = require('querystring')
var ws = require('webshot')
var pt = require('stream').PassThrough
var fv = require('favicon')

var config = require("../config")
var Exts = require("../tools/extensions")
var Vimeo = require("../services/vimeo")
var Scraper = require("../services/scraper")

var File = require("../services/filesys")

if(config.aws.use_aws_s3) {
    File = require("../services/aws")
}

var screenshots = config.paths.screenshots
var favicons = config.paths.favicons

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
                    source(self)
                    screenshot(self, screenshots + self._id + '.jpg', function(err, imgExt){
                        if(!err && imgExt) {
                            var imgFile = self._id + '.' + imgExt
                            self.image = imgFile
                            // TODO: emit socket event
                            console.log(imgFile + ' was created')
                            self.save()
                        }

                        // next do this. (not in parallel to prevent save() overwrite)
                        favicon(self,  favicons + self._id + '.ico', function(err, icoExt){
                            if(!err && icoExt) {
                                var iconFile = self._id + '.' + icoExt
                                self.icon = iconFile
                                // TODO: emit socket event
                                console.log(iconFile + ' was created')
                                self.save()
                            }
                        })
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
        if(!err && favicon_url && favicon_url.length) {
            File.pipe(favicon_url, path, callback)
        } else {
            scrapeIcon(post, path, callback)
            // var favicon_url = link.protocol + "//" + link.host + "/favicon.ico"
            // File.pipe(favicon_url, path, function(err, ext){
            //     if(err) {
            //         scrapeIcon(post, path, callback)
            //     } else {
            //         callback(null, ext)
            //     }
            // })
        }
    })
}

function source(post) {
    var link = url.parse(post.link)
    switch(link.host) {
        case 'www.youtube.com':
        case 'youtube.com':
        case 'youtu.be':
            post.source = "youtube"
            break;
        case 'www.vimeo.com':
        case 'vimeo.com':
            post.source = "vimeo"
            break;
        default:
            post.source = "web"
    }
}

function screenshot(post, path, callback) {
    var link = url.parse(post.link)
    if(!post.source) {
        source(post)
    }
    if(Exts.isImage(link.pathname)) {
        imgShot(post, path, callback)
    } else {
        switch(post.source) {
            case 'youtube': youtubeShot(post, path, callback)
            break;
            case 'vimeo': vimeoShot(post, path, callback)
            break;
            default: scrapeShot(post, path, callback)
        }
    } 
}

function imgShot(post, path, callback) {
    File.pipe(post.link, path, callback)
}

function webshot(post, path, callback) {
    var pass = new pt()
    var ext = Exts.getFileExtension(path)
    var shot = ws(post.link, {streamType: ext})
    shot.pipe(pass)
    File.save(pass, path, callback)
}

function scrapeShot(post, path, callback) {
    var Url = url.parse(post.link)
    Scraper.getInfo(post.link, function(error, result){
        if(!error && result) {
           var image = result.image
            if(image && Exts.isImage(image)) {
                File.pipe(image, path, callback)
            } else {
                webshot(post, path, callback)
            }
        } else {
            webshot(post, path, callback)
        }
    })
}

function scrapeIcon(post, path, callback) {
    var Url = url.parse(post.link)
    Scraper.getInfo(post.link, function(error, result){
        if(!error && result) {
           var icon = result.icon
            if(icon && (Exts.isImage(icon) || Exts.isIco(icon))) {
                File.pipe(icon, path, callback)
            } else {
                callback(error || new Error('scraper could not find icon'))
            }
        } else {
            callback(error || new Error('could not scrape icon'))
        }
    })
}

function youtubeShot(post, path, callback) {
    var link = url.parse(post.link)
    if(Exts.isImage(link.pathname)) {
        imgShot(post, path, callback)
    } else {
        if(link.host === 'youtu.be') {
            post.externalId = link.path.replace("/","")
        } else {
            var params = link.query ? qs.parse(link.query) : {}
            if(params.v) {
                post.externalId = params.v
            }
        }
        if(post.externalId) {
            post.source = "youtube"
            var thumbUrl = "http://img.youtube.com/vi/" + post.externalId + "/0.jpg"
            File.pipe(thumbUrl, path, callback)
        } else {
            post.source = "web"
            scrapeShot(post.link, path, callback)
        }
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
                if(thumbUrl && Exts.isImage(thumbUrl)){
                    File.pipe(thumbUrl, path, callback)
                } else {
                    // not a valid image
                    scrapeShot(post, path, callback)
                }
            } else {
                scrapeShot(post, path, callback)
            }
        })
    }else{
        post.source = "web"
        scrapeShot(post, path, callback)
    }
}