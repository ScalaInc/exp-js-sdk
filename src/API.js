'use strict';

const fetch = require('isomorphic-fetch');
const _ = require('lodash');


class Resource {

  constructor (document, sdk, context) {
    this._document = document;
    this._sdk = sdk;
    this._context = context;
  }

  static _getCollectionPath () {
    throw new Error('Not implemented.');
  }

  _getChannelName () {
    throw new Error('Not implemented.');
  }

  _getResourcePath () {
    throw new Error('Not implemented.');
  }

  get document () {
    return this._document || {};
  }

  save () {
    return this._sdk.api.patch(this._getResourcePath(), this.document).then(document => this._document = document);
  }

  refresh () {
    return this._sdk.api.get(this._getResourcePath()).then(document => this._document = document);
  }

  static create (document, sdk, context) {
    return sdk.api.post(this._getCollectionPath(), document).then(document => new this(document, sdk, context));
  }

  static find (params, sdk, context) {
    return sdk.api.get(this._getCollectionPath(), params).then(query => query.results.map(document => new this(document, sdk, context)));
  }

  getChannel (options) {
    return this._sdk.network.getChannel(this._getChannelName(), options, this._context);
  }

  clone (context) {
    return new this.constructor(this.document, this._sdk, context || this._context);
  }

}


class CommonResource extends Resource {

  get uuid () {
    return this.document.uuid;
  }

  get name () {
    return this.document.name;
  }

  set name (value) {
    this.document.name = value;
  }

  _getChannelName () {
    return this.uuid;
  }

  _getResourcePath () {
    return `${this.constructor._getCollectionPath()}/${this.uuid}`;
  }

  static get (uuid, sdk, context) {
    if (!uuid) return sdk.authenticator.getAuth().then(() => null);
    const path = `${this._getCollectionPath()}/${uuid}`;
    return sdk.api.get(path).then(document => new this(document, sdk, context)).catch(error => {
      if (error && error.status === 404) return null;
      throw error;
    });
  }

}


/* Devices */

class Device extends CommonResource {

  static _getCollectionPath () { return '/api/devices'; }

  static getCurrent (sdk, context) {
    return sdk.authenticator.getAuth().then(auth => {
      return this.get(auth.identity.uuid, sdk, context);
    });
  }

  getExperience () {
    return this._sdk.api.Experience.get(_.get(this.document, 'experience.uuid'), this._sdk, this.context);
  }

  getLocation () {
    return this._sdk.api.Location.get(_.get(this.document, 'location.uuid'), this._sdk, this.context);
  }

  getZones () {
    return this.getLocation().then(location => {
      if (!location) return [];
      return location.document.zones.filter(locationZoneDocument => {
        return this.document.location.zones.find(deviceZoneDocument => deviceZoneDocument.key === locationZoneDocument.key);
      }).map(document => new this._sdk.api.Zone(document, location, this._sdk, this._context));
    });
  }

}


/* Things */

class Thing extends CommonResource {

  static _getCollectionPath () { return '/api/things'; }

  getLocation () {
    return this._sdk.api.Location.get(_.get(this.document, 'location.uuid'), this._sdk, this.context);
  }

  getZones () {
    return this.getLocation().then(location => {
      if (!location) return [];
      return location.document.zones.filter(locationZoneDocument => {
        return this.document.location.zones.find(deviceZoneDocument => deviceZoneDocument.key === locationZoneDocument.key);
      }).map(document => new this._sdk.api.Zone(document, location, this._sdk, this._context));
    });
  }

}


/* Experiences */

class Experience extends CommonResource {

  static _getCollectionPath () { return '/api/experiences'; }

  static getCurrent (sdk, context) {
    return Device.getCurrent(sdk, context).then(device => {
      if (!device || !device.document.experience || !device.document.experience.uuid) return null;
      return this.get(device.document.experience.uuid, sdk, context);
    });
  }

