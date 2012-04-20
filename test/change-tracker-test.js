var buster = require("buster");
var changeTracker = require("../lib/change-tracker");

buster.testCase("changeTracker", {
  "poll": {
    setUp: function () {
      this.statFiles = this.stub();
      this.tracker = changeTracker.create(this.statFiles, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(0) }
      ]);
    },

    "resolves promise after statting successfully": function () {
      var spy = this.spy();
      this.tracker.poll().then(spy);

      refute.called(spy);

      this.statFiles.yield(null, []);
      assert.called(spy);
    },

    "rejects promise on error": function () {
      var success = this.spy();
      var failure = this.spy();
      this.tracker.poll().then(success, failure);

      this.statFiles.yield("Gosh darn it!");
      refute.called(success);
      assert.calledOnceWith(failure, "Gosh darn it!");
    },

    "emits update for files with changed mtime": function () {
      var listener = this.spy();
      this.tracker.on("update", listener);

      this.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(1) }
      ]);
      this.tracker.poll();

      assert.calledOnceWith(listener, { name: "fresh", mtime: new Date(1) });
    },

    "emits delete for files that are missing": function () {
      var listener = this.spy();
      this.tracker.on("delete", listener);

      this.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) }
      ]);
      this.tracker.poll();

      assert.calledOnceWith(listener, { name: "fresh", mtime: new Date(0) });
    },

    "emits create for files that are brand new": function () {
      var listener = this.spy();
      this.tracker.on("create", listener);

      this.statFiles.yields(null, [
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

      this.statFiles.yields(null, [
        { name: "stale", mtime: new Date(0) },
        { name: "fresh", mtime: new Date(1) }
      ]);
      this.tracker.poll();
      this.tracker.poll();

      assert.calledOnce(listener);
    }
  }
});
