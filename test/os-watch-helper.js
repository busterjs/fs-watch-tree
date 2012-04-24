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

var platforms = {
    "osx": {
        setUp: function (context) {
            this.watchers = [];
            context.stub(fs, "watch", watch.bind(this));
        },

        fileEvent: function (file, event, info) {
            return when.all(this.watchers.filter(is(file)).map(function (watcher) {
                return watcher.callback(event, info);
            }));
        },

        dirEvent: function (file, event, info) {
            return this.fileEvent(path.dirname(file), event, info);
        },

        change: function (file) {
            return this.fileEvent(file, "change", null);
        },

        create: function (file) {
            return this.dirEvent(file, "rename", null);
        },

        rm: function (file) {
            return when.all([
                this.dirEvent(file, "rename", null),
                this.fileEvent(file, "rename", null)
            ]);
        },

        mkdir: function (file) {
            return this.dirEvent(file, "rename", null);
        },

        rmdir: function (file) {
            return this.dirEvent(file, "rename", null);
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

    change: function (file) {
        fs.writeFileSync(file, unique++);
        return this.os.change(file);
    },

    create: function (file) {
        fs.writeFileSync(file, unique++);
        return this.os.create(file);
    },

    rm: function (file) {
        fs.unlinkSync(file);
        return this.os.rm(file);
    },

    mkdir: function (file) {
        fs.mkdirSync(file);
        return this.os.mkdir(file);
    },

    rmdir: function (file) {
        fs.rmdirSync(file);
        return this.os.rmdir(file);
    }
};
