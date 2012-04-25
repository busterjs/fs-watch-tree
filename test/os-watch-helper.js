/*
 * os-watch stubs out and simulates the behavior of fs.watch on different
 * platforms.
 *
 * Usage:
 *
 *     var os = osWatch.create(this, "windows"); // `this` is the test context
 *
 *     os.create("file")
 *     os.change("file")
 *     os.mkdir("dir")
 *     os.rmdir("dir")
 *     os.rename("file", "new")
 *     os.move("file", "dir")
 *     os.rm("file")
 *
 * Platforms:
 *
 *     unix
 *     windows
 *     osx
 *     integration (no stubbing)
 *
 * The windows version translates / to \ for you. You're welcome.
 *
 */

var fs = require("fs");
var path = require("path");
var when = require("when");

var unique = new Date().getTime();
var noop = function () {};

var is = function (file) { return function (watcher) { return file === watcher.file; }; };

var notEq = function (watcher) { return function (w) { return w !== watcher; }; };

function removeWatcher(watcher) {
    this.watchers = this.watchers.filter(notEq(watcher));
}

function watch (file, callback) {
    var watcher = {
        file: file,
        callback: callback
    };
    this.watchers.push(watcher);
    return { close: removeWatcher.bind(this, watcher) };
}

function fileEvent(file, event, info) {
    return when.all(this.watchers.filter(is(file)).map(function (watcher) {
        return watcher.callback(event, info);
    }));
}

function dirEvent(file, event, info) {
    return fileEvent.call(this, path.dirname(file), event, info);
}

function wait() {
    var d = when.defer();
    setTimeout(d.resolve, 100);
    return d.promise;
}

var platforms = {
    "integration": {
        setUp: function (context) {
            this.watchers = [];
        },
        change: wait,
        create: wait,
        rm: wait,
        mkdir: wait,
        rmdir: wait
    },

    "osx": {
        setUp: function (context) {
            this.watchers = [];
            context.stub(fs, "watch", watch.bind(this));
        },

        change: function (file) {
            return fileEvent.call(this, file, "change", null);
        },

        create: function (file) {
            return dirEvent.call(this, file, "rename", null);
        },

        rm: function (file) {
            return when.all([
                dirEvent.call(this, file, "rename", null),
                fileEvent.call(this, file, "rename", null)
            ]);
        },

        mkdir: function (file) {
            return dirEvent.call(this, file, "rename", null);
        },

        rmdir: function (file) {
            return dirEvent.call(this, file, "rename", null);
        }
    }
};



module.exports = {
    on: function (context, platform) {
        var instance = Object.create(this);
        var os = Object.create(platforms[platform]);
        os.setUp(context);
        instance.os = os;
        return instance;
    },

    get watchers() { return this.os.watchers; },

    change: function (file) {
        var d = when.defer(), os = this.os;
        fs.writeFile(file, unique++, function () {
            os.change(file).then(d.resolve);
        });
        return when.all([d.promise, wait()]);
    },

    create: function (file) {
        var d = when.defer(), os = this.os;
        fs.writeFile(file, unique++, function () {
            os.create(file).then(d.resolve);
        });
        return when.all([d.promise, wait()]);
    },

    rm: function (file) {
        var d = when.defer(), os = this.os;
        fs.unlink(file, function () {
            os.rm(file).then(d.resolve);
        });
        return when.all([d.promise, wait()]);
    },

    mkdir: function (file) {
        var d = when.defer(), os = this.os;
        fs.mkdir(file, function () {
            os.mkdir(file).then(d.resolve);
        });
        return when.all([d.promise, wait()]);
    },

    rmdir: function (file) {
        var d = when.defer(), os = this.os;
        fs.rmdir(file, function () {
            os.rmdir(file).then(d.resolve);
        });
        return when.all([d.promise, wait()]);
    }
};
