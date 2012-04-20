/*
 * - yields a list of all directories in root
 * - each directory has a name and an array of statted files
 * - takes a lists of patterns to exclude
 *
 * Usage:
 *
 *     flattenDirs("/root", ["exclude", "these"], function (err, dirs) {
 *         // dirs is array of { name: "", files: [...] }
 *     };
 *
 */

var fsFiltered = require("./fs-filtered");
var async = require("./async");

function isDir(file) { return file.isDirectory(); }
function name(file) { return file.name; }
function concat(a, b) { return a.concat(b); }

var flattenDirs = function (root, excludes, finalCallback) {
    var fs = fsFiltered.create(excludes);

    function recur(dir, callback) {
        fs.statFiles(dir, function (err, files) {
            if (err) { return callback(err); }

            var me = { name: dir, files: files };
            var myDirs = me.files.filter(isDir).map(name);

            async.map(recur, myDirs, function (err, dirs) {
                if (err) { return callback(err); }
                callback(null, dirs.reduce(concat, [me]));
            });
        });
    }

    recur(root, finalCallback);
};

module.exports = flattenDirs;