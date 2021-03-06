var when = require("when");
var path = require("path");
var fs = require("fs");

// Please jslint...
var mknode;

function mktree(tree, root) {
    root = root || module.exports.ROOT;
    var file, d, prop;
    var promises = [];

    for (prop in tree) {
        d = when.defer();
        promises.push(d.promise);
        mknode(tree, prop, path.join(root, prop), d.resolve);
    }

    return when.all(promises);
}

function mknode(tree, prop, file, callback) {
    if (typeof tree[prop] === "object") {
        fs.mkdir(file, "0755", function () {
            mktree(tree[prop], file).then(callback);
        });
    } else {
        fs.writeFile(file, tree[prop], "utf-8", callback);
    }
}

module.exports = {
    ROOT: path.join(__dirname, ".#fixtures"),

    mktreeSync: function mktreeSync(tree, root) {
        root = root || module.exports.ROOT;
        var file, prop;

        for (prop in tree) {
            file = path.join(root, prop);

            if (typeof tree[prop] === "object") {
                fs.mkdirSync(file, "0755");
                mktreeSync(tree[prop], file);
            } else {
                fs.writeFileSync(file, tree[prop], "utf-8");
            }
        }

        return module.exports.ROOT;
    },

    mktree: mktree
};
