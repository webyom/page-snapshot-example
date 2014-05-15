var snapshotClient = require('../lib/snapshot-client');

module.exports = function (req, res, next) {
	//http://127.0.0.1:3001/node/snapshot/snapshot.json?url=http%3A%2F%2Fwww.radicasys.com&zoomFactor=1&quality=80&loadImages=true&javascriptEnabled=true&getSummary=true&format=png&delayRender=0&clipRectLeft=0&clipRectTop=0&clipRectWidth=1200&clipRectHeight=800&viewportSizeWidth=1200&viewportSizeHeight=800&cache=false
	snapshotClient.request(req.query.category, {
		url: req.query.url
	}, function(msg) {
		res.json(200, msg);
	}, req.query);
};
