/*
 * - watches all files in a directory for events
 *
 * Usage:
 *
 *     var watcher = treeWatcher.create(dir, ignoredPatterns);
 *
 *     watcher.on("file:change", handler);
 *     watcher.on("file:delete", handler);
 *     watcher.on("file:create", handler);
 *     watcher.on("dir:change", handler);
 *     watcher.on("dir:delete", handler);
 *     watcher.on("dir:create", handler);
 *
 *     watcher.init();
 *
 * dir is the path to the directory
 * ignoredPatterns is an array of strings/regexes to ignore
 *
 */

var fs = require("fs");
var when = require("when");
var EventEmitter = require("events").EventEmitter;

var watcher = require("./fs-watcher");
var fsFiltered = require("./fs-filtered");
var changeTracker = require("./change-tracker");

function create(root, excludes) {
    var instance = Object.create(this);
    instance.root = root;
    instance.fsFiltered = fsFiltered.create(excludes);
    instance.watcher = watcher.create();
    return instance;
}

function notDirectory(file) {
    return !file.isDirectory();
}

function emit(event, file) {
    var type = file.isDirectory() ? "dir" : "file";
    this.emit(type + ":" + event, file);
}

function watchDir(dir) {
    var d = when.defer();
    var _watch = watch.bind(this);
    var _unwatch = unwatch.bind(this);
    var statFiles = fsFiltered.statFiles.bind(this.fsFiltered, dir.name);
    var emitCreate = emit.bind(this, "create");
    var emitDelete = emit.bind(this, "delete");

    statFiles(function (err, files) {
        if (err) { return d.reject(err); }

        var tracker = changeTracker.create(statFiles, files);

        tracker.on("create", _watch);
        tracker.on("delete", _unwatch);

        tracker.on("create", emitCreate);
        tracker.on("delete", emitDelete);

        this.watcher.watch(dir, function () { return tracker.poll(); });

        when.all(files.map(_watch)).then(d.resolve);
    }.bind(this));

    return d.promise;
}

function throttle(fn, threshold) {
    var last = 0;
    return function () {
        var now = new Date().getTime();
        if (now - last >= threshold) {
            last = now;
            return fn.apply(this, arguments);
        }
    };
}

function emitChange(file, event) {
    if (event === "change") {
        this.emit("file:change", file);
    };
}

// throttle file:change since Windows fires a couple events per actual change
// 10 ms seems enough to catch the duplicates
function watchFile(file) {
    this.watcher.watch(file, throttle(emitChange.bind(this, file), 10));
    return when(true);
}

function watch(file) {
    if (file.isDirectory()) {
        return watchDir.call(this, file);
    } else {
        return watchFile.call(this, file);
    }
}

function unwatch(file) {
    if (file.isDirectory()) {
        this.watcher.unwatchDir(file);
    } else {
        this.watcher.unwatch(file);
    }
}

function init() {
    var d = when.defer();

    fsFiltered.statFile(this.root, function (err, file) {
        if (err) { return d.reject(err); }

        watchDir.call(this, file).then(d.resolve);
    }.bind(this));

    return d.promise;
}

function end() {
    this.watcher.end();
}

module.exports = new EventEmitter();
module.exports.create = create;
module.exports.init = init;
module.exports.end = end;

var me = module.exports;

module.exports.test = function (root) {
    var watcher = me.create(root, ["#", "node_modules", ".git"]);
    watcher.on("file:change", function (file) { console.log("file:change", file.name, file.ino); });
    watcher.on("file:delete", function (file) { console.log("file:delete", file.name, file.ino); });
    watcher.on("file:create", function (file) { console.log("file:create", file.name, file.ino); });
    watcher.on("dir:change", function (dir) { console.log("dir:change", dir.name, dir.ino); });
    watcher.on("dir:delete", function (dir) { console.log("dir:delete", dir.name, dir.ino); });
    watcher.on("dir:create", function (dir) { console.log("dir:create", dir.name, dir.ino); });
    watcher.init();
};