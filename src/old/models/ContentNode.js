'use strict';

const ContentNode = function (context) {

  const encodePath = function(value) {
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
  };

  const self = this;
  const api = require('../api');
  const config = require('../config');

  this.uuid = context.content.uuid;
  this.document = context.content;
  this.subtype = this.document.subtype;

  this.children = [];

  if (this.document.children && this.document.children.length === this.document.itemCount) {
    this.document.children.forEach(child => {
      self.children.push(new ContentNode({ content: child }));
    });
  }

  this.getChildren = () => {
    if (this.document.itemCount !== this.children.length) {
      return api.getContentNode(this.uuid)
      .then(that => {
        self.document = that.document;
        self.children = that.children;

        return self.children;
      });
    } else {
      return Promise.resolve(this.children);
    }
  };

  this.getUrl = () => {
    if (this.subtype === 'scala:content:file') {
      return config.host + '/api/delivery' + encodePath(this.document.path);
    } else if (this.subtype === 'scala:content:app') {
      return config.host + '/api/delivery' + encodePath(this.document.path) + '/index.html';
    } else if (this.subtype === 'scala:content:url') {
      return this.document.url;
    }

    return null;
  };

  this.getVariantUrl = name => {
    if (this.subtype === 'scala:content:file' && this.hasVariant(name)) {
      const query = '?variant=' + encodeURIComponent(name);
      return config.host + '/api/delivery' + encodePath(this.document.path) + query;
    }

    return null;
  };

  this.hasVariant = name => {
    return this.document.variants && this.document.variants.some(element => {
      return element.name === name;
    });
  };

};

module.exports = ContentNode;