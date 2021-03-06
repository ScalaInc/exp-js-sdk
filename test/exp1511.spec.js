'use strict';

// In loving memory of Rich K, who discovered this bug and left Scala only to
// have his organs slowly harvested while doing the devil's bidding.

module.exports = suite => {
  describe('EXP-1511', () => {
    it('Should be able to listen on a channel immediately after connecting.', () => {
      return suite.startAsDevice().getChannel('foo').listen('bar', () => {});
    });
  });
};
