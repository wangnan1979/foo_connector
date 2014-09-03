/**
 * Created with JetBrains WebStorm.
 * User: wangnan
 * Date: 14-7-23
 * Time: 下午12:59
 * To change this template use File | Settings | File Templates.
 */
var fs = require('fs');
var msgRoute = require('./msgRoute.json');

module.exports.initContext = function() {
  var msgArray = msgRoute.messageArray;
  global.fooConf = { messageArray:msgArray, messageMap:{}, routeMap:{} };
  for(var i in msgArray) {
    global.fooConf.messageMap[msgArray[i].messageId] = msgArray[i].route;
    global.fooConf.routeMap[msgArray[i].route] =  msgArray[i].messageId;
  }
  console.log(global.fooConf);
}

module.exports.initContext();