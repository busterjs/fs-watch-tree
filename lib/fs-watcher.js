/*
 * Todo:
 *
 * - keeps track of which files are already watched, and does not watch them
 *   again. Instead, it updates the old object with the new information.
 *
 * - takes a file in the form { name, ino } where ino is a unique identifier.
 */

var fs = require("fs");

function close(o) { o.close(); }

module.exports = {
    create: function () {
        var instance = Object.create(this);
        instance.watching = [];
        return instance;
    },

    watch: function (file, callback) {
        this.watching.push(fs.watch(file.name, function (event) {
            return callback(event, file);
        }));
    },

    end: function () {
        this.watching.forEach(close);
    }
};