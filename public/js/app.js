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
		  controller: 'PostsCtrl'
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
  obj.create = function(post) {
  return $http.post('/api/posts', post).success(function(data){
    obj.posts.push(data)
  })
}
  return obj
}])

app.controller('MainCtrl', [
'$scope',
'$stateParams',
'_',
'postFactory',
function($scope,$stateParams, _, postFactory){
  $scope.posts = postFactory.posts
	$scope.addPost = function(){
		if(!$scope.title || _.isEmpty($scope.title)) { return }

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
	  post.upvotes++
	}
}])

app.controller('PostsCtrl', [
'$scope',
'$stateParams',
'_',
'postFactory',
function($scope, $stateParams, _, postFactory){
	$scope.post = _.findWhere(postFactory.posts, {id: parseInt($stateParams.id) })
	$scope.addComment = function(){
	  if(!$scope.body || _.isEmpty($scope.body)) { return }
	  if(!$scope.post.comments) $scope.post.comments = []
	  $scope.post.comments.push({
	    body: $scope.body,
	    author: 'user',
	    upvotes: 0
	  })
	  $scope.body = ''
	}
	$scope.upvoteComment = function(comment) {
	  comment.upvotes++
	}
	$scope.upvotePost = function(post) {
	  post.upvotes++
	}
}])