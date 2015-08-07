var underscore = angular.module('underscore', [])
var app = angular.module('flapperNews', ['ui.router','underscore'])

app.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
      resolve: {
		    postPromise: ['postFactory', function(postFactory){
		      return postFactory.getAll()
		    }]
		  }
    })
    .state('posts', {
		  url: '/posts/{id}',
		  templateUrl: '/posts.html',
		  controller: 'PostsCtrl',
		  resolve: {
		    post: ['$stateParams', 'postFactory', function($stateParams, postFactory) {
		      return postFactory.get($stateParams.id)
		    }]
		  }
		})

  $urlRouterProvider.otherwise('home')
}])

app.factory('_', function() {
	return window._
})

app.factory('postFactory', ['$http', function($http){
	var obj = {
		posts: []
	}
	obj.getAll = function getAll() {
    return $http.get('/api/posts').success(function(data){
      angular.copy(data, obj.posts)
    }).error(function(error){
    	console.log(error)
    })
  }
  obj.get = function get(id) {
	  return $http.get('/api/posts/'+id).then(function(res){
	    return res.data
	  })
	}
  obj.create = function create(post) {
  	return $http.post('/api/posts', post).success(function(data){
    	obj.posts.push(data)
  	}).error(function(error){
    	console.log(error)
    })
	}
	obj.upvote = function upvote(post) {
	  return $http.put('/api/posts/'+post.id+'/upvote').success(function(data){
      post.upvotes++
    }).error(function(error){
    	console.log(error)
    })
	}
	obj.addComment = function addComment(id, comment) {
	  return $http.post('/api/posts/'+id+'/comments', comment)
	}
	obj.upvoteComment = function(post, comment) {
	  return $http.put('/api/posts/'+post.id+'/comments/'+comment.id+'/upvote').success(function(data){
	  	comment.upvotes++
	  }).error(function(error){
    	console.log(error)
    })
	}
  return obj
}])

app.controller('MainCtrl', [
'$scope',
'$stateParams',
'postFactory',
function($scope,$stateParams, postFactory){
  $scope.posts = postFactory.posts
	$scope.addPost = function(){
		if(!$scope.title || $scope.title === '') { return }

		postFactory.create({
	    title: $scope.title, 
	  	link: $scope.link,
	  	upvotes: 0,
	  	comments: []
	  })

	  $scope.title = ''
	  $scope.link = ''
	}
	$scope.upvotePost = function(post) {
	  postFactory.upvote(post)
	}
}])

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
	$scope.upvotePost = function(post) {
	  postFactory.upvote(post)
	}
}])