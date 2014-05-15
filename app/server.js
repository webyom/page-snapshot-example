var http = require('http');
var express = require('express');
var config = require('./config');
var middlewares = require('./middlewares');
var routes = require('./routes');

var app = express();

app.configure(function() {
	app.set('port', config.port);
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.cookieParser());
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());
	app.use(app.router);
});

app.configure('development', function() {
	app.use(express.errorHandler());
});

;[
	'snapshot.json'
].forEach(function(item) {
	item = item.split(' ');
	var path = item[0];
	var method = item[1] || 'get';
	var parts = path.split('.')[0].split('/');
	var handler = routes;
	var part;
	while(handler && parts.length) {
		part = parts.shift();
		if(part.indexOf(':') !== 0) {
			handler = handler[part];
		}
	}
	if(handler) {
		app[method](config.base + path, handler);
	}
});

http.createServer(app).listen(config.port, function() {
	console.log('Server listening on port ' + config.port);
});
