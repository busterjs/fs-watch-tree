var buster = require("buster");
var assert = buster.assert;
var rmrf = require("rimraf");
var path = require("path");
var fs = require("fs");
var fsu = require("../lib/watch-tree");
var ROOT = path.join(__dirname, "fixtures");

function mktree(tree, root) {
    root = root || ROOT;
    var file;

    for (var prop in tree) {
        file = path.join(root, prop);

        if (typeof tree[prop] == "object") {
            fs.mkdirSync(file, "0755");
            mktree(tree[prop], file);
        } else {
            fs.writeFileSync(file, tree[prop], "utf-8");
        }
    }

    return ROOT;
}

function walkTreeTest(options) {
    return function (done) {
        var root = mktree(options.tree);

        var callback = this.spy(function () {
            if (callback.callCount != options.expected.length) return;
            setTimeout(verify, 10);
        });

        function verify() {
            assert.equals(callback.callCount, options.expected.length);

            options.expected.forEach(function (dir) {
                assert.calledWith(callback, null, root + dir);
            });

            done();
        }

        if (options.exclude) {
            fsu.walkTree(root, { exclude: options.exclude }, callback);
        } else {
            fsu.walkTree(root, callback);
        }
    };
}

buster.testCase("Walk tree", {
    setUp: function () {
        fs.mkdirSync(ROOT, "0755");
    },

    tearDown: function (done) {
        rmrf(ROOT, done);
    },

    "should yield all directories to callback": walkTreeTest({
        expected: ["/projects", "/documents", "/music"],
        tree: {
            projects: {},
            documents: {},
            music: {}
        }
    }),

    "should not yield files to callback": walkTreeTest({
        expected: ["/projects", "/documents"],
        tree: {
            projects: {},
            music: "This is a text file",
            documents: {}
        }
    }),

    "should not yield excluded directories to callback": walkTreeTest({
        expected: ["/projects", "/documents"],
        exclude: [ROOT + "/music"],
        tree: {
            projects: {},
            music: {},
            documents: {}
        }
    }),

    "should not yield excluded directories by regexp to callback": walkTreeTest({
        expected: ["/projects", "/documents"],
        exclude: ["music"],
        tree: {
            projects: {},
            music: {},
            documents: {}
        }
    }),

    "should yield recursive directories to callback": walkTreeTest({
        expected: ["/a", "/a/a1", "/a/a2", "/a/a2/a21", "/a/a2/a22",
                   "/b", "/b/b3", "/b/b4", "/b/b4/b41", "/b/b4/b41/b411"],
        tree: {
            a: { a1: {}, a2: { a21: {}, a22: {}, a23: "" } },
            b: { b1: "", b2: "", b3: {}, b4: { b41: { b411: {} } } }
        }
    }),

    "should not recurse into excluded directories": walkTreeTest({
        expected: ["/a", "/a/a1", "/a/a2", "/a/a2/a22",
                   "/b", "/b/b3"],
        exclude: ["b4", "a21"],
        tree: {
            a: { a1: {}, a2: { a21: {}, a22: {}, a23: "" } },
            b: { b1: "", b2: "", b3: {}, b4: { b41: { b411: {} } } }
        }
    }),

    "should yield readdir error to callback": function () {
        this.stub(fs, "readdir");
        var callback = this.spy();

        fsu.walkTree(ROOT, callback);
        fs.readdir.args[0][1]({ message: "Oops" });

        assert.calledWith(callback, { message: "Oops" });
    },

    "should yield stat error to callback": function (done) {
        var root = mktree({ "a": {} });
        this.stub(fs, "stat").yields({ message: "Oops" });

        var callback = this.spy(function (err) {
            assert.equals(err, { message: "Oops" });
            done();
        });

        fsu.walkTree(root, callback);
    }
});
