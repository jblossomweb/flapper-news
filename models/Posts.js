var mongoose = require('mongoose')

var PostSchema = new mongoose.Schema({
  title: String,
  link: String,
  upvotes: {type: Number, default: 0},
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
})

PostSchema.methods.upvote = function(done) {
  this.upvotes++
  this.save(done)
}

mongoose.model('Post', PostSchema)