  getDevices () {
    return this._sdk.api.Device.find({ 'experience.uuid' : this.uuid }, this._sdk, this._context);
  }

}


/* Locations */

class Location extends CommonResource {

  static _getCollectionPath () { return '/api/locations'; }

  static getCurrent (sdk, context) {
    return Device.getCurrent(sdk, context).then(device => {
      if (!device || !device.document.location || !device.document.location.uuid) return null;
      return this.get(device.document.location.uuid, sdk, context);
    });
  }

  getDevices () {
    return this._sdk.api.Device.find({ 'location.uuid': this.uuid }, this._sdk, this._context);
  }

  getThings () {
    return this._sdk.api.Thing.find({ 'location.uuid': this.uuid }, this._sdk, this._context);
  }

  getZones () {
    if (!this.document.zones) return Promise.resolve().then(() => []);
    return Promise.resolve().then(() => this.document.zones.map(document => {
      return new this._sdk.api.Zone(document, this, this._sdk, this._context);
    }));
  }

  getLayoutUrl () {
    return `${this._getResourcePath()}/layout?_rt=${this._sdk.authenticator.getAuthSync().restrictedToken}`;
  }

}



class Zone extends Resource {

  constructor (document, location, sdk, context) {
    super(document, sdk, context);
    this._location = location;
  }

  static getCurrent (sdk, context) {
    return Device.getCurrent(sdk, context).then(device => {
      if (!device) return [];
      return device.getZones()
    });
  }

  get key () {
    return this.document.key;
  }

  get name () {
    return this.document.name;
  }

  set name (value) {
    this.document.name = value;
  }

  save () {
    return this._location.save();
  }

  refresh () {
    return this._location.refresh().then(() => {
      this._document = (this._location.document.zones || []).find(document => document.key === this.key);
    });
  }

  getLocation () {
    return Promise.resolve(this._location);
  }

  getDevices () {
    return this._sdk.api.Device.find({ 'location.uuid' : this._location.uuid, 'location.zones.key': this.key }, this._sdk, this._context);
  }

  getThings () {
    return this._sdk.api.Thing.find({ 'location.uuid' : this._location.document.uuid, 'location.zones.key': this.document.key }, this._sdk, this._context);
  }

  _getChannelName () {
    return `${this._location.uuid}:zone:${this.key}`;
  }

  clone (context) {
    return new this.constructor(this.document, this._location, this._sdk, context);
  }

}



class Feed extends CommonResource {

  static _getCollectionPath () { return '/api/connectors/feeds'; }

  getData () {
    return this._sdk.api.get(`${this._getResourcePath()}/data`);
  }

}



class Data extends Resource {

  static _getCollectionPath () { return '/api/data'; }

  get group () {
    return this.document.group;
  }

  set group (value) {
    this.document.group = value;
  }

  get key () {
    return this.document.key;
  }

  set key (value) {
    this.document.key = value;
  }

  get value () {
    return this.document.value;
  }

  set value (value) {
    this.document.value = value;
  }

  _getResourcePath () {
    return this.constructor._getCollectionPath() + '/' + encodeURIComponent(this.group) + '/' + encodeURIComponent(this.key);
  }

  static get (group, key, sdk, context) {
    if (!group || !key) return Promise.resolve(null);
    const path = this._getCollectionPath() + '/' + encodeURIComponent(group) + '/' + encodeURIComponent(key);
    return sdk.api.get(path).then(document => new this(document, sdk, context)).catch(error => {
      if (error && error.status === 404) return null;
      throw error;
    });
  }

  static create (group, key, value, sdk, context) {
    if (!key) throw new Error('Please specify a key.');
    if (!group) throw new Error('Please specify a group');
    const path = this._getCollectionPath() + '/' + encodeURIComponent(group) + '/' + encodeURIComponent(key);
    return sdk.api.put(path, value).then(document => new this(document, sdk, context));
  }

  save () {
    return this._sdk.api.put(this._getResourcePath(), this.value);
  }

