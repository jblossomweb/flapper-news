var express = require('express')
var router = express.Router()

var mongoose = require('mongoose')
var _ = require('underscore')

// models
var Post = mongoose.model('Post')
var Comment = mongoose.model('Comment')

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

// GET /posts - return a list of posts and associated metadata
router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts){
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
	post = _.pick(post, '_id', 'title', 'link','comments','upvotes')
	post = _.extendOwn({id: post._id}, post)
	delete post._id
	if(post.comments) post.comments = normalizeComments(post.comments)
	return post
}

normalizePosts = function normalizePosts(posts){
	return _.map(posts, normalizePost)
}

normalizeComment = function normalizeComment(comment){
	comment = _.pick(comment, '_id', 'post', 'author', 'body', 'upvotes')
	comment = _.extendOwn({id: comment._id}, comment)
	delete comment._id
	if(comment.post) comment.post = comment.post._id
	return comment
}

normalizeComments = function normalizeComments(comments){
	return _.map(comments, normalizeComment)
}