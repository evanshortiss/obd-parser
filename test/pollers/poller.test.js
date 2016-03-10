'use strict';

var expect = require('chai').expect
  , EventEmitter = require('events').EventEmitter
  , sinon = require('sinon')
  , Promise = require('bluebird');

describe('pollers', function () {

  var pollers = null;
  var ECUPoller = null;
  var parser = null;

  // Ensure each test has a clean instance
  beforeEach(function () {
    delete require.cache[require.resolve('lib/pollers')];
    delete require.cache[require.resolve('lib/pollers/poller')];
    delete require.cache[require.resolve('lib/parser')];
    parser = require('lib/parser');
    pollers = require('lib/pollers');
    ECUPoller = require('lib/pollers/poller');
  });

  describe('#getPollerTypes', function () {
    it('should return an Array', function () {
      expect(pollers.getPollerTypes()).to.be.an('Array');
      expect(pollers.getPollerTypes()).to.have.length.above(0);
    });
  });


  describe('#getPoller', function () {
    it('should get an ECUPoller instance by "constname"', function () {
      expect(
        pollers.getPoller({
          constname: 'ENGINE_COOLANT_TEMPERATURE',
          refreshRate: 5
        })
      ).to.be.an('object');
    });

    it('should fail to get ECUPoller; missing "refreshRate"', function () {
      expect(function () {
        pollers.getPoller({
          constname: 'ENGINE_COOLANT_TEMPERATURE'
        });
      }).to.throw('AssertionError');
    });

    it('should fail to get an ECUPoller due to missing opts', function () {
      expect(function () {
        pollers.getPoller({});
      }).to.throw('AssertionError');
    });

    it('should get an ECUPoller with "pollInterval"', function () {
      expect(
        pollers.getPoller({
          constname: 'ENGINE_COOLANT_TEMPERATURE',
          pollInterval: 500
        })
      ).to.be.an('object');
    });

    it('should return the same object for successive calls', function () {
      var p1 = pollers.getPoller({
        constname: 'ENGINE_COOLANT_TEMPERATURE',
        pollInterval: 500
      });

      var p2 = pollers.getPoller({
        constname: 'ENGINE_COOLANT_TEMPERATURE',
        pollInterval: 500
      });

      expect(p1).to.equal(p2);
    });
  });


  describe('#removePoller', function () {
    it('should remove poller by reference', function () {
      var p1 = pollers.getPoller({
        constname: 'ENGINE_COOLANT_TEMPERATURE',
        pollInterval: 500
      });

      pollers.removePoller(p1);

      var p2 = pollers.getPoller({
        constname: 'ENGINE_COOLANT_TEMPERATURE',
        pollInterval: 500
      });

      expect(p1).not.to.equal(p2);
    });
  });


  describe('#ECUPoller', function () {
    var dummyData = {
      ts: 1456245202195,
      value: 1749.5,
      raw: '410C1B56',
      byteGroups: ['41','0C','1B','56']
    };

    describe('#_onEcuData', function () {
      it('should format the data correctly', function () {
        var p = new ECUPoller({
          refreshRate: 1,
          constname: 'ENGINE_RPM'
        });

        var spy = sinon.spy();

        p.on('data', spy);

        p._onEcuData(dummyData);

        expect(spy.calledOnce).to.be.true;
        expect(spy.getCall(0).args[0].pretty).to.equal('1749.5rpm');
      });

      it('should format the data correctly', function () {
        var p = new ECUPoller({
          refreshRate: 1,
          constname: 'ENGINE_RPM'
        });

        var spy = sinon.spy();

        var _dummyData = {
          ts: 1456245202195,
          value: 1749.5,
          raw: '41AA1B56',
          byteGroups: ['41','AA','1B','56']
        };

        p.on('data', spy);
        p._onEcuData(_dummyData);

        expect(spy.called).to.be.false;
      });
    });

    describe('#startPollLoop', function () {
      it('should queue a poll', function () {
        var p = new ECUPoller({
          refreshRate: 2,
          constname: 'ENGINE_RPM'
        });

        expect(p.pollTimer).to.be.null;

        p.startPollLoop();

        expect(p.pollTimer).to.be.an('object');
        expect(p.polling).to.be.true;

        p.stopPollLoop();
      });
    });


    describe('#stopPollLoop', function () {
      it('should queue a poll and then remove it', function () {
        var p = new ECUPoller({
          refreshRate: 2,
          constname: 'ENGINE_RPM'
        });

        expect(p.pollTimer).to.be.null;

        p.startPollLoop();

        expect(p.pollTimer).to.be.an('object');

        p.stopPollLoop();

        expect(p.pollTimer).to.be.null;
        expect(p.polling).to.be.false;
      });
    });
  });


  describe('#poll', function () {
    it('should perform a poll successfully', function (done) {
      var c = require('lib/connection');

      // Return a dud connection
      c.setConnectorFn(function () {
        return new Promise(function(resolve) {
          var _c = new EventEmitter();

          _c.write = function(str) {
            expect(str).to.contain('010C'); // An engine RPM poll

            setTimeout(function() {
              parser.write('410C1B56>');
            });
          };

          resolve(_c);
        });
      });

      var p = new ECUPoller({
        refreshRate: 2,
        constname: 'ENGINE_RPM'
      });

      p.on('data', function (data) {
        expect(data).to.be.an('object');
        expect(data.value).to.equal(1749.5);
        expect(data.pretty).to.equal('1749.5rpm');
        expect(data.raw).to.equal('410C1B56');
        done();
      });
      p.poll();
    });


    it('should perform a emit a poll error', function (done) {
      var c = require('lib/connection');

      // Return a dud connection
      c.setConnectorFn(function () {
        return new Promise(function(resolve, reject) {
          reject(new Error('fake error: could not connect to serial'));
        });
      });

      var p = new ECUPoller({
        refreshRate: 2,
        constname: 'ENGINE_RPM'
      });

      var pollSpy = sinon.spy()
        , errSpy = sinon.spy();

      p.on('data', pollSpy);
      p.on('error', errSpy);

      setTimeout(function () {
        expect(pollSpy.called).to.be.false;
        expect(errSpy.called).to.be.true;
        done();
      });

      p.poll();
    });

  });

});
