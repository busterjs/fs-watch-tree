module.exports = process.platform === "linux" || process.platform === "darwin" ?
         require("./watch-tree-unix") :
         require("./watch-tree-generic");
