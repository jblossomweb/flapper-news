var express = require('express')
var router = express.Router()
var config = require("../config")

/* GET home page. */
router.get('/', function(req, res, next) {
	var vars = {}
	if(config.aws.use_aws_s3 && config.aws.s3_cdn_base && config.aws.s3_bucket) {
		vars.CDN_URL = config.aws.s3_cdn_base + config.aws.s3_bucket + "/public/"
	}
  res.render('index', vars)
})

module.exports = router
