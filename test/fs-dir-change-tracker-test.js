var buster = require("buster");
var changeTracker = require("../lib/fs-dir-change-tracker");
var fs = require("fs");


buster.testCase("dirChangeTracker", {
  "statFiles": {
    "yields list of statted files": function () {
      this.stub(fs, "readdir").yields(null, ["file1", "file2"]);
      this.stub(fs, "stat");
      fs.stat.withArgs("file1").yields(null, { stats: "yo" });
      fs.stat.withArgs("file2").yields(null, { stats: "ho" });

      var callback = this.spy();
      changeTracker.create("/tmp").statFiles(callback);

      assert.calledWith(fs.readdir, "/tmp");
      assert.calledOnceWith(callback, null, [
        { name: "file1", stats: "yo" },
        { name: "file2", stats: "ho" }
      ]);
    }
  },

  "poll": {
    setUp: function (done) {
      this.stub(changeTracker, "statFiles");
      changeTracker.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(0) }
      ]);
      this.tracker = changeTracker.create("/tmp");
      this.tracker.init().then(done);
    },

    "emits update for files with changed mtime": function () {
      var listener = this.spy();
      this.tracker.on("update", listener);

      this.tracker.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(1) }
      ]);
      this.tracker.poll();

      assert.calledOnceWith(listener, { name: "fresh", mtime: new Date(1) });
    },

    "emits delete for files that are missing": function () {
      var listener = this.spy();
      this.tracker.on("delete", listener);

      this.tracker.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) }
      ]);
      this.tracker.poll();

      assert.calledOnceWith(listener, { name: "fresh", mtime: new Date(0) });
    },

    "emits create for files that are brand new": function () {
      var listener = this.spy();
      this.tracker.on("create", listener);

      this.tracker.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(0) },
        { name: "spanking", mtime: new Date(1) }
      ]);
      this.tracker.poll();

      assert.calledOnceWith(listener, { name: "spanking", mtime: new Date(1) });
    },

    "keeps track of changes": function () {
      var listener = this.spy();
      this.tracker.on("update", listener);

      this.tracker.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(1) }
      ]);
      this.tracker.poll();
      this.tracker.poll();

      assert.calledOnce(listener);
    }
  }
});
