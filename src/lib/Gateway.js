'use strict';

const io = require('socket.io-client');

const Channel = require('./Channel');
const EventInterface = require('./EventInterface');


class Gateway extends EventInterface {

  constructor () {
    super();
    this.channels = [];
    this.token = '';
    this.host = '';
  }

  getChannelDelegate (name, options, context) {
    if (!this.channels[name]) this.channels[name] = new Channel(name, this);
    return this.channels[name].getDelegate(options, context);
  }

  clear (context) {
    this.disconnect();
    this.channels.forEach(channel => channel.clear(context));
  }

  disconnect () {
    if (this.socket) this.socket.disconnect();
    this.socket = null;
  }

  connect () {
    this.disconnect();
    this.socket = io(this.host, {
      forceNew: true,
      query: 'token=' + (this.token || ''),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 20000,
      timeout: 20000,
      reconnectionAttempts: Infinity
    });
    this.socket.on('message', message => {
      this.receive(message);
    });
    this.socket.on('connect', () => {
      this.events.trigger('online');
    });
    this.socket.on('connect_error', () =>{
      this.events.trigger('offline');
    });
    this.socket.on('error', error => {
      this.events.trigger('error', error);
    });
  }

  receive (message) {
    if (!message) return;
    if (!this.channels[message.channel]) return;
    this.channels[message.channel].receive(message);
  }

  send (message) {
    return this.socket.emit('message', message);
  }

}


module.exports = Gateway;
