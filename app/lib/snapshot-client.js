var config = require('../config');
var messenger = require('messenger');
var redisClient = require('./redis-client');

var RES_CODE = {
	OK: 0,
	ERROR: 1,
	TIMEOUT: 2,
	NO_SERVICE: 3,
	URL_REQUIRED: 4
};

module.exports = {
	_client: null,

	_getRedisKey: function(basePath, url) {
		return encodeURIComponent((basePath + '/' + url).replace(/\/+/g, '\/').replace(/^\/+/g, '')).replace(/%/g, '');
	},

	_getStoragePath: function(basePath, url) {
		return (basePath + '/' + encodeURIComponent(url)).replace(/\/+/g, '\/').replace(/^\/+/g, '').replace(/%/g, '');
	},

	_request: function(task, callback, redisKey, maxAge) {
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

	connect: function() {
		if(this._client) {
			return;
		}
		this._client = messenger.createSpeaker(config.snapshotServer);
		console.log('Connect to snapshot server ' + config.snapshotServer);
	},

	request: function(basePath, task, callback, opt) {
		var that = this;
		if(!task.url) {
			return callback({code: RES_CODE.URL_REQUIRED});
		}
		basePath = encodeURIComponent(basePath || '').split('.').join('/');
		opt = opt || {};
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
						that._request(task, callback, redisKey, opt.maxAge);
					}
				} else {
					that._request(task, callback, redisKey, opt.maxAge);
				}
			});
		} else {
			this._request(task, callback, redisKey, opt.maxAge);
		}
	}
};
