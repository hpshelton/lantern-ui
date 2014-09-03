'use strict';

describe('The service', function() {
  beforeEach(function () {
    module('app.services');

    // Hook into the console before dependency injection happens and overrides the object
    spyOn(console, 'debug');
  });

  describe('logFactoryService', function () {
    var service, defaultLogger, customLogger;

    beforeEach(inject(function (logFactory) {
      service = logFactory;
      defaultLogger = service();
      customLogger = service("CustomCtrl");
    }));

    it('defines a logging service', function () {
      expect(defaultLogger).not.toEqual(undefined);
      expect(defaultLogger).not.toEqual(null);
      expect(typeof defaultLogger.log).toEqual('function');
      expect(typeof defaultLogger.warn).toEqual('function');
      expect(typeof defaultLogger.error).toEqual('function');
      expect(typeof defaultLogger.debug).toEqual('function');

      expect(customLogger).not.toEqual(undefined);
      expect(customLogger).not.toEqual(null);
      expect(typeof customLogger.log).toEqual('function');
      expect(typeof customLogger.warn).toEqual('function');
      expect(typeof customLogger.error).toEqual('function');
      expect(typeof customLogger.debug).toEqual('function');
    });

    it('returns valid logging functions for components on its whitelist', function () {
      expect(typeof service("Ctrl").log).toEqual('function');
      expect(service("Ctrl").log).not.toEqual(angular.noop);
    });

    it('returns no-op logging functions for components not on its whitelist', function () {
      expect(typeof service("NotWhitelisted").error).toEqual('function');
      expect(service("NotWhitelisted").error).toEqual(angular.noop);
    });

    it('prefixes log output with the component name', function () {
      defaultLogger.debug('Default debug output');
      expect(console.debug).toHaveBeenCalledWith('Default debug output');

      customLogger.debug('Custom component debug output');
      expect(console.debug).toHaveBeenCalledWith('[CustomCtrl]', 'Custom component debug output');
    });
  });

  describe('apiService', function () {
    var service, httpBackend;
    var API_URL_PREFIX = 'app/api/version';

    beforeEach(function() {
      module(function ($provide) {
        $provide.value('API_URL_PREFIX', API_URL_PREFIX);
      });

      inject(function ($injector, apiSrvc) {
        httpBackend = $injector.get('$httpBackend');
        service = apiSrvc;
      });
    });

    it('defines a API service', function () {
      expect(service).not.toEqual(undefined);
      expect(service).not.toEqual(null);
      expect(typeof service.interaction).toEqual('function');
      expect(typeof service.exception).toEqual('function');
    });

    it('makes the correct HTTP POST when interaction() is called', function () {
      var path = '/settings/autoReport';
      var data = { path: path, value: false };

      httpBackend.expect('POST', API_URL_PREFIX + '/interaction/set', data).respond(200, '');

      service.interaction('set', data);
    });

    it('makes the correct HTTP POST when exception() is called', function () {
      var data = { msg: 'Some exception data' };

      httpBackend.expect('POST', API_URL_PREFIX + '/exception', data).respond(200, '');

      service.exception(data);
    });

  });
    
  describe('Google Analytics Service', function () {
    var service;
    var fakeModelSrvc;
    var fakeWindow;
    var GOOGLE_ANALYTICS_WEBPROP_ID = '1';
    var GOOGLE_ANALYTICS_DISABLE_KEY = 'ga-disable-' + GOOGLE_ANALYTICS_WEBPROP_ID;

    beforeEach(function() {
      module(function ($provide) {
        $provide.value('API_URL_PREFIX', API_URL_PREFIX);
        $provide.value('GOOGLE_ANALYTICS_WEBPROP_ID', GOOGLE_ANALYTICS_WEBPROP_ID);
        $provide.value('GOOGLE_ANALYTICS_DISABLE_KEY', GOOGLE_ANALYTICS_DISABLE_KEY);

        // Create a mock model for the service's use
        fakeModelSrvc = jasmine.createSpyObj('modelSrvc', ['model']);
        $provide.value('modelSrvc', fakeModelSrvc);
      
        // Create a mock analytics function for the service's use
        fakeWindow = jasmine.createSpyObj('$window', ['ga']);
        $provide.value('$window', fakeWindow);
      });

      inject(function ($injector, gaMgr) {
        service = gaMgr;
      });
    });
    
    it('defines a Google Analytics service', function () {
      expect(service).not.toEqual(undefined);
      expect(service).not.toEqual(null);
      expect(typeof service.stopTracking).toEqual('function');
      expect(typeof service.startTracking).toEqual('function');
      expect(typeof service.trackPageView).toEqual('function');        
    });

    it('defaults to tracking disabled', function () {
      // TODO: This likely needs a stronger guarantee that we never called
      // startTracking() but the spy setup is not cooperating
      expect(fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY]).toEqual(true);
    });

    it('can enable tracking', function () {
      fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY] = false;
      service.startTracking();
      expect(fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY]).toEqual(false);

      fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY] = true;
      service.startTracking();
      expect(fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY]).toEqual(false);
    });

    it('can disable tracking', function () {
      fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY] = false;
      service.stopTracking();
      expect(fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY]).toEqual(true);

      fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY] = true;
      service.stopTracking();
      expect(fakeWindow[GOOGLE_ANALYTICS_DISABLE_KEY]).toEqual(true);
    });

    it('can report pageviews', function () {
      service.startTracking();

      service.trackPageView('start');
      expect(fakeWindow.ga).toHaveBeenCalledWith('set', 'page', '/');
      expect(fakeWindow.ga).toHaveBeenCalledWith('send', 'pageview', { sessionControl: 'start' });
      fakeWindow.ga.reset();

      service.trackPageView();
      expect(fakeWindow.ga).toHaveBeenCalledWith('set', 'page', '/');
      expect(fakeWindow.ga).toHaveBeenCalledWith('send', 'pageview', undefined);
      fakeWindow.ga.reset();

      fakeModelSrvc.model.modal = 'settings';
      service.trackPageView('end');
      expect(fakeWindow.ga).toHaveBeenCalledWith('set', 'page', 'settings');
      expect(fakeWindow.ga).toHaveBeenCalledWith('send', 'pageview', { sessionControl: 'end' });
    });
  });
});
