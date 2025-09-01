/**
 * Tests unitaires pour LocalServerAdapter
 */
import { LocalServerAdapter } from '../adapters/LocalServerAdapter';
import { BaseAdapter } from '../adapters/BaseAdapter';

describe('LocalServerAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new LocalServerAdapter();
  });

  test('should be an instance of BaseAdapter', () => {
    expect(adapter).toBeInstanceOf(BaseAdapter);
    expect(adapter.source).toBe('local');
  });

  describe('normalizeDevice', () => {
    test('should return null for null input', () => {
      expect(adapter.normalizeDevice(null)).toBeNull();
    });

    test('should normalize a complete device object', () => {
      const now = new Date().toISOString();
      const device = {
        sensor_id: '1',
        room_id: 'living_room',
        room_name: 'Living Room',
        last_temperature: 22.5,
        last_humidity: 45,
        status: 'healthy',
        last_seen: now
      };

      const normalized = adapter.normalizeDevice(device);

      expect(normalized).toEqual({
        id: '1',
        room: 'Living Room',
        name: 'Living Room Sensor',
        temperature: 22.5,
        humidity: 45,
        status: 'active',
        lastSeen: now,
        co2: null,
        pressure: null,
        airQuality: null,
        alerts: [],
        stats: {
          minTemp: undefined,
          maxTemp: undefined,
          avgTemp: undefined,
          readingsCount: undefined,
          lastHourAvg: {
            temperature: undefined,
            humidity: undefined,
            co2: undefined,
          }
        },
        _source: 'local'
      });
    });

    test('should handle alternative field names', () => {
      const device = {
        id: '1',
        location: 'Kitchen',
        temp: 22.5,
        rh: 45,
        device_status: 'online'
      };

      const normalized = adapter.normalizeDevice(device);

      expect(normalized.id).toBe('1');
      expect(normalized.room).toBe('Kitchen');
      expect(normalized.temperature).toBe(22.5);
      expect(normalized.humidity).toBe(45);
      expect(normalized.status).toBe('active');
    });

    test('should map local statuses to standardized ones', () => {
      expect(adapter.normalizeDevice({ status: 'healthy' }).status).toBe('active');
      expect(adapter.normalizeDevice({ status: 'warning' }).status).toBe('warning');
      expect(adapter.normalizeDevice({ status: 'error' }).status).toBe('error');
      expect(adapter.normalizeDevice({ status: 'offline' }).status).toBe('inactive');
      expect(adapter.normalizeDevice({ status: 'unknown' }).status).toBe('unknown');
    });

    test('should provide defaults for missing values', () => {
      const minimal = { sensor_id: '1' };
      const normalized = adapter.normalizeDevice(minimal);

      expect(normalized.id).toBe('1');
      expect(normalized.name).toBe('Unknown Device');
      expect(normalized.room).toBe('Unknown');
      expect(normalized.temperature).toBeNull();
      expect(normalized.humidity).toBeNull();
      expect(normalized.status).toBe('unknown');
    });
  });

  describe('normalizeDevices', () => {
    test('should handle null input', () => {
      expect(adapter.normalizeDevices(null)).toEqual([]);
    });

    test('should normalize an array of devices', () => {
      const devices = [
        { sensor_id: '1', room_name: 'Living Room', last_temperature: 22 },
        { sensor_id: '2', room_name: 'Bedroom', last_temperature: 21 }
      ];

      const result = adapter.normalizeDevices(devices);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('Living Room Sensor');
      expect(result[1].id).toBe('2');
      expect(result[1].name).toBe('Bedroom Sensor');
    });

    test('should handle errors and continue processing', () => {
      const devices = [
        { sensor_id: '1', room_name: 'Living Room' },
        null,  // Should be skipped
        { sensor_id: '2', room_name: 'Bedroom' }
      ];

      // Use a real method call without mocking
      const result = adapter.normalizeDevices(devices);

      // We should have 2 valid devices, with the null one skipped
      expect(result.length).toBe(2);
    });
  });

  describe('normalizeReading', () => {
    test('should normalize a single reading', () => {
      const now = new Date().toISOString();
      const reading = {
        sensor_id: '1',
        timestamp: now,
        temperature: 22.5,
        humidity: 45
      };

      const result = adapter.normalizeReading(reading);

      expect(result).toEqual({
        deviceId: '1',
        timestamp: now,
        temperature: 22.5,
        humidity: 45,
        co2: null,
        pressure: null,
        _source: 'local'
      });
    });

    test('should handle alternative field names', () => {
      const now = new Date().toISOString();
      const reading = {
        device_id: '1',
        time: now,
        temp: 22.5,
        rh: 45
      };

      const result = adapter.normalizeReading(reading);

      expect(result.deviceId).toBe('1');
      expect(result.timestamp).toBe(now);
      expect(result.temperature).toBe(22.5);
      expect(result.humidity).toBe(45);
    });
  });

  describe('normalizeReadings', () => {
    test('should handle null input', () => {
      expect(adapter.normalizeReadings(null)).toEqual([]);
    });

    test('should normalize an array of readings', () => {
      const now = new Date().toISOString();
      const readings = [
        { sensor_id: '1', timestamp: now, temperature: 22, humidity: 45 },
        { sensor_id: '2', timestamp: now, temperature: 21, humidity: 46 }
      ];

      const result = adapter.normalizeReadings(readings);

      expect(result).toHaveLength(2);
      expect(result[0].deviceId).toBe('1');
      expect(result[1].deviceId).toBe('2');
    });
  });
});
