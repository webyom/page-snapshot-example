var config = require('../config');
var redis = require('redis');

module.exports = {
	_client: null,

	connect: function() {
		if(this._client) {
			return;
		}
		var that = this;
		var serverHost = config.redisServer.split(':');
		var client = this._client = redis.createClient(serverHost[1], serverHost[0], {
			retry_max_delay: 3000,
			auth_pass: config.redisPassword || null
		});
		console.log('Connect to redis server ' + config.redisServer);
		client.on('ready', function() {
			console.log('Redis server connection ready');
		}).on('end', function() {
			console.log('Redis server connection ended');
			that._client = null;
			that.connect();
		});
	},

	get: function(key, callback) {
		if(this._client) {
			this._client.get(key, function(err, value) {
				callback(err, value);
			});
		} else {
			callback(new Error('No redis client available!'));
		}
	},

	set: function(key, value, callback) {
		if(this._client) {
			this._client.set(key, value, function(err, value) {
				callback && callback(err, value);
			});
		} else {
			callback(new Error('No redis client available!'));
		}
	}
};
