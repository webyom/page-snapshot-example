var cluster = require('cluster');

if(cluster.isMaster) {
	var config = require('./app/config');
	var argv = config.getArgv();

	if(argv.h) {
		console.log(config.argHelp());
		process.exit(0);
	}

	for(var i = 0; i < argv.workers; i++) {
		cluster.fork();
	}
	cluster.on('exit', function (worker) {
		console.log('Server ' + worker.id + ' died');
		process.nextTick(function () {
			cluster.fork();
		});
	});
} else {
	console.log('Server ' + process.pid + ' started');
	require('./app/lib/snapshot-client').connect();
	require('./app/lib/redis-client').connect();
	require('./app/server');
}