var fs = require("fs");
var when = require("when");
var EventEmitter = require("events").EventEmitter;

var fsFiltered = require("./fs-filtered");
var changeTracker = require("./change-tracker");

function create(root, excludes) {
    var instance = Object.create(this);
    instance.root = root;
    instance.fsFiltered = fsFiltered.create(excludes);
    instance.watchers = [];
    return instance;
}

function watchFile(file) {
    this.watchers.push(fs.watch(file.name, function (type) {
        if (type === "change") {
            this.emit("file:change", file);
        }
    }.bind(this)));
    return when(true);
}

function notDirectory(file) { return !file.isDirectory(); }

function emit(event, file) {
    var type = file.isDirectory() ? "dir" : "file";
    this.emit(type + ":" + event, file);
}

var statFiles = fsFiltered.statFiles;

function watchDir(dir) {
    var deferred = when.defer();

    this.fsFiltered.statFiles(dir.name, function (err, files) {
        if (err) { return deferred.reject(err); }

        var tracker = changeTracker.create(
            statFiles.bind(this.fsFiltered, dir.name),
            files
        );

        tracker.on("create", watch.bind(this));
        tracker.on("create", emit.bind(this, "create"));
        tracker.on("delete", emit.bind(this, "delete"));

        this.watchers.push(fs.watch(dir.name, function () {
            return tracker.poll();
        }));

        when.all(files.map(watch.bind(this))).then(deferred.resolve);
    }.bind(this));

    return deferred.promise;
}

function watch(file) {
    if (file.isDirectory()) {
        return watchDir.call(this, file);
    } else {
        return watchFile.call(this, file);
    }
}

function init() {
    return watchDir.call(this, { name: this.root });
}

function close(w) {
    w.close();
}

function end() {
    this.watchers.forEach(close);
}

module.exports = new EventEmitter();
module.exports.create = create;
module.exports.init = init;
module.exports.end = end;
