var buster = require("buster");
var fs = require("fs");

var fsWatcher = require("../lib/fs-watcher");

buster.testCase('fs-watcher', {
    setUp: function () {
        this.watch = { close: this.spy() };
        this.stub(fs, "watch").returns(this.watch);
        this.watcher = fsWatcher.create();
    },

    "watches files": function () {
        this.watcher.watch({ name: "file.txt" }, this.spy());
        assert.calledOnceWith(fs.watch, "file.txt");
    },

    "calls back when file changes": function () {
        var spy = this.spy();
        var file = { name: "file.txt" };
        this.watcher.watch(file, spy);

        fs.watch.yield("change");

        assert.calledOnceWith(spy, "change", file);
    },

    "closes watches": function () {
        this.watcher.watch({ name: "file1.txt" }, this.spy());
        this.watcher.watch({ name: "file2.txt" }, this.spy());
        this.watcher.end();

        assert.calledTwice(this.watch.close);
    }
});
