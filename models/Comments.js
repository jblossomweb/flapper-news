var mongoose = require('mongoose')

var CommentSchema = new mongoose.Schema({
  body: String,
  author: String,
  created: Date,
  updated: Date,
  upvotes: {type: Number, default: 0},
  post: { type: String, ref: 'Post' }
})

CommentSchema.methods.upvote = function(done) {
  this.upvotes++
  this.save(done)
}


CommentSchema.pre('save', function(next) {
	var self = this
	if(self._id) {
		self.updated = new Date()
	} else {
		self.created = new Date()
		self.updated = new Date()
	}
	next()
})

mongoose.model('Comment', CommentSchema)