var fs = require('fs')
var env = require('node-env-file')

if (fs.existsSync('.env')) {
  env('.env')
}

module.exports = {
    mongo: {
        connection: process.env.MONGO_CONNECTION || 'mongodb://localhost/flapper-news'
    },
    aws: {
        use_aws_s3: process.env.USE_AWS_S3 === "true" || false, // defaults to file system if false
        s3_cdn_base: process.env.AWS_CDN_BASE || 'https://s3.amazonaws.com/',
        s3_bucket: process.env.S3_BUCKET || 'flapper-news-develop',
        access_key_id: process.env.AWS_ACCESS_KEY_ID,
        secret_access_key: process.env.AWS_SECRET_ACCESS_KEY
    },
    paths: {
        screenshots: process.env.SCREENSHOTS_PATH || 'img/screenshots/',
        favicons: process.env.FAVICONS_PATH || 'img/favicons/'
    }
}