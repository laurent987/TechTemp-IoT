/**
 * Tests unitaires pour DeviceRepository
 */
import { DeviceRepository } from '../repositories/DeviceRepository';
import { FirebaseAdapter } from '../adapters/FirebaseAdapter';
import { LocalServerAdapter } from '../adapters/LocalServerAdapter';
import { CacheManager } from '../cache/CacheManager';
import firebaseService from '../../services/firebase.service';
import { apiGet, isUrlAccessible } from '../../services/api.service';

// Mock des dépendances
jest.mock('../../services/firebase.service', () => ({
  isAvailable: jest.fn(),
  getDevices: jest.fn()
}));

jest.mock('../../services/api.service', () => ({
  apiGet: jest.fn(),
  isUrlAccessible: jest.fn()
}));

jest.mock('../adapters/FirebaseAdapter');
jest.mock('../adapters/LocalServerAdapter');
jest.mock('../cache/CacheManager');

describe('DeviceRepository', () => {
  let repository;
  let mockFirebaseAdapter;
  let mockLocalAdapter;
  let mockCache;

  // Données de test
  const firebaseDevices = [
    { id: 'device1', name: 'Device 1', temperature: 22.5, humidity: 45 },
    { id: 'device2', name: 'Device 2', temperature: 23.1, humidity: 50 }
  ];

  const localDevices = [
    { id: 'device1', name: 'Device 1', last_temperature: 22.7, last_humidity: 46 },
    { id: 'device2', name: 'Device 2', last_temperature: 23.2, last_humidity: 51 }
  ];

  const normalizedFirebaseDevices = [
    { id: 'device1', name: 'Device 1', temperature: 22.5, humidity: 45, _source: 'firebase' },
    { id: 'device2', name: 'Device 2', temperature: 23.1, humidity: 50, _source: 'firebase' }
  ];

  const normalizedLocalDevices = [
    { id: 'device1', name: 'Device 1', temperature: 22.7, humidity: 46, _source: 'local' },
    { id: 'device2', name: 'Device 2', temperature: 23.2, humidity: 51, _source: 'local' }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up mock implementations
    FirebaseAdapter.mockImplementation(() => {
      return mockFirebaseAdapter = {
        normalizeDevices: jest.fn().mockReturnValue(normalizedFirebaseDevices),
        normalizeDevice: jest.fn(device => ({
          ...device,
          _source: 'firebase'
        })),
        source: 'firebase'
      };
    });

    LocalServerAdapter.mockImplementation(() => {
      return mockLocalAdapter = {
        normalizeDevices: jest.fn().mockReturnValue(normalizedLocalDevices),
        normalizeDevice: jest.fn(device => ({
          ...device,
          _source: 'local'
        })),
        source: 'local'
      };
    });

    CacheManager.mockImplementation(() => {
      return mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        clear: jest.fn()
      };
    });

    // Set up the repository
    repository = new DeviceRepository();
  });

  describe('isSourceAvailable', () => {
    test('should check Firebase availability', async () => {
      firebaseService.isAvailable.mockResolvedValue(true);

      const result = await repository.isSourceAvailable('firebase');

      expect(firebaseService.isAvailable).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should check local API availability', async () => {
      isUrlAccessible.mockResolvedValue(true);

      const result = await repository.isSourceAvailable('local');

      expect(isUrlAccessible).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      firebaseService.isAvailable.mockRejectedValue(new Error('Connection failed'));

      const result = await repository.isSourceAvailable('firebase');

      expect(result).toBe(false);
    });
  });

  describe('getFirebaseDevices', () => {
    test('should fetch and normalize Firebase devices', async () => {
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      const result = await repository.getFirebaseDevices();

      expect(firebaseService.getDevices).toHaveBeenCalled();
      expect(mockFirebaseAdapter.normalizeDevices).toHaveBeenCalledWith(firebaseDevices);
      expect(result).toEqual(normalizedFirebaseDevices);
    });

    test('should handle empty response', async () => {
      firebaseService.getDevices.mockResolvedValue([]);

      const result = await repository.getFirebaseDevices();

      expect(result).toEqual([]);
    });

    test('should handle errors', async () => {
      const error = new Error('Firebase error');
      firebaseService.getDevices.mockRejectedValue(error);

      await expect(repository.getFirebaseDevices()).rejects.toThrow('Firebase error');
    });
  });

  describe('getLocalDevices', () => {
    test('should fetch and normalize local devices', async () => {
      apiGet.mockResolvedValue(localDevices);

      const result = await repository.getLocalDevices();

      expect(apiGet).toHaveBeenCalled();
      expect(mockLocalAdapter.normalizeDevices).toHaveBeenCalledWith(localDevices);
      expect(result).toEqual(normalizedLocalDevices);
    });

    test('should handle errors', async () => {
      const error = new Error('Local API error');
      apiGet.mockRejectedValue(error);

      await expect(repository.getLocalDevices()).rejects.toThrow('Local API error');
    });
  });

  describe('getDevices', () => {
    test('should use cache when available', async () => {
      mockCache.get.mockReturnValue(normalizedFirebaseDevices);

      const result = await repository.getDevices({ source: 'firebase' });

      expect(mockCache.get).toHaveBeenCalledWith('devices_firebase');
      expect(firebaseService.getDevices).not.toHaveBeenCalled();
      expect(result).toEqual(normalizedFirebaseDevices);
    });

    test('should fetch from Firebase when specified', async () => {
      mockCache.get.mockReturnValue(null);
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      const result = await repository.getDevices({ source: 'firebase', forceRefresh: true });

      expect(firebaseService.getDevices).toHaveBeenCalled();
      expect(mockFirebaseAdapter.normalizeDevices).toHaveBeenCalledWith(firebaseDevices);
      expect(mockCache.set).toHaveBeenCalled();
      expect(result).toEqual(normalizedFirebaseDevices);
    });

    test('should fetch from local API when specified', async () => {
      mockCache.get.mockReturnValue(null);
      apiGet.mockResolvedValue(localDevices);

      const result = await repository.getDevices({ source: 'local' });

      expect(apiGet).toHaveBeenCalled();
      expect(mockLocalAdapter.normalizeDevices).toHaveBeenCalledWith(localDevices);
      expect(result).toEqual(normalizedLocalDevices);
    });

    test('should use Firebase when auto and Firebase is available', async () => {
      mockCache.get.mockReturnValue(null);
      firebaseService.isAvailable.mockResolvedValue(true);
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      const result = await repository.getDevices({ source: 'auto' });

      expect(firebaseService.isAvailable).toHaveBeenCalled();
      expect(firebaseService.getDevices).toHaveBeenCalled();
      expect(result).toEqual(normalizedFirebaseDevices);
    });

    test('should fall back to local when Firebase fails', async () => {
      mockCache.get.mockReturnValue(null);
      firebaseService.isAvailable.mockResolvedValue(true);
      firebaseService.getDevices.mockResolvedValue([]);  // Empty response
      isUrlAccessible.mockResolvedValue(true);
      apiGet.mockResolvedValue(localDevices);

      const result = await repository.getDevices({ source: 'auto' });

      expect(apiGet).toHaveBeenCalled();
      expect(result).toEqual(normalizedLocalDevices);
    });

    test('should return cached data on error if available', async () => {
      mockCache.get.mockImplementation(key => {
        // Return null on first call, cached data on second
        if (mockCache.get.mock.calls.length === 1) return null;
        return normalizedFirebaseDevices;
      });

      firebaseService.getDevices.mockRejectedValue(new Error('Network error'));

      const result = await repository.getDevices({ source: 'firebase' });

      expect(mockCache.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(normalizedFirebaseDevices);
    });
  });

  describe('getDevice', () => {
    test('should return a specific device by ID', async () => {
      const deviceId = 'device1';
      mockCache.get.mockReturnValue(null);
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      const result = await repository.getDevice(deviceId, { source: 'firebase' });

      expect(result).toEqual(normalizedFirebaseDevices[0]);
    });

    test('should return undefined for non-existent device', async () => {
      const deviceId = 'nonexistent';
      mockCache.get.mockReturnValue(null);
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      const result = await repository.getDevice(deviceId, { source: 'firebase' });

      expect(result).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    test('should clear the cache', () => {
      repository.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
});
