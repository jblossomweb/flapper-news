var mongoose = require('mongoose')
var slugify = require('slugify')
var http = require('http')
var https = require('https')
var url = require('url')
var qs = require('querystring')
var ws = require('webshot')
var pt = require('stream').PassThrough
var fv = require('favicon')

var config = require("../config")
var Vimeo = require("../services/vimeo")

var File = require("../services/filesys")

if(config.aws.use_aws_s3) {
    File = require("../services/aws")
}

var screenshots = 'public/img/screenshots/' //TODO: get from config
var favicons = 'public/img/favicons/' //TODO: get from config
var methods = {
    "http:": http,
    "https:": https
}

var PostSchema = new mongoose.Schema({
    _id: String,
  title: String,
  link: String,
  teaser: String,
  desc: String,
  source: String,
  externalId: String,
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
                // console.log(err)
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
            webshot(post.link, path, callback)
    }
}

function webshot(link, path, callback) {
    var pass = new pt()
    var shot = ws(link, {streamType: 'jpg'})
    shot.pipe(pass)
    File.save(pass, path, callback)
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
        var thumbUrl = url.parse("http://img.youtube.com/vi/" + post.externalId + "/0.jpg")

        // TODO: make sure path matches jpg

        File.pipe(thumbUrl, path, callback)
    } else {
        webshot(post.link, path, callback)
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

                // TODO: get thumbUrl file extension, make sure path matches

                File.pipe(thumbUrl, path, callback)
            } else {
                // console.log("could not talk to vimeo")
                post.source = "web"
                webshot(post.link, path, callback)
            }
        })
    }else{
        // console.log("not a vimeo url")
        post.source = "web"
        webshot(post.link, path, callback)
    }
}