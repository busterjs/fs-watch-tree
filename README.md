# watch-tree - Recursive directory watch (for Linux) #

**watch-tree** is a small tool to watch directories for changes recursively. It
uses [node-inotify](https://github.com/c4milo/node-inotify) to watch for
changes, thus only works on Linux at the moment. Help adding support for
[NodeJS-FSEvents](https://github.com/phidelta/NodeJS-FSEvents) for OSX would be
appreciated.

Note that this library is likely a temporary one, as
[Node will likely support](https://github.com/joyent/libuv/issues/68) recursive
directory watches cross-platform through **libuv** sometime soon-ish.

The API conciously does not expose any inotify internals directly in order to
ease the addition of FSEvents support down the road.

## Synopsis ##

    var watchTree = require("watch-tree");

    var watch = watchTree("/home/christian", function (event) {
        // See description of event below
    });

    watch.end(); // Release watch

    watch = watchTree("/home/christian", {
        exclude: ["node_modules", "~", "#", /^\./]
    }, function (event) {
        // Respond to change
    });

## `watchTree(dir, callback)` ##

Watches directory `dir` recursively for changes. Only a subset of the inotify
events are supported; create file/diretory, modify file/directory and delete
file/directory. Other events, such as access, is not currently supported. This
limitation is simply the result of my YAGNI approach. Other events may be added
later if necessary.

The callback is called with an `event` object. The event is described below.

## `watchTree(dir, options, callback)` ##

Watch a directory recursively, with some specific options. Currently, you can
only specify a single option:

    { exclude: [] }

The `exclude` array specifies file patterns to exclude from watches. If a
pattern matches a directory, `watch-tree` will not recurse into it. If it
matches a file, changes to that file will not trigger an event.

The excludes can be either strings or regular expressions, but are always
treated as regular expressions. That means that

    { exclude: [".git", "node_modules"] }

Will be treated the same way as:

    { exclude: [new RegExp(".git"), new RegExp("node_modules")] }

If you only want to exclude specific files, be sure to provide full
paths. `watch-tree` does not expand paths, it will resolve all paths relative to
the original directory. So this:

    watchFile(".git", function (event) { /* ... *) });

Will watch (and consider excludes for) directories like `.git/branches`. And
this:

    watchFile("/home/christian/projects/watch-tree/.git", function (event) {});

Will watch (and consider excludes for) directories like
`/home/christian/projects/watch-tree/.git`.

## `event` ##

The event object has the following properties:

### `name` ###

The full (relative) path to the file/directory that changed. As far as I know,
this will not be available with FSEvents, so it may go away.

### `isDirectory()` ###

Returns true if the cause of the change was a directory. Same challenge as
`name`.

### `isFile()` ###

Returns true if the cause of the change was a file. Same challenge as `name`.

### `wasCreated()` ###

Returns true if the cause of the event was a newly created file/directory.

### `wasDeleted()` ###

Returns true if the cause of the event was a deleted file/directory.

### `wasModified()` ###

Returns true if the cause of the event was a modified file/directory.
