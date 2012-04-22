var buster = require("buster");
var helper = require("./helper");
var fs = require("fs");
var rmrf = require("rimraf");
var path = require("path");

var treeWatcher = require("../lib/tree-watcher");

function p(name) {
    return path.join(helper.ROOT, name);
}

function rootTest(options) {
    return function (done) {
        this.watcher.on(options.event, this.listener);

        options.action.call(this);

        this.triggerWatch(helper.ROOT).then(done(function () {
            assert.calledOnce(this.listener);
        }.bind(this)));
    };
}

buster.testCase('treeWatcher', {
    setUp: function (done) {
        fs.mkdirSync(helper.ROOT, "0755");
        helper.mktree({
            subdir: { "nested.txt": "" },
            deleteme: {},
            ignored: {},
            "exists.txt": ""
        });

        this.stub(fs, "watch");
        this.triggerWatch = function (file) {
            return fs.watch.withArgs(file).args[0][1]();
        };

        this.listener = this.spy();

        this.watcher = treeWatcher.create(helper.ROOT, ["ignored"]);
        this.watcher.init().then(done);
    },

    tearDown: function (done) {
        rmrf(helper.ROOT, done);
    },

    "emits 'file:change'": function () {
        this.watcher.on("file:change", this.listener);

        fs.watch.withArgs(p("exists.txt")).yield("change");

        assert.calledOnce(this.listener);
    },

    "emits 'file:change' for nested files": function () {
        this.watcher.on("file:change", this.listener);

        fs.watch.withArgs(p("subdir/nested.txt")).yield("change");

        assert.calledOnce(this.listener);
    },

    "emits 'file:create'": rootTest({
        event: "file:create",
        action: function () {
            fs.writeFileSync(p("new.txt"), "stuff");
        }
    }),

    "emits 'file:delete'": rootTest({
        event: "file:delete",
        action: function () {
            fs.unlinkSync(p("exists.txt"));
        }
    }),

    "emits 'dir:create'": rootTest({
        event: "dir:create",
        action: function () {
            helper.mktree({ newone: {} });
        }
    }),

    "emits 'dir:delete'": rootTest({
        event: "dir:delete",
        action: function () {
            fs.rmdirSync(p("deleteme"));
        }
    }),

    "watches new files": function (done) {
        var spy = this.spy();
        this.watcher.on("file:change", spy);

        fs.writeFileSync(p("new.txt"), "stuff");
        this.triggerWatch(helper.ROOT).then(done(function () {
            fs.watch.withArgs(p("new.txt")).yield("change");
            assert.calledOnce(spy);
        }));
    }
});
