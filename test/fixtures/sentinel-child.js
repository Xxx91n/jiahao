// fixture: plant a sentinel via sentinel.begin(hook, dir) and hang (parent kills us)
require(process.argv[2]).begin(process.argv[3], process.argv[4]);
setInterval(() => {}, 1000);
