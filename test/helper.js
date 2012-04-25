var when = require("when");
var path = require("path");
var fs = require("fs");

module.exports = {
    ROOT: path.join(__dirname, "fixtures"),

    mktree: function mktree(tree, root) {
        root = root || module.exports.ROOT;
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

        return module.exports.ROOT;
    },

    mktreeAsync: function mktreeAsync(tree, root) {
        root = root || module.exports.ROOT;
        var file, d;
        var promises = [];

        for (var prop in tree) {
            d = when.defer();
            file = path.join(root, prop);

            promises.push(d.promise);

            if (typeof tree[prop] == "object") {
                fs.mkdir(file, "0755", function (prop, file, d) {
                    mktreeAsync(tree[prop], file).then(d.resolve);
                }.bind(this, prop, file, d));
            } else {
                fs.writeFile(file, tree[prop], "utf-8", d.resolve);
            }
        }

        return when.all(promises);
    }
};
