var userId = 0;

exports.create = function(cb) {
  userId += 1;
  cb(null, { id: userId });
}
