var buster = require("buster");
var fs = require("fs");
var rmrf = require("rimraf");
var path = require("path");

var helper = require("./helper");
var osWatch = require("./os-watch-helper");

var treeWatcher = require("../lib/tree-watcher");

function p(name) {
    return path.join(helper.ROOT, name);
}

function rootTest() {}

function eventTest(options) {
    return function (done) {
        var spy = this.spy();
        this.watcher.on(options.event, spy);

        options.action.call(this).then(done(function () {
            assert.calledOnce(spy);
        }));
    };
}

buster.testCase('tree-watcher', {
    setUp: function (done) {
        fs.mkdirSync(helper.ROOT, "0755");
        helper.mktree({
            subdir: { "nested.txt": "", "ignored.txt": "" },
            deleteme: {},
            ignored: {},
            "exists.txt": ""
        });

        this.os = osWatch.on(this, "osx");

        this.listener = this.spy();

        this.watcher = treeWatcher.create(helper.ROOT, ["ignored"]);
        this.watcher.init().then(done);
    },

    tearDown: function (done) {
        rmrf(helper.ROOT, done);
    },

    "//watches files and directories that aren't excluded": function () {
        assert.called(fs.watch.withArgs(helper.ROOT));
        assert.called(fs.watch.withArgs(p("subdir")));
        assert.called(fs.watch.withArgs(p("subdir/nested.txt")));
        assert.called(fs.watch.withArgs(p("deleteme")));
        assert.called(fs.watch.withArgs(p("exists.txt")));

        refute.called(fs.watch.withArgs(p("subdir/ignored.txt")));
        refute.called(fs.watch.withArgs(p("ignored")));

        assert.equals(fs.watch.callCount, 5);
    },

    "//close watch when deleting": function (done) {
        fs.unlinkSync(p("exists.txt"));

        this.triggerWatch(helper.ROOT).then(done(function () {
            assert.calledOnce(this.closeWatch);
        }.bind(this)));
    },

    "//end closes all the watches": function () {
        this.watcher.end();
        assert.equals(this.closeWatch.callCount, 5);
    },

    "emits 'file:change'": eventTest({
        event: "file:change",
        action: function () {
            return this.os.change(p("exists.txt"));
        }
    }),

    "emits 'file:change' for nested files": eventTest({
        event: "file:change",
        action: function () {
            return this.os.change(p("subdir/nested.txt"));
        }
    }),

    "emits 'file:create'": eventTest({
        event: "file:create",
        action: function () {
            return this.os.create(p("spanking-new.txt"));
        }
    }),

    "emits 'file:delete'": eventTest({
        event: "file:delete",
        action: function () {
            return this.os.rm(p("exists.txt"));
        }
    }),

    "emits 'dir:create'": eventTest({
        event: "dir:create",
        action: function () {
            return this.os.mkdir(p("newone"));
        }
    }),

    "emits 'dir:delete'": eventTest({
        event: "dir:delete",
        action: function () {
            return this.os.rmdir(p("deleteme"));
        }
    }),

    "//watches new files": function (done) {
        var spy = this.spy();
        this.watcher.on("file:change", spy);

        fs.writeFileSync(p("new.txt"), "stuff");
        this.triggerWatch(helper.ROOT).then(done(function () {
            fs.watch.withArgs(p("new.txt")).yield("change");
            assert.calledOnce(spy);
        }));
    }
});
