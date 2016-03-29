var express = require('express')
var router = express.Router()

var mongoose = require('mongoose')
var _ = require('underscore')
var url = require('url')

// models
var Post = mongoose.model('Post')
var Comment = mongoose.model('Comment')

// service
var Scraper = require("../services/scraper")

// attach model to request param :post
router.param('post', function(req, res, next, id) {
  Post.findById(id).exec(function (err, post){
    if (err) { return next(err) }
    if (!post) { return next(new Error('can\'t find post')) }
    req.post = post
    return next()
  })
})

// attach model to request param :comment
router.param('comment', function(req, res, next, id) {
  Comment.findById(id).exec(function (err, comment){
    if (err) { return next(err) }
    if (!comment) { return next(new Error('can\'t find comment')) }
    req.comment = comment
    return next()
  })
})

// attach model to request param :url
router.param('link', function(req, res, next, id) {
  try {
    req.link = url.parse(id)
    return next()
  } catch (error) {
    return next(error)
  }
})

// soft check 404s for imgDefault directive to suppress browser console
router.get('/check/:link', function(req, res, next) {
  if(req.link && req.link.href) {
    Scraper.checkStatus(req.link.href, function(error, status) {
      var valid = false
      if(status < 400) {
        valid = true
      }
      res.json({ valid: valid, status: status })
    })
  } else {
    res.json({ valid: false })
  }
  
})


// GET /lookup/:link - return prepop data about any url
router.get('/lookup/:link', function(req, res, next) {

  if(req.link && req.link.href) {
    Scraper.getInfo(req.link.href, function(error, result) {
      if(error){
        return next(error)
      }
      if(!result){ 
        return next(new Error('scraper result was undefined')) 
      }
      if(!error && result) {
        Post.find({
          link: req.link.href
        }).sort({created: 1}).exec(function(err, posts){
          if(!err && posts && posts.length) {
            result.wasPosted = true
          } else {
            result.wasPosted = false
          }
          res.json(result)
        })
        
      }
    })
  } else {
    return next(new Error('requested url is invalid'))
  }
})

// GET /posts - return a list of posts and associated metadata
router.get('/posts', function(req, res, next) {
  var now = new Date()
  var filter = 'default'
  if(req.query && req.query.filter) {
    filter = req.query.filter
  }
  var query = {}
  query.created = { "$lte": now } // dont expose future posts
  var sort = {upvotes: -1, created: -1}
  var limit = 0
  // quick and easy predefined filters. 
  // if I need full api query params I will build it later.
  switch(filter) {
    case 'new':
      query.created["$gte"] = yesterday()
      sort = {created: -1}
      limit = 100
    break;
    case 'top':
      limit = 100
    break;
    case 'all':
      limit = 0
    break;
    case 'default':
    default:
      query.modified = {"$gte": yesterday() }
      limit = 100
  }

  Post.find(query).sort(sort).exec(function(err, posts){
    if(err){ return next(err) }
    res.json(normalizePosts(posts))
  })
})

// POST /posts - create a new post
router.post('/posts', function(req, res, next) {
  var post = new Post(req.body)
  post.save(function(err, post){
    if(err){ return next(err) }
    res.json(normalizePost(post))
  })
})

// GET /posts/:id - return an individual post with associated comments
router.get('/posts/:post', function(req, res) {
	req.post.populate('comments', function(err, post) {
    if(err) { return next(err) }
		res.json(normalizePost(post))
	})
})

// PUT /posts/:id/upvote - upvote a post
router.put('/posts/:post/upvote', function(req, res, next) {
  req.post.upvote(function(err, post){
    if (err) { return next(err) }
    res.json(normalizePost(post))
  })
})

// POST /posts/:id/comments - add a new comment to a post
router.post('/posts/:post/comments', function(req, res, next) {
  var comment = new Comment(req.body)
  comment.post = req.post._id
  comment.save(function(err, comment){
    if(err){
      return next(err) 
    }
  	// redundancy / de-normalization
    req.post.comments.push(comment)
    req.post.save(function(err, post) {
      if(err){ return next(err) }
      res.json(normalizeComment(comment))
    })
  })
})

// PUT /posts/:id/comments/:id/upvote - upvote a comment
router.put('/posts/:post/comments/:comment/upvote', function(req, res, next) {
  req.comment.upvote(function(err, comment){
    if (err) { return next(err) }
    res.json(normalizeComment(comment))
  })
})

module.exports = router


normalizePost = function normalizePost(post){
	post = _.pick(
    post, 
    '_id', 
    'title', 
    'link', 
    'teaser', 
    'desc', 
    'comments', 
    'upvotes', 
    'created', 
    'source', 
    'externalId',
    'image',
    'icon'
  )
	post = _.extendOwn({id: post._id}, post)
	delete post._id
	if(post.comments) post.comments = normalizeComments(post.comments)
	return post
}

normalizePosts = function normalizePosts(posts){
	return _.map(posts, normalizePost)
}

normalizeComment = function normalizeComment(comment){
	comment = _.pick(comment, '_id', 'post', 'author', 'body', 'upvotes', 'created')
	comment = _.extendOwn({id: comment._id}, comment)
	delete comment._id
	if(comment.post) comment.post = comment.post._id
	return comment
}

normalizeComments = function normalizeComments(comments){
	return _.map(comments, normalizeComment)
}

yesterday = function() {
  var date = new Date()
  date.setDate(date.getDate() - 1)
  return date
}