var config = require('../config');
var messenger = require('messenger');
var redisClient = require('./redis-client');

var RES_CODE = require('../res-code');

module.exports = {
	_client: null,

	_getRedisKey: function(basePath, url) {
		return ['snapshot', basePath, url].join('/').replace(/\/+/g, '\/').replace(/^\/+/g, '');
	},

	_getStoragePath: function(basePath, url) {
		return (basePath + '/' + encodeURIComponent(url)).replace(/\/+/g, '\/').replace(/^\/+/g, '').replace(/%/g, '');
	},

	_doSnapshot: function(task, callback, redisKey, maxAge) {
		this._client.request('snapshot', task, function(res) {
			if(res.status == 'success') {
				res.code = RES_CODE.OK;
			} else if(res.status == 'timeout') {
				res.code = RES_CODE.TIMEOUT;
			} else if(res.error === -1) {
				res.code = RES_CODE.NO_SERVICE;
			} else {
				res.code = RES_CODE.ERROR;
			}
			callback(res);
			if(res.code == RES_CODE.OK && redisKey) {
				maxAge = maxAge || 3600;
				redisClient.set(redisKey, JSON.stringify({
					expire: new Date().getTime() + maxAge * 1000,
					data: res.data
				}));
			}
		});
	},

	_snapshot: function(basePath, task, callback, opt) {
		basePath = encodeURIComponent(basePath || '').split('.').join('/');
		var that = this;
		var clipRect = {};
		var viewportSize = {};
		opt.clipRectLeft && (clipRect.left = opt.clipRectLeft);
		opt.clipRectTop && (clipRect.top = opt.clipRectTop);
		opt.clipRectWidth && (clipRect.width = opt.clipRectWidth);
		opt.clipRectHeight && (clipRect.height = opt.clipRectHeight);
		opt.viewportSizeWidth && (viewportSize.width = opt.viewportSizeWidth);
		opt.viewportSizeHeight && (viewportSize.height = opt.viewportSizeHeight);
		opt.clipRect = clipRect;
		opt.viewportSize = viewportSize;
		[
			'getSummary', 
			'javascriptEnabled', 
			'loadImages'
		].forEach(function(prop) {
			if(opt[prop] == 'false') {
				opt[prop] = false;
			}
		});
		[
			'format', 
			'delayRender', 
			'getSummary', 
			'javascriptEnabled', 
			'loadImages', 
			'userAgent', 
			'quality', 
			'zoomFactor', 
			'clipRect', 
			'viewportSize'
		].forEach(function(prop) {
			if(typeof task[prop] == 'undefined' && typeof opt[prop] != 'undefined') {
				task[prop] = opt[prop];
			}
		});
		task.viewportSize.width = task.viewportSize.width || 1200;
		task.viewportSize.height = task.viewportSize.height || 800;
		task.storagePath = this._getStoragePath(basePath, task.url);
		var redisKey = this._getRedisKey(basePath, task.url);
		var cache = opt.cache !== false && opt.cache != 'false';
		if(cache) {
			redisClient.get(redisKey, function(err, res) {
				if(res) {
					res = JSON.parse(res);
					if(new Date().getTime() < res.expire && res.data) {
						console.log('Got data from redis');
						callback({
							code: RES_CODE.OK,
							data: res.data
						});
					} else {
						that._doSnapshot(task, callback, redisKey, opt.maxAge);
					}
				} else {
					that._doSnapshot(task, callback, redisKey, opt.maxAge);
				}
			});
		} else {
			this._doSnapshot(task, callback, redisKey, opt.maxAge);
		}
	},

	_validate: function(task, callback) {
		this._client.request('validate', task, function(res) {
			res.data = res.data || {};
			if(res.status == 'success') {
				res.code = RES_CODE.OK;
				res.data.valid = true;
			} else if(res.status == 'fail') {
				res.code = RES_CODE.OK;
				res.data.valid = false;
			} else if(res.status == 'timeout') {
				res.code = RES_CODE.TIMEOUT;
			} else if(res.error === -1) {
				res.code = RES_CODE.NO_SERVICE;
			} else {
				res.code = RES_CODE.ERROR;
			}
			callback(res);
		});
	},

	connect: function() {
		if(this._client) {
			return;
		}
		this._client = messenger.createSpeaker(config.snapshotServer);
		console.log('Connect to snapshot server ' + config.snapshotServer);
	},

	request: function(basePath, task, callback, opt) {
		var that = this;
		opt = opt || {};
		if(!task.url) {
			return callback({code: RES_CODE.URL_REQUIRED});
		}
		if(opt.task == 'snapshot') {
			this._snapshot(basePath, task, callback, opt);
		} else if(opt.task == 'validate') {
			this._validate(task, callback);
		} else {
			return callback({code: RES_CODE.UNKNOWN_TASK});
		}
	}
};
