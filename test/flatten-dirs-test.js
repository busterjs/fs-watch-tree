var buster = require("buster");
var path = require("path");
var fs = require("fs");
var rmrf = require("rimraf");
var helper = require("./helper");

var flattenDirs = require("../lib/flatten-dirs");

function p(name) {
    return path.join(helper.ROOT, name);
}

function flattenDirsTest(options) {
    return function (done) {
        if (options.tree) { helper.mktree(options.tree); }

        this.flattenDirs(
            helper.ROOT,
            options.excludes || [],
            done(options.asserts)
        );
    };
}

buster.testCase('flattenDirs', {
    setUp: function () {
        fs.mkdirSync(helper.ROOT, "0755");
        this.flattenDirs = flattenDirs;
    },

    tearDown: function (done) {
        rmrf(helper.ROOT, done);
    },

    "includes root in result": flattenDirsTest({
        asserts: function (err, dirs) {
            assert.equals(dirs.length, 1);
            assert.equals(dirs[0].name, helper.ROOT);
        }
    }),

    "includes statted files with directory": flattenDirsTest({
        tree: { "todo.txt": "finish it" },

        asserts: function (err, dirs) {
            assert.match(dirs[0].files, [
                { name: p("todo.txt") }
            ]);
        }
    }),

    "skips excluded files": flattenDirsTest({
        excludes: ["#"],
        tree: { ".#todo.txt": "" },

        asserts: function (err, dirs) {
            assert.equals(dirs[0].files.length, 0);
        }
    }),

    "finds all directories including root": flattenDirsTest({
        tree: {
            a: { a1: {}, a2: { a21: {}, a22: {}, a23: "" } },
            b: { b1: "", b2: "", b3: {}, b4: { b41: { b411: {} } } }
        },

        asserts: function (err, dirs) {
            assert.equals(dirs.length, 11);
        }
    }),

    "skips excluded directories": flattenDirsTest({
        excludes: ["node_modules"],

        tree: {
            node_modules: {},
            lib: {}
        },

        asserts: function (err, dirs) {
            assert.equals(dirs.length, 2);
            assert.match(dirs[1].name, /lib$/);
        }
    })
});
