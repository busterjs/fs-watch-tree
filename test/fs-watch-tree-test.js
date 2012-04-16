var buster = require("buster");
var watchTree = require("../lib/fs-watch-tree").watchTree;
var walkTree = require("../lib/walk-tree");
var helper = require("./helper");
var ino = require("inotify");
var path = require("path");
var fs = require("fs");
var rmrf = require("rimraf");

var events = {
    IN_CREATE: ino.Inotify.IN_CREATE,
    IN_DELETE: ino.Inotify.IN_DELETE,
    IN_MODIFY: ino.Inotify.IN_MODIFY,
    IN_OPEN: ino.Inotify.IN_OPEN,
    IN_ISDIR: ino.Inotify.IN_ISDIR
};

function p(filePath) {
    return path.resolve(helper.ROOT, filePath);
}

function assertWatched(spy, path) {
    for (var i = 0, l = spy.callCount; i < l; ++i) {
        if (spy.getCall(i).args[0].path == path) {
            buster.assertions.emit("pass");
            return true;
        }
    }

    var e = new Error("Expected " + path + " to be watched, but wasn't\n" + 
                      spy.toString());
    e.name = "AssertionError";
    buster.assertions.emit("failure", e);
}

function watchTest(options) {
    return function (done) {
        var self = this;

        this.onWatch = function () {
            if (this.addWatch.callCount == this.expectedCount) {
                setTimeout(function () {
                    options.assert.call(self);
                    done();
                }, 10);
            }
        };

        options.act.call(this);
    };
}

function eventTest(options) {
    return watchTest({
        act: function () {
            this.callback = this.spy();

            if (options.act) {
                options.act.call(this);
            } else {
                watchTree(helper.ROOT, this.callback);
            }
        },

        assert: function () {
            this.addWatch.args[0][0].callback(options.event);
            options.assert.call(this);
        }
    });
}

buster.testCase("watchTree", {
    setUp: function () {
        fs.mkdirSync(helper.ROOT, "0755");

        helper.mktree({
            a: { a1: {}, a2: { a21: {}, a22: {}, a23: "" } },
            b: { b1: "", b2: "", b3: {}, b4: { b41: { b411: {} } } }
        });

        var self = this;
        this.onWatch = function () {};
        this.addWatch = this.spy(function () { return self.onWatch(); });
        this.close = this.spy();
        this.expectedCount = 11;

        this.stub(ino, "Inotify").returns({
            addWatch: this.addWatch,
            close: this.close
        });

        for (var prop in events) {
            ino.Inotify[prop] = events[prop];
        }
    },

    tearDown: function (done) {
        rmrf(helper.ROOT, done);
    },

    "walks tree": function () {
        this.stub(walkTree, "walkTree");

        watchTree("/home/christian");

        assert.calledOnce(walkTree.walkTree);
        assert.calledWith(walkTree.walkTree, "/home/christian");
    },

    "watches each directory": watchTest({
        act: function () {
            watchTree(helper.ROOT);
        },

        assert: function () {
            assert.equals(this.addWatch.callCount, 11);
            assertWatched(this.addWatch, helper.ROOT);
            assertWatched(this.addWatch, p("a"));
            assertWatched(this.addWatch, p("a/a1"));
            assertWatched(this.addWatch, p("a/a2"));
            assertWatched(this.addWatch, p("a/a2/a21"));
            assertWatched(this.addWatch, p("a/a2/a22"));
            assertWatched(this.addWatch, p("b"));
            assertWatched(this.addWatch, p("b/b3"));
            assertWatched(this.addWatch, p("b/b4"));
            assertWatched(this.addWatch, p("b/b4/b41"));
            assertWatched(this.addWatch, p("b/b4/b41/b411"));
        }
    }),

    "returns endable object": watchTest({
        act: function () {
            this.watcher = watchTree(helper.ROOT);
        },

        assert: function () {
            this.watcher.end();
            assert.calledOnce(this.close);
        }
    }),

    "only watches for created, modified and deleted files/dirs": watchTest({
        act: function () {
            this.expectedCount = 6;
            watchTree(helper.ROOT, { exclude: ["b"] });
        },

        assert: function () {
            assert(this.addWatch.args[0][0].watch_for & events.IN_CREATE);
            assert(this.addWatch.args[0][0].watch_for & events.IN_MODIFY);
            assert(this.addWatch.args[0][0].watch_for & events.IN_DELETE);
            refute(this.addWatch.args[0][0].watch_for & events.IN_OPEN);
        }
    }),

    "should not watch excluded directory": watchTest({
        act: function () {
            this.expectedCount = 6;
            watchTree(helper.ROOT, { exclude: ["b"] });
        },

        assert: function () {
            assert.equals(this.addWatch.callCount, 6);
            assertWatched(this.addWatch, helper.ROOT);
            assertWatched(this.addWatch, p("a"));
            assertWatched(this.addWatch, p("a/a1"));
            assertWatched(this.addWatch, p("a/a2"));
            assertWatched(this.addWatch, p("a/a2/a21"));
            assertWatched(this.addWatch, p("a/a2/a22"));
        }
    }),

    "should not exclude directories without options": watchTest({
        act: function () {
            watchTree(helper.ROOT, function () {});
        },

        assert: function () {
            assert.equals(this.addWatch.callCount, 11);
        }
    }),

    "calls callback with event": eventTest({
        event: {
            watch: 1,
            mask: events.IN_CREATE,
            cookie: 0,
            name: "buster.js"
        },

        assert: function () {
            assert.calledOnce(this.callback);
            var event = this.callback.args[0][0];
            assert.match(event, { name: path.join(helper.ROOT, "buster.js") });
            assert(event.isCreate());
            refute(event.isDirectory());
        }
    }),

    "calls callback with directory event": eventTest({
        event: {
            watch: 1,
            mask: events.IN_DELETE | events.IN_ISDIR,
            cookie: 0,
            name: "buster.js"
        },

        assert: function () {
            var event = this.callback.args[0][0];
            assert(event.isDelete());
            assert(event.isDirectory());
        }
    }),

    "calls callback with modify event": eventTest({
        event: {
            watch: 1,
            mask: events.IN_MODIFY,
            cookie: 0,
            name: "buster.js"
        },

        assert: function () {
            assert(this.callback.args[0][0].isModify());
        }
    }),

    "should not call callback with excluded file": eventTest({
        act: function () {
            watchTree(helper.ROOT, { exclude: ["#"] }, this.callback);
        },

        event: {
            watch: 1,
            mask: events.IN_DELETE | events.IN_ISDIR,
            cookie: 0,
            name: ".#buster.js"
        },

        assert: function () {
            refute.called(this.callback);
        }
    }),

    "automatically watches new diretories": watchTest({
        act: function () {
            watchTree(helper.ROOT);
        },

        assert: function () {
            var callCount = this.addWatch.callCount;

            this.addWatch.args[1][0].callback({
                watch: 1,
                mask: events.IN_CREATE | events.IN_ISDIR,
                cookie: 0,
                name: "newone"
            });

            assert.equals(this.addWatch.callCount, callCount + 1);
            assertWatched(this.addWatch, this.addWatch.args[1][0].path + "/newone");
        }
    })
});
