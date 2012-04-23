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

var statFiles = fsFiltered.statFiles;

function watchDir(dir) {
    var deferred = when.defer();
    var _watch = watch.bind(this);
    var _unwatch = unwatch.bind(this);

    this.fsFiltered.statFiles(dir.name, function (err, files) {
        if (err) { return deferred.reject(err); }

        var tracker = changeTracker.create(
            statFiles.bind(this.fsFiltered, dir.name),
            files
        );

        tracker.on("create", _watch);
        tracker.on("delete", _unwatch);

        tracker.on("create", emit.bind(this, "create"));
        tracker.on("delete", emit.bind(this, "delete"));

        this.watcher.watch(dir, function () { return tracker.poll(); });

        when.all(files.map(_watch)).then(deferred.resolve);
    }.bind(this));

    return deferred.promise;
}

function watchFile(file) {
    this.watcher.watch(file, function (event) {
        if (event === "change") {
            this.emit("file:change", file);
        };
    }.bind(this));
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
    var deferred = when.defer();

    fsFiltered.statFile(this.root, function (err, file) {
        if (err) { return deferred.reject(err); }

        watchDir.call(this, file).then(deferred.resolve);
    }.bind(this));

    return deferred.promise;
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
    var watcher = me.create(root, ["#"]);
    watcher.on("file:change", function (file) { console.log("file:change", file.name, file.ino); });
    watcher.on("file:delete", function (file) { console.log("file:delete", file.name, file.ino); });
    watcher.on("file:create", function (file) { console.log("file:create", file.name, file.ino); });
    watcher.on("dir:change", function (dir) { console.log("dir:change", dir.name, dir.ino); });
    watcher.on("dir:delete", function (dir) { console.log("dir:delete", dir.name, dir.ino); });
    watcher.on("dir:create", function (dir) { console.log("dir:create", dir.name, dir.ino); });
    watcher.init();
};