var _ = require('underscore');
var yargs = require('yargs');

var argv;

var config = {
	init: function() {
		var conf = require('./conf');
		argv = yargs
			.usage('Usage: $0 --port [num] --snapshot-server [str] --redis-server [str] --workers [num]')
			.alias('p', 'port').default('p', conf.defaultArgv.port).describe('p', 'Server port')
			.alias('s', 'snapshot-server').default('s', conf.defaultArgv.snapshotServer).describe('s', 'Snapshot Server host')
			.alias('r', 'redis-server').default('r', conf.defaultArgv.redisServer).describe('r', 'Redis Server host')
			.alias('w', 'workers').default('w', conf.defaultArgv.workers).describe('w', 'Server worker amount')
			.alias('h', 'help').boolean('h').describe('h', 'Help')
			.argv;
		_.extend(config, conf, argv);
		config.init = function() {};
		return config;
	},

	getArgv: function() {
		this.init();
		return argv;
	},

	argHelp: function() {
		return yargs.help();
	}
};

config.init();

module.exports = config;