var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var FooConnector = require('./foo_connector/fooconnector');
var FooConf = require('./foo_connector/initContext');
/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'chatofpomelo-websocket');

// app configuration
app.configure('production|development', 'connector', function(){
	app.set('connectorConfig',
		{
			connector : FooConnector//pomelo.connectors.hybridconnector,
			//heartbeat : 300000,
			//useDict : true,
			//useProtobuf : true
		});
  FooConf.initContext();
});

app.configure('production|development', 'gate', function(){
	app.set('connectorConfig',
		{
			connector : pomelo.connectors.hybridconnector,
			useProtobuf : true
		});
});

// app configure
app.configure('production|development', function() {
	// route configures
	app.route('chat', routeUtil.chat);

	// filter configures
	app.filter(pomelo.timeout());
});

// start app
app.start();

process.on('uncaughtException', function(err) {
	console.error(' Caught exception: ' + err.stack);
});