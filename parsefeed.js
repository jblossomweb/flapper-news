var feed = require('./services/feed')

if(process.argv.length > 2){
  var feedUrl = process.argv[2]
  feed.ingest(feedUrl, function(error, result){
    if(error) {
      console.log(error)
    }
  })

} else {
  console.log('NO FEED URL')
  process.exit()
}



