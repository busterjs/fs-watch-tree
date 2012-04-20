/*
 * Keeps track of files in a directory
 * - emits events about changes when .poll is called
 * - events are: update, delete, create
 * - event details are of type fs.Stats with the name of the file added
 *
 * Usage:
 *
 *     var tracker = changeTracker.create(statFiles, fileStats);
 *
 * - statFiles is a function to fetch the current state of the files you want to
 *   watch. It should return a list of fs.Stats with 'name' added as the full
 *   path of the file.
 *
 * - fileStats is the current state of the files, as given by running statFiles
 *
 *     tracker.on("create", createListener);
 *     tracker.on("update", updateListener);
 *     tracker.on("delete", deleteListener);
 *     tracker.poll();
 *
 * When calling poll, the file stats are updated and events are fired.
 *
 */

var EventEmitter = require("events").EventEmitter;
var when = require("when");

function create(statFiles, fileStats) {
  var instance = Object.create(this);
  instance.statFiles = statFiles;
  instance.fileStats = fileStats;
  return instance;
}

function eq(file1) {
  return function (file2) { return file1.name === file2.name; };
}

function notIn(coll) {
  return function (item) { return !coll.some(eq(item)); };
}

function changedMtime(fileStats) {
  return function (file) {
    var old = fileStats.filter(eq(file))[0];
    return file.mtime.getTime() !== old.mtime.getTime();
  };
}

function both(f1, f2) {
  return function (item) { return f1(item) && f2(item); };
}

function poll() {
  var before = this.fileStats;
  var deferred = when.defer();

  this.statFiles(function (err, after) {
    if (err) { return deferred.reject(err); }

    var created = after.filter(notIn(before));
    var deleted = before.filter(notIn(after));
    var updated = after.filter(both(notIn(created), changedMtime(before)));

    created.forEach(this.emit.bind(this, "create"));
    deleted.forEach(this.emit.bind(this, "delete"));
    updated.forEach(this.emit.bind(this, "update"));

    this.fileStats = after;

    deferred.resolve();
  }.bind(this));

  return deferred.promise;
}

module.exports = new EventEmitter();
module.exports.create = create;
module.exports.poll = poll;
