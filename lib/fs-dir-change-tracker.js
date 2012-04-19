/*
 * Keeps track of files in a directory
 * - emits events about changes when .poll is called
 * - events are: update, delete, create
 * - event details are of type fs.Stats with the name of the file added
 *
 * Usage:
 *
 *     var changeTracker = require("fs-dir-change-tracker");
 *     var tracker = changeTracker.create("/path/to/dir");
 *     tracker.init(); // returns promise
 *
 * The init function fetches the current state of the files in the directory,
 * to be compared against later, and then resolves the promise.
 *
 *     tracker.on("create", createListener);
 *     tracker.on("update", updateListener);
 *     tracker.on("delete", deleteListener);
 *     tracker.poll();
 *
 * When calling poll, the file stats are updated and events are fired.
 *
 */

var buster = require("buster");
var async = require("./async");
var when = require("when");
var fs = require("fs");

function create(dir) {
  var instance = buster.create(this);
  instance.dir = dir;
  return instance;
}

function init() {
  var deferred = when.defer();
  this.statFiles(function (err, stats) {
    if (err) { return deferred.reject(); }
    this.fileStats = stats;
    deferred.resolve();
  }.bind(this));
  return deferred.promise;
}

function same(file1) {
  return function (file2) { return file1.name === file2.name; };
}

function notIn(coll) {
  return function (item) { return !coll.some(same(item)); };
}

function changedMtime(fileStats) {
  return function (file) {
    var old = fileStats.filter(same(file))[0];
    return file.mtime.getTime() !== old.mtime.getTime();
  };
}

function both(f1, f2) {
  return function (item) { return f1(item) && f2(item); };
}

function poll() {
  var before = this.fileStats;

  this.statFiles(function (err, after) {
    var created = after.filter(notIn(before));
    var deleted = before.filter(notIn(after));
    var updated = after.filter(both(notIn(created), changedMtime(before)));

    created.forEach(this.emit.bind(this, "create"));
    deleted.forEach(this.emit.bind(this, "delete"));
    updated.forEach(this.emit.bind(this, "update"));

    this.fileStats = after;
  }.bind(this));
}

function statFile(file, callback) {
  fs.stat(file, function (err, stats) {
    if (err) return callback(err);
    stats.name = file;
    callback(null, stats);
  });
}

function statFiles(callback) {
  fs.readdir(this.dir, function (err, items) {
    if (err) return callback(err);
    async.map(statFile, items, callback);
  });
}

module.exports = buster.eventEmitter.create();
module.exports.create = create;
module.exports.init = init;
module.exports.poll = poll;
module.exports.statFiles = statFiles;