  _getChannelName () {
    return 'data' + ':' + this.key + ':' + this.group;
  }

}


class Content extends CommonResource {

  static _getCollectionPath () { return '/api/content'; }

  static _encodePath (value) {
    return encodeURI(value)
      .replace('!', '%21')
      .replace('#', '%23')
      .replace('$', '%24')
      .replace('&', '%26')
      .replace('\'', '%27')
      .replace('(', '%28')
      .replace(')', '%29')
      .replace(',', '%2C')
      .replace(':', '%3A')
      .replace(';', '%3B')
      .replace('=', '%3D')
      .replace('?', '%3F')
      .replace('~', '%7E');
  }

  getChildren () {
    return this._sdk.api.Content.find({ parent: this.uuid }, this._sdk, this._context);
  }

  get subtype () {
    return this.document.subtype;
  }

  getUrl () {
    const auth = this._sdk.authenticator.getAuthSync();
    if (this.subtype === 'scala:content:file') {
      return auth.api.host + '/api/delivery' + Content._encodePath(this.document.path) + '?_rt=' + auth.restrictedToken;
    } else if (this.subtype === 'scala:content:app') {
      return auth.api.host + '/api/delivery' + Content._encodePath(this.document.path) + '/index.html?_rt=' + auth.restrictedToken;
    } else if (this.subtype === 'scala:content:url') {
      return this.document.url;
    }
  }

  getVariantUrl (name) {
    return this.getUrl() + '&variant=' + name;
  }

  hasVariant (name) {
    return this.document.variants && this.document.variants.some(element => element.name === name);
  }

}


class ApiError extends Error {
  constructor (message, code, status) {
    super(message);
    this.message = message;
    this.code = code || null;
    this.status = status || null;
  }
}

class Api {

  constructor (sdk) {
    this._sdk = sdk;
    this.Device = Device;
    this.Experience = Experience;
    this.Thing = Thing;
    this.Zone = Zone;
    this.Location = Location;
    this.Feed = Feed;
    this.Data = Data;
    this.Content = Content;
  }

  fetch (path, params, options) {
    options = options || {};
    if (params) path += this.encodeQueryString(params);
    if (typeof options.body === 'object' && options.headers && options.headers['Content-Type'] === 'application/json') options.body = JSON.stringify(options.body);
    return this._sdk.authenticator.getAuth().then(auth => {
      options.cors = true;
      options.credentials = 'include';
      options.headers = options.headers || {};
      options.headers.Authorization = 'Bearer ' + auth.token;
      options.headers.Accept = 'application/json';
      return fetch(auth.api.host + path, options).then(response => {
        if (options.method === 'delete') return Promise.resolve();
        return response.json().then(body => {
          if (!response.ok) {
            if (body) {
              throw new ApiError(body.message, body.code, response.status);
            } else {
              throw new ApiError('An unknown error has occured.');
            }
          }
          return body;
        });
      });
    });
  }

  get (path, params) {
    return this.fetch(path, params, { method: 'get' });
  }

  post (path, body, params) {
    const options = { method: 'post', headers:  { 'Content-Type': 'application/json' }, body: body };
    return this.fetch(path, params, options);
  }

  put (path, body, params) {
    const options = { method: 'put', headers:  { 'Content-Type': 'application/json' }, body: body };
    return this.fetch(path, params, options);
  }

  patch (path, body, params) {
    const options = { method: 'patch', headers:  { 'Content-Type': 'application/json' }, body: body };
    return this.fetch(path, params, options);
  }

  delete (path, params) {
    if (params) path += this.encodeQueryString(params);
    return this.fetch(path, null, { method: 'delete' });
  }

  encodeQueryString (params) {
    let parts = [];
    Object.keys(params).forEach(name => {
      parts.push(encodeURIComponent(name) + '=' + encodeURIComponent(params[name]));
    });
    return '?' + parts.join('&');
  }

}



module.exports = Api;
