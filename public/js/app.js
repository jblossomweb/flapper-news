var app = angular.module('flapperNews', ['ui.router', 'ui.bootstrap', 'angularMoment', 'infiniteScroll'])

app.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: 'views/home',
      controller: 'MainCtrl',
      resolve: {
		    postPromise: ['postFactory', function(postFactory){
		      return postFactory.getAll()
		    }]
		  }
    })
    .state('posts', {
		  url: '/posts/{id}',
		  templateUrl: 'views/posts',
		  controller: 'PostsCtrl',
		  resolve: {
		    post: ['$stateParams', 'postFactory', function($stateParams, postFactory) {
		      return postFactory.get($stateParams.id)
		    }]
		  }
		})

  $urlRouterProvider.otherwise('home')
}])

app.filter('escape', function() {
  return window.encodeURIComponent
})

app.directive('rootScope', function() {
	// setup some $rootScope
	return {
		link: function(scope, element, attrs) {
			scope.CDN_URL = attrs.cdnUrl
			scope.SCREENSHOTS = attrs.screenshots
			scope.FAVICONS = attrs.favicons
			scope.API_BASE = attrs.apiBase
		},
		controller: ['$scope', '$uibModal', '$uibModalStack', 'postFactory', function($scope, $uibModal, $uibModalStack, postFactory) {
			$scope.openModal = function(template, data, size) {
				if(!size) {
					var size = 'lg'
				}
				var modalInstance = $uibModal.open({
					templateUrl: 'views/modals/' + template,
					size: size,
					controller: 'ModalCtrl',
					resolve: {
						data: data || null
					}
				})
			}

			$scope.closeModals = function() {
				$uibModalStack.dismissAll()
			}

			$scope.createPost = function(post, callback){
				if(!post || !post.title || post.title === '') { return }
				postFactory.create({
					title: post.title, 
					link: post.link,
					teaser: post.teaser,
					desc: post.desc,
					upvotes: 0,
					comments: []
				}, callback)
			}
			$scope.upvotePost = function(post) {
				postFactory.upvote(post)
			}
		}]
	}
})

app.directive('imgDefault', ['$http', '$location', 'urlService', function($http, $location, urlService) {
	return {
		link: function(scope, element, attrs) {
			attrs.$observe('trySrc', function(trySrc){
				if(trySrc.indexOf('http') !== 0) { // catch relative paths (for local dev env's)
					var port = $location.port() ? ':'+$location.port() : ''
					var prepend = $location.protocol() + '://' + $location.host() + port + '/'
					trySrc = prepend + trySrc
				}
				urlService.check(trySrc).success(function(data) {
					if(data.valid) {
						$http.get(trySrc).success(function(data, status, headers){
							if(data.length === 0) {
								attrs.$set('src', attrs.defaultSrc)
							} else {
								// success. ok to fetch image.
								attrs.$set('src', trySrc)
							}
						}).error(function(err, status){
							if(status >= 400) {
								// shouldn't ever happen, unless api changes
								attrs.$set('src', attrs.defaultSrc)
							}
						})
					} else {
						// don't try to fetch client side (prevent 404s in console)
						attrs.$set('src', attrs.defaultSrc)
					}
				}).error(function(err,status){
					// shouldn't ever happen, unless api changes
					attrs.$set('src', attrs.defaultSrc)
				})
			})
			// I tried this, then removed in favor of infinite scroll
			//
			// var lazyLoad = function() {
			// 	var src = element.attr('lazy-src')
			// 	var scrolled = $window.scrollY
			// 	var position = element[0].offsetTop
			// 	var pageHeight = $window.innerHeight
			// 	if(scrolled + pageHeight >= position) {
			// 		// load the image
			// 		console.log(scrolled + pageHeight)
			// 		console.log(position)
			// 		console.log('load '+src)
			// 		attrs.$set('src', src)
			// 	}
			// }
			// attrs.$observe('src', function(src){
			// 	if(element.attr('src')) {
			// 		$window.removeEventListener("scroll", lazyLoad)
			// 		$window.removeEventListener("resize", lazyLoad)
			// 	}
			// })
			// attrs.$observe('lazySrc', function(lazySrc){
			// 	if(!element.attr('src')) {
			// 		$window.addEventListener("scroll", lazyLoad)
			// 		$window.addEventListener("resize", lazyLoad)
			// 		// init
			// 		lazyLoad(lazySrc)
			// 	}
			// })
		},
	}
}])


app.directive('videoIframe', function() {
	return {
		templateUrl: 'views/directives/video-iframe',
		link: function(scope, element, attrs) {
			scope.videoId = attrs.videoId
			scope.videoType = attrs.videoType
			scope.videoEmbed = attrs.videoEmbed
		},
		scope: {
			videoId: "@",
			videoType: "@",
			videoEmbed: "@"
		},
		controller: ['$scope', '$sce', function($scope, $sce) {
			switch($scope.videoType) {
				case 'youtube': 
					$scope.videoUrl = $sce.trustAsResourceUrl('https://www.youtube.com/embed/' + $scope.videoId)
				break;
				case 'vimeo': 
					$scope.videoUrl = $sce.trustAsResourceUrl('https://player.vimeo.com/video/' + $scope.videoId)
				break;
				default: 
					$scope.videoUrl = $sce.trustAsResourceUrl($scope.videoEmbed)
			}
		}]
	}
})

