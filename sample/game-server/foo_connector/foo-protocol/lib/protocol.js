(function (exports, ByteArray, globalProtocol) {
  var Protocol = exports;

  var PKG_HEAD_BYTES = 4;
  var MSG_FLAG_BYTES = 1;
  var MSG_ROUTE_CODE_BYTES = 2;
  var MSG_ID_MAX_BYTES = 5;
  var MSG_ROUTE_LEN_BYTES = 1;

  var MSG_ROUTE_CODE_MAX = 0xffff;

  var MSG_COMPRESS_ROUTE_MASK = 0x1;
  var MSG_TYPE_MASK = 0x7;

  var Package = Protocol.Package = {};
  var Message = Protocol.Message = {};

  Package.TYPE_HANDSHAKE = 1;
  Package.TYPE_HANDSHAKE_ACK = 2;
  Package.TYPE_HEARTBEAT = 3;
  Package.TYPE_DATA = 4;
  Package.TYPE_KICK = 5;

  Message.TYPE_REQUEST = 0;
  Message.TYPE_NOTIFY = 1;
  Message.TYPE_RESPONSE = 2;
  Message.TYPE_PUSH = 3;

  Protocol.HEAD_SIZE = 4;
  /**
   * Parse head to caculate body size.
   * Format as below:
   * Head: 4byte.
   * 31~29bit: Message type (0~3),
   * 28~20bit: Message ID (0~511),
   * 19~0bit: body length (0~1M)
   * 后期可以为了效率把3个函数合并成一个，一次返回多个结果。
   */
  Protocol.bodyLength = function (headBuffer) {
    var len = 0;
    var head = headBuffer.readUInt32BE(0);
    len = head & 0xFFFFF;
    return len;
  };

  Protocol.messageId = function (headBuffer) {
    var msgId = 0;
    var head = headBuffer.readUInt32BE(0);
    msgId = (head >>> 20) & 0x1FF;
    return msgId;
  };

  Protocol.messageType = function(headBuffer) {
    var msgType = 0;
    var head = headBuffer.readUInt32BE(0);
    msgType = head >>> 29;
    return msgType;
  }

  Protocol.messageHead = function (msgId, type, bodyLength) {
    if(msgId<0 || msgId>511) { throw new Error('message id(%d) scope error.',msgId);};
    if(type<0 || type>3) { throw new Error('message type(%d) scope error.',type); };
    if(bodyLength<0 || bodyLength>1024*1024) {
      throw new Error('message body length=%d error',bodyLength);
    };
    var head = (type<<29 | msgId<<20 | bodyLength) >>> 0;
    return head;
  }

  var requestId = 1;
  /**
   * pomele client encode
   * id message id;
   * route message route
   * msg message body
   * socketio current support string
   */
  Protocol.strencode = function(str) {
    var byteArray = new ByteArray(str.length * 3);
    var offset = 0;
    for(var i = 0; i < str.length; i++){
      var charCode = str.charCodeAt(i);
      var codes = null;
      if(charCode <= 0x7f){
        codes = [charCode];
      }else if(charCode <= 0x7ff){
        codes = [0xc0|(charCode>>6), 0x80|(charCode & 0x3f)];
      }else{
        codes = [0xe0|(charCode>>12), 0x80|((charCode & 0xfc0)>>6), 0x80|(charCode & 0x3f)];
      }
      for(var j = 0; j < codes.length; j++){
        byteArray[offset] = codes[j];
        ++offset;
      }
    }
    var _buffer = new ByteArray(offset);
    copyArray(_buffer, 0, byteArray, 0, offset);
    return _buffer;
  };

  /**
   * client decode
   * msg String data
   * return Message Object
   */
  Protocol.strdecode = function(buffer) {
    var bytes = new ByteArray(buffer);
    var array = [];
    var offset = 0;
    var charCode = 0;
    var end = bytes.length;
    while(offset < end){
      if(bytes[offset] < 128){
        charCode = bytes[offset];
        offset += 1;
      }else if(bytes[offset] < 224){
        charCode = ((bytes[offset] & 0x3f)<<6) + (bytes[offset+1] & 0x3f);
        offset += 2;
      }else{
        charCode = ((bytes[offset] & 0x0f)<<12) + ((bytes[offset+1] & 0x3f)<<6) + (bytes[offset+2] & 0x3f);
        offset += 3;
      }
      array.push(charCode);
    }
    return String.fromCharCode.apply(null, array);
  };

  /**
   * Message protocol encode.
   *
   * Foo message format:
   * +-------+-------------+------------------+
   * | msgId | body length |       body       |
   * +-------+-------------+------------------+
   * |       head          |
   * +---------------------+
   * Head: 4bytes
   *      5 - kick
   * 31~29bit: Message type (0~3),
   * 28~20bit: Message ID (0~511),
   * 19~0bit: body length (0~1M) big-endian
   * Body: body length bytes
   *
   * @param  {Number}    msgId  message ID
   * @param  {ByteArray} body   body content in bytes
   * @return {ByteArray}        new byte array that contains encode result
   */
  Package.encode = function(type, body){
    var length = body ? body.length : 0;
    //var buffer = new ByteArray(PKG_HEAD_BYTES + length);
    //var index = 0;
    //buffer[index++] = type & 0xff;
    //buffer[index++] = (length >> 16) & 0xff;
    //buffer[index++] = (length >> 8) & 0xff;
    //buffer[index++] = length & 0xff;
    //if(body) {
    //  copyArray(buffer, index, body, 0, length);
    //}
    if(length<=0) {
      throw new Error('message length(%d) error.',length);
    }
    return body;
  };

  /**
   * Message protocol decode.
   * See encode for message format.
   *
   * @param  {ByteArray} buffer byte array containing message
   * @return {Object}           {msgId: message ID, buffer: body byte array}
   */
  Package.decode = function(buffer){
    //var offset = 0;
    var bytes = new ByteArray(buffer);  //可能经过测试后需要优化，不用在重新生成buffer
    //var length = 0;
    var rs = [];
    //while(offset < bytes.length) {
    //  var type = bytes[offset++];
    //  length = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0;
    //  var body = length ? new ByteArray(length) : null;
    //  copyArray(body, 0, bytes, offset, length);
    //  offset += length;
    //  rs.push({'type': type, 'body': body});
    //}
    rs.push({'type': Package.TYPE_DATA, 'body': bytes});
    return rs.length === 1 ? rs[0]: rs;
  };

  Message.Struct = function(msgId, msg) {
    return 123;
  }

  /**
   * Message protocol encode.
   *
   * @param  {Number} id            message id
   * @param  {Number} type          message type
   * @param  {Number} compressRoute whether compress route
   * @param  {Number|String} route  route code or route string
   * @param  {Buffer} msg           message body bytes
   * @return {Buffer}               encode result
   */
  Message.encode = function(reqId, type, compressRoute, route, msg){
    // caculate message max length
    //var idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0;
    var msgLen=0;// = MSG_FLAG_BYTES + idBytes;

    if(msgHasRoute(type)) {
      if(compressRoute) {
        if(typeof route !== 'number'){
          throw new Error('error flag for number route!');
        }
        //msgLen += MSG_ROUTE_CODE_BYTES;
      } else {
        msgLen += MSG_ROUTE_LEN_BYTES;
        if(route) {
          route = Protocol.strencode(route);
          if(route.length>255) {
            throw new Error('route maxlength is overflow');
          }
          //msgLen += route.length;
        }
      }
    }

    if(msg) {
      msgLen = msg.length + Protocol.HEAD_SIZE;
    }

    var buffer = new ByteArray(msgLen);
    var offset = 0;

    if(!route) {
      throw new Error('route info lose.reqId=%d',reqId);
    }

    // add flag
    //offset = encodeMsgFlag(type, compressRoute, buffer, offset);

    // add message id
    //if(msgHasId(type)) {
    //  offset = encodeMsgId(id, buffer, offset);    l
    //}

    // add route
    //if(msgHasRoute(type)) {
    //  offset = encodeMsgRoute(compressRoute, route, buffer, offset);
    //}

    // add head
    var msgId = global.fooConf.routeMap[route];
    var head = Protocol.messageHead(msgId, type, msg.length);
    offset = encodeMsgHead(head, buffer);
    // add body
    if(msg) {
      offset = encodeMsgBody(msg, buffer, offset);
    }

    return buffer;
  };

  /**
   * Message protocol decode.
   *
   * @param  {Buffer|Uint8Array} buffer message bytes
   * @return {Object}            message object
   */
  Message.decode = function(buffer) {
    var bytes =  new ByteArray(buffer); //可能经过测试后需要优化，不用在重新生成buffer
    var bytesLen = bytes.length || bytes.byteLength;
    var offset = Protocol.HEAD_SIZE;
    var reqId = 0;
    var route = null;

    // parse flag
    var flag = 0; //bytes[offset++];
    var compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
    var type = Protocol.messageType(bytes); //(flag >> 1) & MSG_TYPE_MASK;

    // parse id
    if(msgHasId(type)) {
      requestId>0x3FFFFFFF ? requestId=1 : requestId++ ;
      reqId = requestId;
    }

    // parse route
    if(global.fooConf) {
      route = global.fooConf.messageMap[Protocol.messageId(bytes)];
    } else {
      throw new Error('fooConf init fail.');
    }

    // parse body
    var bodyLen = Protocol.bodyLength(bytes);//bytesLen - offset;
    var body = new ByteArray(bodyLen);

    copyArray(body, 0, bytes, offset, bodyLen);

    return {'id': reqId, 'type': type, 'compressRoute': compressRoute,
            'route': route, 'body': body};
  };

  var copyArray = function(dest, doffset, src, soffset, length) {
    if('function' === typeof src.copy) {
      // Buffer
      src.copy(dest, doffset, soffset, soffset + length);
    } else {
      // Uint8Array
      for(var index=0; index<length; index++){
        dest[doffset++] = src[soffset++];
      }
    }
  };

  var msgHasId = function(type) {
    return type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE;
  };

  var msgHasRoute = function(type) {
    return type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY ||
           type === Message.TYPE_PUSH;
  };

  var caculateMsgIdBytes = function(id) {
    var len = 0;
    do {
      len += 1;
      id >>= 7;
    } while(id > 0);
    return len;
  };

  var encodeMsgFlag = function(type, compressRoute, buffer, offset) {
    if(type !== Message.TYPE_REQUEST && type !== Message.TYPE_NOTIFY &&
       type !== Message.TYPE_RESPONSE && type !== Message.TYPE_PUSH) {
      throw new Error('unkonw message type: ' + type);
    }

    buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);

    return offset + MSG_FLAG_BYTES;
  };

  var encodeMsgId = function(id, buffer, offset) {
    do{
      var tmp = id % 128;
      var next = Math.floor(id/128);

      if(next !== 0){
        tmp = tmp + 128;
      }
      buffer[offset++] = tmp;

      id = next;
    } while(id !== 0);

    return offset;
  };

  var encodeMsgRoute = function(compressRoute, route, buffer, offset) {
    if (compressRoute) {
      if(route > MSG_ROUTE_CODE_MAX){
        throw new Error('route number is overflow');
      }

      buffer[offset++] = (route >> 8) & 0xff;
      buffer[offset++] = route & 0xff;
    } else {
      if(route) {
        buffer[offset++] = route.length & 0xff;
        copyArray(buffer, offset, route, 0, route.length);
        offset += route.length;
      } else {
        buffer[offset++] = 0;
      }
    }

    return offset;
  };

  var encodeMsgHead = function(head, buffer) {
    //var headBuf = new Buffer(Protocol.HEAD_SIZE);
    //headBuf.writeInt32BE(head);
    //copyArray(buffer, 0, headBuf, 0, Protocol.HEAD_SIZE);
    buffer[0]= head>>>24;
    buffer[1]=(head>>>16) & 0xFF;
    buffer[2]=(head>>>8) & 0xFF;
    buffer[3]= head & 0xFF;
    return Protocol.HEAD_SIZE;
  }

  var encodeMsgBody = function(msg, buffer, offset) {
    copyArray(buffer, offset, msg, 0, msg.length);
    return offset + msg.length;
  };

  module.exports = Protocol;
  if(typeof(window) != "undefined") {
    window.Protocol = Protocol;
  }
})(typeof(window)=="undefined" ? module.exports : (this.Protocol = {}),typeof(window)=="undefined"  ? Buffer : Uint8Array, this);
