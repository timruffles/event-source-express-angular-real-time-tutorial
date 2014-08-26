# Real-time the easy way

When people think real-time their thoughts immediately leap to web-sockets. For many use-cases there exists a more productive approach, with good browser support hitting 100% via [shims](https://github.com/Yaffle/EventSource/). Meet: [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) AKA server-sent-events!

EventSource is a HTTP based protocol that allows one-way evented communication from the server to the client. It avoids the overhead of polling, provides seamless reconnection without any code on your part and has an incredibly simple API.

I'll take you through the server-sent events related parts of both the client and server-side of a chat application implemented via EventSource. We'll use AngularJS in the client and NodeJS in the server. The [full source](https://github.com/timruffles/chat-event-source) is available to read too.

First - let's check out the EventSource API itself:

```javascript
var chatEvents = new EventSource('/rooms/' + id  + "/events");

chatEvents.addEventListener("chat", function(event) {
  var chat = JSON.parse(event.data);
  if(chat.userId != userId) {
    chats.unshift(chat);
  }
});
```

Surprisingly cruft-free for a browser API! We provide the URL of the HTTP endpoint that'll be pushing the events, and then use the `addEventListener(eventName, handlerFunction)` API we know and love in the DOM. Just like in the DOM we have an event object holding event data in its properties. Here we want the data - which is sent as a string. I've chosen to encode it as JSON - so we simply parse it and place it at the start of our list of chats.

The server-side is not much more complex. The simplicity of the API is hidden in the spec, so I'll show you the full text of a session, first up the request:

```
GET /rooms/demo/events HTTP/1.1
Host: localhost:1234
```

and the response:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Transfer-Encoding: chunked

event: chat
data: {"message":"hello world","userId":1,"createdAt":"2014-08-26T17:06:12.521Z"}

event: chat
data: {"message":"this is fun","userId":1,"createdAt":"2014-08-26T17:06:12.521Z"}
```

Simplicity itself! We simply have to set the `Content-Type` to `text/event-stream`, disable caching and tell the browser to expect `chunked` encoding. Each event is sent as a number of headers (`event:`, `data:`) separated by new-lines, with a double new-line between events.

Let's implement that with NodeJS. I've chosen the `express` HTTP server library as it's simple and commonly-used. If you've not used it before, it's just a matter of writing handler functions that use the `request` and `response` parameters (usually shortened to `req` and `res`) to respond to HTTP requests. Here's a simple one for creating a user:

```javascript
server.post("/users", function(req, res) {
  users.create(function(err, user) {
    if(err) {
      return res.send(500);
    }

    res.send(user);
  });
});
```

You can see we're accepting `POST /users` requests, and asynchronously responding based on the result of creating a user.

Implementing the real-time notifications for chat messages is simple. First we'll write an implementation of the server-side of the server-sent events spec:

```javascript
function startSees(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write("\n");

  return function sendSse(name,data,id) {
    res.write("event: " + name + "\n");
    if(id) res.write("id: " + id + "\n");
    res.write("data: " + JSON.stringify(data) + "\n\n");
  }
}
```

We start off by sending the server-sent event headers. After that we can keep sending new events separated by double-newlines.

Now we've got our `sse` implementation, time to use it to build out the `/rooms/:id/events` endpoint:

```javascript
server.get("/rooms/:id/events", fetchRoom, function(req, res) {
  var room = res.locals.room;
  var sse = startSees(res);
  room.on("chat", sendChat);
      
  req.once("end", function() {
    rooms.removeListener("chat", sendChat);
  });
       
  function sendChat(chat) {
    sse("chat", chat);
  }
});
```

We're proxying events from a NodeJS [`EventEmitter`](http://nodejs.org/api/events.html) through to the browser in 20 lines of code! A fully-featured implementation would only need the ability to send through the last event ID the client had received, and we'd have seamless reconnection functionality.

Once we boot up the server we have a functional, if incredibly simple, chat application!

![simple chat with nodejs, angularjs and server-sent events](https://raw.githubusercontent.com/timruffles/chat-event-source/master/article-assets/chat.png)

I hope this quick run-down whetted your appetite for `EventSource`. I think it's one of those rare browser APIs that leaves you thankful to its designers for making your life easy. Please check out the [completed example](https://github.com/timruffles/chat-event-source) and have a play!







