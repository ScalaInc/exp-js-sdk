'use strict';

const _ = require('lodash');

const Resource = require('./Resource');
const Experience = require('./Experience');
const Location = require('./Location');

class Device extends Resource {

  getExperience () {
    return Experience.get(_.get(this, 'document.experience.uuid'), this._context);
  }

  getLocation () {
    return Location.get(_.get(this, 'document.location.uuid'), this._context);
  }

  static get path () {
    return '/1/devices';
  }

  identify () {
    return this.getChannel().broadcast('identify');
  }

}

module.exports = Device;
