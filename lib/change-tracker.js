/*
 * Keeps track of files
 * - emits events about changes when .poll is called
 * - events are: delete, create
 *
 * Usage:
 *
 *     var tracker = changeTracker.create(checkFiles, files);
 *
 * - checkFiles is a function to fetch the current state of the files you want
 *   to watch. It should return a list of objects with a unique 'name'.
 *
 * - files is the current list of files, as given by running checkFiles now
 *
 *     tracker.on("create", createListener);
 *     tracker.on("delete", deleteListener);
 *     tracker.poll();
 *
 * When calling poll, checkFiles is called, the result is compared to the old
 * list, and events are emitted.
 *
 */

var EventEmitter = require("events").EventEmitter;
var when = require("when");

function create(checkFiles, files) {
  var instance = Object.create(this);
  instance.checkFiles = checkFiles;
  instance.files = files;
  return instance;
}

function eq(file1) {
  return function (file2) { return file1.name === file2.name; };
}

function notIn(coll) {
  return function (item) { return !coll.some(eq(item)); };
}

function poll() {
  var before = this.files;
  var deferred = when.defer();

  this.checkFiles(function (err, after) {
    if (err) { return deferred.reject(err); }

    var created = after.filter(notIn(before));
    var deleted = before.filter(notIn(after));

    created.forEach(this.emit.bind(this, "create"));
    deleted.forEach(this.emit.bind(this, "delete"));

    this.files = after;

    deferred.resolve();
  }.bind(this));

  return deferred.promise;
}

module.exports = new EventEmitter();
module.exports.create = create;
module.exports.poll = poll;
