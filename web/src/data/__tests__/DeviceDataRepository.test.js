/**
 * Tests unitaires pour DeviceDataRepository
 */
import { DeviceDataRepository } from '../repositories/DeviceDataRepository';
import { BaseAdapter } from '../adapters/BaseAdapter';
import { CacheManager } from '../cache/CacheManager';

// Mock des adaptateurs et du cache
jest.mock('../cache/CacheManager');

class MockAdapter extends BaseAdapter {
  constructor(source = 'mock') {
    super(source);
  }

  async fetchDeviceReadings(deviceId, options = {}) {
    return [
      { deviceId, timestamp: '2023-01-01T12:00:00Z', temperature: 22, humidity: 45 },
      { deviceId, timestamp: '2023-01-01T12:30:00Z', temperature: 22.5, humidity: 46 }
    ];
  }

  async fetchHistoricalData(deviceId, startDate, endDate, options = {}) {
    return [
      { deviceId, timestamp: startDate, temperature: 21, humidity: 40 },
      { deviceId, timestamp: endDate, temperature: 22, humidity: 42 }
    ];
  }
}

describe('DeviceDataRepository', () => {
  let repository;
  let mockAdapter;
  let mockCache;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    mockCache = new CacheManager();

    // Reset all mock implementations
    jest.clearAllMocks();

    // Configure mock cache methods
    mockCache.get.mockImplementation(() => null); // Default to cache miss
    mockCache.set.mockImplementation(() => { }); // No-op for set

    repository = new DeviceDataRepository({
      adapters: [mockAdapter],
      cache: mockCache
    });
  });

  describe('getDeviceReadings', () => {
    test('should fetch device readings from adapter', async () => {
      const result = await repository.getDeviceReadings('device-1');

      expect(result).toHaveLength(2);
      expect(result[0].deviceId).toBe('device-1');
      expect(result[0].temperature).toBe(22);
    });

    test('should use cache when available', async () => {
      const cachedData = [
        { deviceId: 'device-1', timestamp: '2023-01-01T12:00:00Z', temperature: 23, humidity: 50 }
      ];

      mockCache.get.mockReturnValueOnce(cachedData);

      const result = await repository.getDeviceReadings('device-1');

      expect(mockCache.get).toHaveBeenCalledWith('readings:device-1');
      expect(result).toEqual(cachedData);
    });

    test('should cache results when fetched from adapter', async () => {
      await repository.getDeviceReadings('device-1');

      expect(mockCache.set).toHaveBeenCalled();
      expect(mockCache.set.mock.calls[0][0]).toBe('readings:device-1');
      expect(mockCache.set.mock.calls[0][1]).toHaveLength(2);
    });

    test('should use fallback adapter if primary fails', async () => {
      const primaryAdapter = {
        source: 'primary',
        fetchDeviceReadings: jest.fn().mockRejectedValue(new Error('Failed')),
      };

      const fallbackAdapter = {
        source: 'fallback',
        fetchDeviceReadings: jest.fn().mockResolvedValue([
          { deviceId: 'device-1', timestamp: '2023-01-01T12:00:00Z', temperature: 20, humidity: 40 }
        ]),
      };

      repository = new DeviceDataRepository({
        adapters: [primaryAdapter, fallbackAdapter],
        cache: mockCache
      });

      const result = await repository.getDeviceReadings('device-1');

      expect(primaryAdapter.fetchDeviceReadings).toHaveBeenCalled();
      expect(fallbackAdapter.fetchDeviceReadings).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].temperature).toBe(20);
    });
  });

  describe('getHistoricalData', () => {
    const startDate = '2023-01-01T00:00:00Z';
    const endDate = '2023-01-02T00:00:00Z';

    test('should fetch historical data from adapter', async () => {
      const result = await repository.getHistoricalData('device-1', startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].deviceId).toBe('device-1');
      expect(result[0].timestamp).toBe(startDate);
    });

    test('should use cache when available', async () => {
      const cachedData = [
        { deviceId: 'device-1', timestamp: startDate, temperature: 23, humidity: 50 }
      ];

      const cacheKey = `historical:device-1:${startDate}:${endDate}`;
      mockCache.get.mockReturnValueOnce(cachedData);

      const result = await repository.getHistoricalData('device-1', startDate, endDate);

      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedData);
    });

    test('should cache results when fetched from adapter', async () => {
      await repository.getHistoricalData('device-1', startDate, endDate);

      const cacheKey = `historical:device-1:${startDate}:${endDate}`;
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockCache.set.mock.calls[0][0]).toBe(cacheKey);
    });
  });

  describe('getDeviceStats', () => {
    test('should calculate statistics from device readings', async () => {
      // Mock getDeviceReadings to return test data
      repository.getDeviceReadings = jest.fn().mockResolvedValue([
        { deviceId: 'device-1', timestamp: '2023-01-01T12:00:00Z', temperature: 20, humidity: 40 },
        { deviceId: 'device-1', timestamp: '2023-01-01T13:00:00Z', temperature: 22, humidity: 45 },
        { deviceId: 'device-1', timestamp: '2023-01-01T14:00:00Z', temperature: 24, humidity: 50 }
      ]);

      const result = await repository.getDeviceStats('device-1');

      expect(result).toEqual({
        deviceId: 'device-1',
        temperatureStats: {
          min: 20,
          max: 24,
          avg: 22,
          current: 24
        },
        humidityStats: {
          min: 40,
          max: 50,
          avg: 45,
          current: 50
        },
        readingCount: 3,
        lastUpdated: '2023-01-01T14:00:00Z'
      });
    });

    test('should handle empty readings array', async () => {
      repository.getDeviceReadings = jest.fn().mockResolvedValue([]);

      const result = await repository.getDeviceStats('device-1');

      expect(result).toEqual({
        deviceId: 'device-1',
        temperatureStats: {
          min: null,
          max: null,
          avg: null,
          current: null
        },
        humidityStats: {
          min: null,
          max: null,
          avg: null,
          current: null
        },
        readingCount: 0,
        lastUpdated: null
      });
    });
  });
});
