var userId = 0;
var users = {};

exports.create = function(cb) {
  userId += 1;
  var user = users[userId] = { id: userId };
  cb(null, user);
}

exports.get = function(id) {
  var user = users[id];
  if(user) {
    cb(null, user);
  } else {
    cb(new Error("missing"));
  }
}
