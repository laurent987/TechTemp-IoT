import { transformDeviceData, transformDevicesData, validateDeviceData, getDeviceWithDefaults } from '../deviceDataTransformer';

describe('deviceDataTransformer', () => {
  const mockDevice = {
    sensor_id: 1,
    room_name: 'Salon',
    room_id: 'A',
    status: 'online',
    last_seen: '2025-08-29T10:00:00Z',
    last_temperature: 22.5,
    avg_temperature: 21.8,
    last_humidity: 45,
    avg_humidity: 47.2
  };

  describe('transformDeviceData', () => {
    it('should use real-time data when useRealTime is true', () => {
      const result = transformDeviceData(mockDevice, true);

      expect(result.temperature).toBe(22.5);
      expect(result.humidity).toBe(45);
      expect(result.temperaturePrecision).toBe(1);
      expect(result.humidityPrecision).toBe(0);
    });

    it('should use average data when useRealTime is false', () => {
      const result = transformDeviceData(mockDevice, false);

      expect(result.temperature).toBe(21.8);
      expect(result.humidity).toBe(47.2);
      expect(result.temperaturePrecision).toBe(1);
      expect(result.humidityPrecision).toBe(1);
    });

    it('should preserve original data', () => {
      const result = transformDeviceData(mockDevice, true);

      expect(result._original.last_temperature).toBe(22.5);
      expect(result._original.avg_temperature).toBe(21.8);
      expect(result._original.last_humidity).toBe(45);
      expect(result._original.avg_humidity).toBe(47.2);
    });

    it('should handle missing temperature/humidity data', () => {
      const deviceWithMissingData = {
        ...mockDevice,
        last_temperature: undefined,
        avg_humidity: undefined
      };

      const result = transformDeviceData(deviceWithMissingData, true);

      expect(result.temperature).toBeUndefined();
      expect(result.humidity).toBeUndefined();
    });
  });

  describe('transformDevicesData', () => {
    it('should transform an array of devices', () => {
      const devices = [mockDevice, { ...mockDevice, sensor_id: 2 }];
      const result = transformDevicesData(devices, true);

      expect(result).toHaveLength(2);
      expect(result[0].temperature).toBe(22.5);
      expect(result[1].temperature).toBe(22.5);
    });

    it('should handle empty or invalid input', () => {
      expect(transformDevicesData(null, true)).toEqual([]);
      expect(transformDevicesData(undefined, true)).toEqual([]);
      expect(transformDevicesData([], true)).toEqual([]);
    });
  });

  describe('validateDeviceData', () => {
    it('should return true for valid device', () => {
      expect(validateDeviceData(mockDevice)).toBe(true);
    });

    it('should return false for device missing required fields', () => {
      const invalidDevice = { ...mockDevice };
      delete invalidDevice.sensor_id;

      expect(validateDeviceData(invalidDevice)).toBe(false);
    });

    it('should return false for null/undefined device', () => {
      expect(validateDeviceData(null)).toBe(false);
      expect(validateDeviceData(undefined)).toBe(false);
    });
  });

  describe('getDeviceWithDefaults', () => {
    it('should fill missing fields with defaults', () => {
      const incompleteDevice = {
        sensor_id: 1,
        room_name: 'Salon'
      };

      const result = getDeviceWithDefaults(incompleteDevice);

      expect(result.sensor_id).toBe(1);
      expect(result.room_name).toBe('Salon');
      expect(result.room_id).toBe('N/A');
      expect(result.status).toBe('unknown');
      expect(result.temperature).toBeNull();
      expect(result.humidity).toBeNull();
    });

    it('should not override existing fields', () => {
      const result = getDeviceWithDefaults(mockDevice);

      expect(result.sensor_id).toBe(1);
      expect(result.room_name).toBe('Salon');
      expect(result.status).toBe('online');
    });
  });
});
