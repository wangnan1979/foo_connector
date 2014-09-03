/**
 * Created with JetBrains WebStorm.
 * User: wangnan
 * Date: 14-7-18
 * Time: 上午11:16
 * To change this template use File | Settings | File Templates.
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var FooSocket = require('./foosocket');
var Switcher = require('./foo/switcher');
//var Handshake = require('./commands/handshake');
//var Heartbeat = require('./commands/heartbeat');
//var Kick = require('./commands/kick');
var coder = require('./common/coder');
//var Tlssocket = require('./hybrid/tlssocket');
var Message = require('./foo-protocol').Message;
//var Constants = require('../util/constants');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

var curId = 1;

/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Develper can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
var Connector = function(port, host, opts) {
  if (!(this instanceof Connector)) {
    return new Connector(port, host, opts);
  }

  EventEmitter.call(this);

  this.opts = opts || {};
  this.port = port;
  this.host = host;
  //this.useDict = opts.useDict;
  //this.useProtobuf = opts.useProtobuf;
  //this.handshake = new Handshake(opts);
  //this.heartbeat = new Heartbeat(opts);
  this.distinctHost = opts.distinctHost;
  //this.ssl = opts.ssl;

  this.switcher = null;
};

util.inherits(Connector, EventEmitter);

module.exports = Connector;

/**
 * Start connector to listen the specified port
 */
Connector.prototype.start = function(cb) {
  var app = require('pomelo').app;
  var self = this;

  var gensocket = function(socket) {
    var foosocket = new FooSocket(curId++, socket);
    //hybridsocket.on('handshake', self.handshake.handle.bind(self.handshake, hybridsocket));
    //hybridsocket.on('heartbeat', self.heartbeat.handle.bind(self.heartbeat, hybridsocket));
    //foosocket.on('disconnect', self.heartbeat.clear.bind(self.heartbeat, hybridsocket.id));
    //foosocket.on('closing', Kick.handle.bind(null, hybridsocket));
    self.emit('connection', foosocket);
  };

  if(!this.ssl) {
    this.tcpServer = net.createServer();
    this.switcher = new Switcher(this.tcpServer, self.opts);

    this.connector = app.components.__connector__.connector;
    //this.dictionary = app.components.__dictionary__;
    this.protobuf = app.components.__protobuf__;
    this.decodeIO_protobuf = app.components.__decodeIO__protobuf__;

    this.switcher.on('connection', function(socket) {
      gensocket(socket);
    });

    if(!!this.distinctHost) {
      this.tcpServer.listen(this.port, this.host);
    } else {
      this.tcpServer.listen(this.port);
    }
  } else {
    //后期可能会添加对此类型socket支持
    //this.tlssocket = new Tlssocket(this.port, this.opts);
    //this.tlssocket.on('connection', function(socket) {
    //  gensocket(socket);
    //});
  }
  process.nextTick(cb);
};

Connector.prototype.stop = function(force, cb) {
  this.switcher.close();
  this.tcpServer.close();

  process.nextTick(cb);
};

Connector.decode = Connector.prototype.decode = coder.decode;

Connector.encode = Connector.prototype.encode = coder.encode;