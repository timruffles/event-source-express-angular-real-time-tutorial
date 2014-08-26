var rooms = {};
var roomCount = 0;

exports.create = function(id) {
  rooms[id] = new Room(id);
}

exports.get = function(id) {
  return rooms[id];
}

function Room(id) {
  this.chats = [];
}

require("util").inherits(Room, require("events").EventEmitter);

Room.prototype.chat = function(chat) {
  this.chats.unshift(chat);
  this.emit("chat", chat);
};
Room.prototype.latest = function() {
  return this.chats.slice(0, 20);
};

