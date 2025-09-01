/**
 * Tests unitaires pour FirebaseAdapter
 */
import { FirebaseAdapter } from '../adapters/FirebaseAdapter';
import { BaseAdapter } from '../adapters/BaseAdapter';

describe('FirebaseAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new FirebaseAdapter();
  });

  test('should be an instance of BaseAdapter', () => {
    expect(adapter).toBeInstanceOf(BaseAdapter);
    expect(adapter.source).toBe('firebase');
  });

  describe('normalizeDevice', () => {
    test('should return null for null input', () => {
      expect(adapter.normalizeDevice(null)).toBeNull();
    });

    test('should extract temperature from various fields', () => {
      // Test different temperature field options
      const withTempImmediate = { id: 'device1', temperature_immediate: 23.5 };
      const withTemp = { id: 'device1', temp: 23.5 };
      const withTemperature = { id: 'device1', temperature: 23.5 };

      expect(adapter.normalizeDevice(withTempImmediate).temperature).toBe(23.5);
      expect(adapter.normalizeDevice(withTemp).temperature).toBe(23.5);
      expect(adapter.normalizeDevice(withTemperature).temperature).toBe(23.5);
    });

    test('should extract humidity from various fields', () => {
      // Test different humidity field options
      const withHumidityImmediate = { id: 'device1', humidity_immediate: 45 };
      const withHumidity = { id: 'device1', humidity: 45 };

      expect(adapter.normalizeDevice(withHumidityImmediate).humidity).toBe(45);
      expect(adapter.normalizeDevice(withHumidity).humidity).toBe(45);
    });

    test('should normalize device ID from various fields', () => {
      // Test different ID field options
      const withId = { id: 'device1' };
      const withUid = { uid: 'device1' };
      const withDeviceId = { deviceId: 'device1' };

      expect(adapter.normalizeDevice(withId).id).toBe('device1');
      expect(adapter.normalizeDevice(withUid).id).toBe('device1');
      expect(adapter.normalizeDevice(withDeviceId).id).toBe('device1');
    });

    test('should normalize device name with fallbacks', () => {
      // Test different name field options
      const withName = { name: 'Living Room Sensor' };
      const withDeviceName = { device_name: 'Living Room Sensor' };
      const withoutName = { id: 'device1' };

      expect(adapter.normalizeDevice(withName).name).toBe('Living Room Sensor');
      expect(adapter.normalizeDevice(withDeviceName).name).toBe('Living Room Sensor');
      expect(adapter.normalizeDevice(withoutName).name).toBe('Unknown Device');
    });

    test('should calculate air quality from CO2', () => {
      const goodCO2 = { id: 'device1', co2: 700 };
      const hazardousCO2 = { id: 'device1', co2: 6000 };
      const noCO2 = { id: 'device1' };

      expect(adapter.normalizeDevice(goodCO2).airQuality).toBe('good');
      expect(adapter.normalizeDevice(hazardousCO2).airQuality).toBe('hazardous');
      expect(adapter.normalizeDevice(noCO2).airQuality).toBeNull();
    });

    test('should normalize timestamp from various fields', () => {
      const now = new Date();
      const isoString = now.toISOString();

      const withLastSeen = { last_seen: isoString };
      const withLastUpdate = { lastUpdate: isoString };
      const withTimestamp = { timestamp: isoString };

      expect(adapter.normalizeDevice(withLastSeen).lastSeen).toBe(isoString);
      expect(adapter.normalizeDevice(withLastUpdate).lastSeen).toBe(isoString);
      expect(adapter.normalizeDevice(withTimestamp).lastSeen).toBe(isoString);
    });

    test('should normalize status', () => {
      const online = { status: 'online' };
      const offline = { status: 'offline' };
      const customStatus = { status: 'warning' };
      const noStatus = {};

      expect(adapter.normalizeDevice(online).status).toBe('active');
      expect(adapter.normalizeDevice(offline).status).toBe('inactive');
      expect(adapter.normalizeDevice(customStatus).status).toBe('warning');
      expect(adapter.normalizeDevice(noStatus).status).toBe('unknown');
    });

    test('should include raw data in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const device = { id: 'device1', name: 'Test Device', temperature: 23 };
      const normalized = adapter.normalizeDevice(device);

      expect(normalized._raw).toEqual(device);
      expect(normalized._source).toBe('firebase');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('normalizeDevices', () => {
    test('should handle null input', () => {
      expect(adapter.normalizeDevices(null)).toEqual([]);
    });

    test('should process array of devices', () => {
      const devices = [
        { id: 'device1', temperature: 22 },
        { id: 'device2', temperature: 23 }
      ];

      const result = adapter.normalizeDevices(devices);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('device1');
      expect(result[1].id).toBe('device2');
    });

    test('should process object of devices', () => {
      const devices = {
        device1: { temperature: 22 },
        device2: { temperature: 23 }
      };

      const result = adapter.normalizeDevices(devices);
      expect(result).toHaveLength(2);
      // Should add IDs from object keys
      expect(result.find(d => d.id === 'device1')).toBeTruthy();
      expect(result.find(d => d.id === 'device2')).toBeTruthy();
    });

    test('should filter out null results', () => {
      const devices = [
        { id: 'device1', temperature: 22 },
        null,
        { id: 'device2', temperature: 23 }
      ];

      // Mock normalizeDevice to return null for the second item
      const spy = jest.spyOn(adapter, 'normalizeDevice')
        .mockImplementation(device => device ? { ...device } : null);

      const result = adapter.normalizeDevices(devices);
      expect(result).toHaveLength(2);

      spy.mockRestore();
    });
  });

  describe('normalizeAlerts', () => {
    test('should handle null input', () => {
      expect(adapter.normalizeAlerts(null)).toEqual([]);
    });

    test('should normalize array of alerts', () => {
      const now = new Date().toISOString();
      const alerts = [
        { id: 'alert1', type: 'warning', message: 'Test alert', timestamp: now },
        { id: 'alert2', type: 'error', text: 'Another alert', created_at: now }
      ];

      const result = adapter.normalizeAlerts(alerts);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('alert1');
      expect(result[0].message).toBe('Test alert');
      expect(result[1].id).toBe('alert2');
      expect(result[1].message).toBe('Another alert'); // Should use 'text' as fallback
    });

    test('should normalize object of alerts', () => {
      const now = new Date().toISOString();
      const alerts = {
        alert1: { type: 'warning', message: 'Test alert', timestamp: now },
        alert2: { type: 'error', text: 'Another alert', created_at: now }
      };

      const result = adapter.normalizeAlerts(alerts);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('warning');
      expect(result[1].type).toBe('error');
    });
  });

  describe('normalizeReadings', () => {
    test('should handle null input', () => {
      expect(adapter.normalizeReadings(null)).toEqual([]);
    });

    test('should normalize array of readings', () => {
      const now = new Date().toISOString();
      const readings = [
        { timestamp: now, temperature_immediate: 22, humidity_immediate: 45 },
        { time: now, temp: 23, humidity: 46 }
      ];

      const result = adapter.normalizeReadings(readings);

      expect(result).toHaveLength(2);
      expect(result[0].temperature).toBe(22);
      expect(result[0].humidity).toBe(45);
      expect(result[1].temperature).toBe(23);
      expect(result[1].humidity).toBe(46);
    });

    test('should include source in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const now = new Date().toISOString();
      const readings = [
        { timestamp: now, temperature_immediate: 22 }
      ];

      const result = adapter.normalizeReadings(readings);
      expect(result[0]._source).toBe('firebase');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
