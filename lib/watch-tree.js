var path = require("path");
var ino = require("inotify");
var wt = require("./watch-tree/walk-tree");

function createEvent(dir, event) {
    return {
        name: path.join(dir, event.name),

        isDirectory: function () {
            return event.mask & ino.Inotify.IN_ISDIR;
        },

        isCreate: function () {
            return event.mask & ino.Inotify.IN_CREATE;
        },

        isDelete: function () {
            return event.mask & ino.Inotify.IN_DELETE;
        },

        isModify: function () {
            return event.mask & ino.Inotify.IN_MODIFY;
        }
    };
}

function watch(inotify, dir, options, callback) {
    inotify.addWatch({
        path: dir,
        watch_for: ino.Inotify.IN_CREATE | ino.Inotify.IN_DELETE |
            ino.Inotify.IN_MODIFY,

        callback: function (event) {
            var e = createEvent(dir, event);

            if (e.isDirectory() && e.isCreate()) {
                watch(inotify, e.name, options, callback);
            }

            if (!wt.isExcluded(e.name, options.exclude) &&
                typeof callback == "function") {
                callback(e);
            }
        }
    });
}

function watchTree(dir, options, callback) {
    if (arguments.length == 2 && typeof options == "function") {
        callback = options;
        options = {};
    }

    options = options || {};
    options.exclude = wt.excludeRegExes(options.exclude);
    var inotify = new ino.Inotify();
    watch(inotify, dir, options, callback);

    wt.walkTree(dir, options, function (err, dir) {
        if (err) return;
        watch(inotify, dir, options, callback);
    });

    return {
        end: function () {
            inotify.close();
        }
    };
}

module.exports = {
    watchTree: watchTree
};
