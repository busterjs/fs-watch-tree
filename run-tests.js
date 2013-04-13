var buster = require("buster");

buster.testRunner.onCreate(function (runner) {
    runner.on("suite:end", function (results) {
        if (!results.ok) {
            setTimeout(function () {
                process.exit(1);
            }, 50);
        }
    });
});

require("./test/change-tracker-test");
require("./test/fs-filtered-test");
require("./test/fs-watcher-test");
require("./test/helper");
require("./test/os-watch-helper");
require("./test/tree-watcher-test");
require("./test/walk-tree-test");
require("./test/watch-tree-unix-test");
