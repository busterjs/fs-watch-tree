var path = require("path");
var fs = require("fs");

module.exports = {
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
    }
};
