/*
 * - yields a list of all directories in root
 * - each directory has a name and an array of statted files
 *
 * - takes an instance of fsFiltered to use for statting files
 *
 * Usage:
 *
 *     flattenDirs("/root", fsFiltered, function (err, dirs) {
 *         // dirs is array of { name: "", files: [...] }
 *     };
 *
 */

var async = require("./async");

function isDir(file) { return file.isDirectory(); }
function name(file) { return file.name; }
function concat(a, b) { return a.concat(b); }

var flattenDirs = function (root, fs, finalCallback) {
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