angular.module("chat", [])
  .controller("ChatRoom", ChatRoom)
  .config(function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
  })
  .directive("refocusOn", refocusOn)
  .factory("EventSource", EventSourceNg)
  .factory("users", users)
  .factory("chats", chats);

function ChatRoom($scope, chats, users) {
  $scope.user = users.loginOrSignup();

  $scope.user.$promise.then(function() {
    $scope.chats = chats.forRoom("demo", $scope.user.id);
  });

  $scope.sendChat = function() {
    $scope.chats.send($scope.newChat)
      .then(resetChat, resetChat);
  }

  $scope.isMine = function(chat) {
    return chat.userId === $scope.user.id;
  }

  function resetChat() {
    $scope.newChat = {};
  }
}

function users($http, $q) {
  var api = {
    create: function() {
      var user = {};
      user.$promise = $http.post('/users')
        .success(function(data) {
          localStorage.userId = data.id;
          user.id = data.id;
        })
      return user;
    },
    me: function() {
      return {id: parseInt(localStorage.userId), $promise: $q.when(true)};
    },
    loginOrSignup: function() {
      if(localStorage.userId) {
        return this.me();
      }
      return api.create();
    }
  }

  return api;
}

function chats($http, $rootScope, EventSource) {

  function getForRoom(id, userId) {
    var chats = [];

    // live-updates
    var chatEvents = new EventSource('/rooms/' + id  + "/events");
    chatEvents.addEventListener("chat", function(event) {
      var chat = JSON.parse(event.data);
      if(chat.userId != userId) {
        chats.unshift(chat);
      }
    });

    retrieveInitial(id)
      .then(function(existing) {
        existing.forEach(function(chat) {
          chat.createdAt = new Date(Date.parse(chat.createdAt));
          chats.push(chat);
        });
      });
    
    // ability to send a chat
    chats.send = function(chatData) {
      chatData.userId = userId;
      chatData.createdAt = new Date;
      chatData.sending = true; 

      chats.unshift(chatData);

      return $http.post('/rooms/' + id + '/chats', _.omit(chatData, "sending"))
        .then(function() {
          chatData.sending = false;
        }, function() {
          chatData.failed = true;
          chatData.sending = false;
        });
    }

    function sortChats() {
       _.sortBy(chats, "createdAt").reverse();
    }

    return chats;
  }

  function retrieveInitial(id) {
    // initial chats
    return $http.get('/rooms/' + id + '/chats')
      .then(function(result) {
        return result.data;
      });
  }

  return {
    forRoom: getForRoom
  }
}

function EventSourceNg($rootScope) {
  function EventSourceNg(url) {
    this._source = new EventSource(url);
  }
  EventSourceNg.prototype = {
    addEventListener: function(x, fn) {
      this._source.addEventListener(x, function(event) {
        $rootScope.$apply(fn.bind(null, event));
      });
    }
  }
  return EventSourceNg;
}

function refocusOn() {
  return {
    scope: {
      "refocusOn": "@"
    },
    link: function(scope, el, attrs) {
    }
  }
}

