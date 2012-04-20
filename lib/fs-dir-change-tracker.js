/*
 * Keeps track of files
 * - emits events about changes when .poll is called
 * - events are: update, delete, create
 *
 * Usage:
 *
 *     var tracker = changeTracker.create(checkFiles, files);
 *
 * - checkFiles is a function to fetch the current state of the files you want to
 *   watch. It should return a list of objects with a unique 'name' and an 'mtime'
 *   to compare for update-events.
 *
 * - files is the current list of files, as given by running checkFiles now
 *
 *     tracker.on("create", createListener);
 *     tracker.on("update", updateListener);
 *     tracker.on("delete", deleteListener);
 *     tracker.poll();
 *
 * When calling poll, checkFiles is called, the result is compared to the old
 * values, and events are emitted.
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

function changedMtime(files) {
  return function (file) {
    var old = files.filter(eq(file))[0];
    return file.mtime.getTime() !== old.mtime.getTime();
  };
}

function both(f1, f2) {
  return function (item) { return f1(item) && f2(item); };
}

function poll() {
  var before = this.files;
  var deferred = when.defer();

  this.checkFiles(function (err, after) {
    if (err) { return deferred.reject(err); }

    var created = after.filter(notIn(before));
    var deleted = before.filter(notIn(after));
    var updated = after.filter(both(notIn(created), changedMtime(before)));

    created.forEach(this.emit.bind(this, "create"));
    deleted.forEach(this.emit.bind(this, "delete"));
    updated.forEach(this.emit.bind(this, "update"));

    this.files = after;

    deferred.resolve();
  }.bind(this));

  return deferred.promise;
}

module.exports = new EventEmitter();
module.exports.create = create;
module.exports.poll = poll;
