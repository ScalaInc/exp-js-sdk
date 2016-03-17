'use strict';


function generateTestLocation () {
  return {};
}

module.exports = suite => {

  describe('Locations', () => {
    beforeEach(() => suite.exp.start(suite.credentials.device));


    it('Should resolve to null if uuid not specified', () => {
      return suite.exp.getLocation().then(location => { if (location !== null) throw new Error(); });
    });

    it('Should resolve to null if uuid does not match existing location.', () => {
      return suite.exp.getLocation('fakeuuid').then(location => { if (location !== null ) throw new Error(); });
    });

    it('Should be able to create a new location.', () => {
      return suite.exp.createLocation(generateTestLocation()).then(location => {
        return suite.exp.getLocation(location.document.uuid);
      });
    });

    it('Should be able to get a list of locations.', () => {
      return suite.exp.findLocations().then(locations => locations.forEach(location => {
        if (!(location instanceof suite.exp._sdk.api.Location)) throw new Error();
      }));
    });

    it('Should return empty list of locations for unmatched query.', () => {
      return suite.exp.findLocations({ name: 'tootallo' }).then(locations => { if (locations.length !== 0) throw new Error(); });
    });

     it('Should be able to fling.', () => {
      return suite.exp.findLocations().then(locations => {
        return locations[0].fling({});
      });
    });

    it('Should be able to save changes to a location.', () => {
      const name = Math.random().toString();
      return suite.exp.createLocation(generateTestLocation()).then(location => {
        location.document.name = name;
        return location.save().then(() => suite.exp.getLocation(location.document.uuid)).then(location => {
          if (location.document.name !== name) throw new Error();
        });
      });
    });

    it('Should be able to listen for updates to location.', done => {
      suite.exp.findLocations().then(locations => {
        return locations[0].getChannel({ system: true }).listen('update', () => done()).then(() => {
          return locations[0].save();
        });
      });
    });

    it('Should be able to communicate on location channel.', done => {
      suite.exp.findLocations().then(locations => {
        return locations[0].getChannel().listen('test', () => done()).then(() => {
          return locations[0].getChannel().broadcast('test');
        });
      });
    });

    it('Should be able to refresh a location in place.', () => {
      const name = Math.random().toString();
      return suite.exp.findLocations().then(locations => {
        return suite.exp.getLocation(locations[0].document.uuid).then(location=> {
          location.document.name = name;
          return location.save().then(() => {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                locations[0].refresh().then(() => {
                  if (locations[0].document.name === name) resolve();
                }).catch(reject);
              }, 500);
            });
          });
        });
      });
    });

    describe('location.getLayoutUrl()', () => {
      it('Should return a layout url', () => {
        return suite.exp.createLocation().then(location => {
          return location.getLayoutUrl();
        });
      });
    });

    describe('location.getDevices()', () => {
      it('Should return all devices in location.', () => {
        return suite.exp.createLocation().then(location => {
          return suite.exp.createDevice({ subtype: 'scala:device:server' }).then(device => {
            device.document.location = { uuid: location.document.uuid };
            return device.save().then(() => {
              return location.getDevices().then(devices => {
                if (devices.length !== 1) throw new Error();
              });
            });
          });
        });
      });
    });
    describe('location.getThings()', () => {

      it('Should return all things in location.', () => {
        return suite.exp.createLocation().then(location => {
          return suite.exp.createThing({ subtype: 'scala:thing:rfid', id: 'test23' }).then(thing => {
            thing.document.location = { uuid: location.document.uuid };
            return thing.save().then(() => {
              return location.getThings().then(things => {
                if (things.length !== 1) throw new Error();
              });
            });
          });
        });
      });
    });

    describe('location.getZones()', () => {
      it('Should resolve to an array of zones.', () => {
        const document = generateTestLocation();
        document.zones = [{ key: '1', name: '1'}, { key: '2', name: '2' }];
        return suite.exp.createLocation(document).then(location => {
          return location.getZones().then(zones => {
            if (zones.length !== 2) throw new Error();
            if (!(zones[0] instanceof suite.exp._sdk.api.Zone)) throw new Error();
          });
        });
      });
    });
  });
};