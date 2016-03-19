var mongoose = require('mongoose')
var slugify = require('slugify')
var webshot = require('webshot')
var screenshots = 'public/img/screenshots/'

var PostSchema = new mongoose.Schema({
	_id: String,
  title: String,
  link: String,
  desc: String,
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
					webshot(self.link, screenshots + self._id + '.png', function(err){
						// console.log(self._id + '.png was created')
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