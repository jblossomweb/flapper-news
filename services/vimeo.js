var request = require('request')

var Service = {}

Service.baseUrl = "http://vimeo.com/api/v2/"

Service.getById = function (id, callback) {
	request({
		url: Service.baseUrl + "video/" + id + ".json",
		json: true
	}, function (err, res, json) {
		if(json && !err) {
			callback(null, json[0])
		} else {
			callback(err)
		}
	})
}


// export module
module.exports = Service