app.directive('postForm', function() {
	return {
		templateUrl: 'views/directives/post-form',
		controller: ['$scope', '$rootScope', 'urlService', function($scope, $rootScope, urlService) {
			$scope.previewSpinner = false
			$scope.linkLookup = function() {
				if($scope.link && $scope.link.length) {
					$scope.previewSpinner = true
					urlService.lookup($scope.link).success(function(data) {
						$scope.title = data.title
						$scope.teaser = data.teaser
						$scope.desc = data.desc
						$scope.preview = {
							title: data.title,
							teaser: data.teaser,
							image: data.image
						}
						$scope.previewSpinner = false
					}).error(function(error) {
						$scope.preview = false
						$scope.previewSpinner = false
						console.error(error)
					})
				} else {
					$scope.preview = false
					$scope.previewSpinner = false
				}
			}

			$scope.addPost = function() {
				$scope.postSpinner = true
				$rootScope.createPost($scope, function created(err, lastPost){
					if(err) {
						$scope.apiSuccess = false
						$scope.lastPost = false
						$scope.preview = false
						$scope.postSpinner = false
						$scope.apiErrors = []
						if(err && err.errors) {
							angular.forEach(err.errors, function(error, field) {
								$scope.apiErrors.push(error.message)
							})
						} else {
							$scope.apiErrors = [err.message]
						}

					} else {
						$scope.apiErrors = false
						$scope.apiSuccess = 'Successfully posted!'
						$scope.lastPost = lastPost
						$scope.title = ''
						$scope.link = ''
						$scope.teaser = ''
						$scope.desc = ''
						$scope.preview = false
						$scope.postSpinner = false
					}
				})
			}
		}]
	}
})

app.factory('postFactory', ['$http', '$rootScope', function($http, $rootScope){
	var obj = {
		posts: []
	}
	var apiBase = $rootScope.apiBase || '/api/'
	obj.getAll = function getAll() {
    return $http.get(apiBase+'posts').success(function(data){
      angular.copy(data, obj.posts)
    }).error(function(error){
    	console.error(error)
    })
  }
  obj.get = function get(id) {
	  return $http.get(apiBase+'posts/'+id).then(function(res){
	    return res.data
	  })
	}
  obj.create = function create(post, callback) {
  	return $http.post(apiBase+'posts', post).success(function(data){
    	obj.posts.push(data)
    	if(callback) {
    		callback(null,data)
    	}
  	}).error(function(error){
    	console.error(error)
    	if(callback) {
    		callback(error)
    	}
    })
	}
	obj.upvote = function upvote(post) {
	  return $http.put(apiBase+'posts/'+post.id+'/upvote').success(function(data){
      post.upvotes++
    }).error(function(error){
    	console.error(error)
    })
	}
	obj.addComment = function addComment(id, comment) {
	  return $http.post(apiBase+'posts/'+id+'/comments', comment)
	}
	obj.upvoteComment = function(post, comment) {
	  return $http.put(apiBase+'posts/'+post.id+'/comments/'+comment.id+'/upvote').success(function(data){
	  	comment.upvotes++
	  }).error(function(error){
    	console.error(error)
    })
	}
  return obj
}])

app.service('urlService', ['$http', '$rootScope', 'escapeFilter', function($http, $rootScope, escapeFilter){
	var apiBase = $rootScope.apiBase || '/api/'
	this.check = function check(url) {
		var urlencoded = escapeFilter(url)
	  return $http.get(apiBase + 'check/'+urlencoded).success(function(res){
	    return res.data
	  }).error(function(error){
    	console.error(error)
    })
	}
	this.lookup = function lookup(url) {
		var urlencoded = escapeFilter(url)
	  return $http.get(apiBase + 'lookup/'+urlencoded).success(function(res){
	    return res.data
	  }).error(function(error){
    	console.error(error)
    })
	}
}])

// generic, stateless modal controller, accepts a data param if needed
app.controller('ModalCtrl', [
'$scope',
'$uibModalInstance',
'data',
function($scope, $uibModalInstance, data) {
	$scope.data = data
	$scope.submit = function(newData) {
		$uibModalInstance.close(newData)
	}
	$scope.cancel = function() {
		$uibModalInstance.dismiss('cancel')
	}
}])

// main page controller, see states
app.controller('MainCtrl', [
'$scope',
'postFactory',
function($scope, postFactory){
	$scope.posts = postFactory.posts.slice(0,5)
	$scope.canLoad = true
	$scope.morePosts = function morePosts(n){
		var morePosts = postFactory.posts.slice($scope.posts.length,$scope.posts.length+n)
		$scope.posts = $scope.posts.concat(morePosts)
	}
}])

// post page controller, see states
app.controller('PostsCtrl', [
'$scope',
'postFactory',
'post',
function($scope, postFactory, post){
	$scope.post = post
	$scope.addComment = function(){
	  if(!$scope.body || $scope.body === '') { return }
	  if(!$scope.post.comments) $scope.post.comments = []
		postFactory.addComment(post.id, {
	    body: $scope.body,
	    author: 'user',
	  }).success(function(comment) {
	    $scope.post.comments.push(comment)
	  })
	  $scope.body = ''
	}
	$scope.upvoteComment = function(comment) {
	  postFactory.upvoteComment(post,comment)
	}
}])