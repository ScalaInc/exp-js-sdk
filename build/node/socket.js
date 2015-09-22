'use strict';

var io = require('socket.io-client');
var utilities = require('./utilities');

var log = new utilities.Logger({ name: 'Socket' });

var socket = null;

var events = new utilities.EventNode();

var send = function send(message) {
  if (!socket) return null;
  log.trace('Sending message', { message: message });
  return socket.emit('message', message);
};

var connect = function connect(options) {
  log.debug('Connecting.', options);
  if (socket) {
    socket.close();
    socket = null;
  }
  socket = io(options.host, {
    forceNew: true,
    query: 'token=' + options.token,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 20000,
    timeout: 20000,
    reconnectionAttempts: Infinity
  });
  socket.on('message', function (message) {
    log.trace('Receiving message', message);
    return events.trigger('message', message);
  });
  socket.on('connect', function () {
    log.debug('Connected');
    return events.trigger('online');
  });
  socket.on('error', function (error) {
    log.error(error);
  });
  socket.on('connect_error', function () {
    log.debug('Disconnected');
    return events.trigger('offline');
  });
};

module.exports.connect = connect;
module.exports.send = send;
module.exports.events = events;