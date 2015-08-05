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
      controller: 'MainCtrl'
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

app.factory('posts', [function(){
  return [
		{id: 1, title: 'this is post 1', upvotes: 5},
	  {id: 2, title: 'this is post 2', upvotes: 2},
	  {id: 3, title: 'this is post 3', upvotes: 15},
	  {id: 4, title: 'this is post 4', upvotes: 9},
	  {id: 5, title: 'this is post 5', upvotes: 4}
	]
}])

app.controller('MainCtrl', [
'$scope',
'$stateParams',
'_',
'posts',
function($scope,$stateParams, _, posts){
  $scope.posts = posts
	$scope.addPost = function(){
		if(!$scope.title || _.isEmpty($scope.title)) { return }
	  $scope.posts.push({
	  	id: $scope.posts[$scope.posts.length-1].id + 1, // TODO: cleanup
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
'posts',
function($scope, $stateParams, _, posts){
	$scope.post = _.findWhere(posts, {id: parseInt($stateParams.id) })
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