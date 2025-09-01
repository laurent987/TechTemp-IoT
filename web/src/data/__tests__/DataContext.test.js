/**
 * Tests unitaires pour la classe DataContext qui coordonne les repositories
 */
import { DataContext } from '../context/DataContext';
import { DeviceRepository } from '../repositories/DeviceRepository';
import { DeviceDataRepository } from '../repositories/DeviceDataRepository';
import { CacheManager } from '../cache/CacheManager';

// Mock des repositories
jest.mock('../repositories/DeviceRepository');
jest.mock('../repositories/DeviceDataRepository');
jest.mock('../cache/CacheManager');

describe('DataContext', () => {
  let dataContext;
  let mockDeviceRepo;
  let mockDeviceDataRepo;
  let mockCache;

  beforeEach(() => {
    mockDeviceRepo = new DeviceRepository();
    mockDeviceDataRepo = new DeviceDataRepository();
    mockCache = new CacheManager();

    // Reset all mock implementations
    jest.clearAllMocks();

    // Configure mocks
    mockDeviceRepo.getDevices.mockResolvedValue([
      { id: '1', name: 'Living Room Sensor', room: 'Living Room', temperature: 22, humidity: 45 },
      { id: '2', name: 'Kitchen Sensor', room: 'Kitchen', temperature: 23, humidity: 50 }
    ]);

    mockDeviceRepo.getDevice.mockImplementation(id => {
      const devices = {
        '1': { id: '1', name: 'Living Room Sensor', room: 'Living Room', temperature: 22, humidity: 45 },
        '2': { id: '2', name: 'Kitchen Sensor', room: 'Kitchen', temperature: 23, humidity: 50 }
      };
      return Promise.resolve(devices[id] || null);
    });

    mockDeviceDataRepo.getDeviceReadings.mockResolvedValue([
      { deviceId: '1', timestamp: '2023-01-01T12:00:00Z', temperature: 22, humidity: 45 }
    ]);

    mockDeviceDataRepo.getHistoricalData.mockResolvedValue([
      { deviceId: '1', timestamp: '2023-01-01T00:00:00Z', temperature: 21, humidity: 40 },
      { deviceId: '1', timestamp: '2023-01-02T00:00:00Z', temperature: 22, humidity: 42 }
    ]);

    dataContext = new DataContext({
      deviceRepository: mockDeviceRepo,
      deviceDataRepository: mockDeviceDataRepo,
      cache: mockCache
    });
  });

  describe('initialization', () => {
    test('should initialize with repositories', () => {
      expect(dataContext.deviceRepository).toBe(mockDeviceRepo);
      expect(dataContext.deviceDataRepository).toBe(mockDeviceDataRepo);
    });

    test('should throw error if repositories are missing', () => {
      expect(() => new DataContext({})).toThrow('DeviceRepository is required');
      expect(() => new DataContext({ deviceRepository: mockDeviceRepo }))
        .toThrow('DeviceDataRepository is required');
    });
  });

  describe('device methods', () => {
    test('getDevices should call repository method', async () => {
      const devices = await dataContext.getDevices();

      expect(mockDeviceRepo.getDevices).toHaveBeenCalled();
      expect(devices).toHaveLength(2);
      expect(devices[0].id).toBe('1');
    });

    test('getDevice should call repository method with id', async () => {
      const device = await dataContext.getDevice('1');

      expect(mockDeviceRepo.getDevice).toHaveBeenCalledWith('1', expect.anything());
      expect(device.id).toBe('1');
      expect(device.name).toBe('Living Room Sensor');
    });

    test('getDevicesByRoom should filter devices by room', async () => {
      const devices = await dataContext.getDevicesByRoom('Living Room');

      expect(mockDeviceRepo.getDevices).toHaveBeenCalled();
      expect(devices).toHaveLength(1);
      expect(devices[0].room).toBe('Living Room');
    });
  });

  describe('data methods', () => {
    test('getDeviceReadings should call repository method with id', async () => {
      const readings = await dataContext.getDeviceReadings('1');

      expect(mockDeviceDataRepo.getDeviceReadings).toHaveBeenCalledWith('1', expect.anything());
      expect(readings).toHaveLength(1);
      expect(readings[0].deviceId).toBe('1');
    });

    test('getHistoricalData should call repository method with params', async () => {
      const startDate = '2023-01-01T00:00:00Z';
      const endDate = '2023-01-02T00:00:00Z';

      const data = await dataContext.getHistoricalData('1', startDate, endDate);

      expect(mockDeviceDataRepo.getHistoricalData).toHaveBeenCalledWith('1', startDate, endDate, expect.anything());
      expect(data).toHaveLength(2);
    });

    test('getDeviceWithReadings should combine device and readings', async () => {
      const result = await dataContext.getDeviceWithReadings('1');

      expect(mockDeviceRepo.getDevice).toHaveBeenCalledWith('1', expect.anything());
      expect(mockDeviceDataRepo.getDeviceReadings).toHaveBeenCalledWith('1', expect.anything());

      expect(result.device.id).toBe('1');
      expect(result.readings).toHaveLength(1);
      expect(result.readings[0].deviceId).toBe('1');
    });
  });

  describe('refresh methods', () => {
    test('refreshDevice should invalidate cache and reload device', async () => {
      await dataContext.refreshDevice('1');

      expect(mockCache.invalidate).toHaveBeenCalledWith('device:1');
      expect(mockDeviceRepo.getDevice).toHaveBeenCalledWith('1', { forceRefresh: true });
    });

    test('refreshDevices should invalidate cache and reload all devices', async () => {
      await dataContext.refreshDevices();

      expect(mockCache.invalidate).toHaveBeenCalledWith('devices');
      expect(mockDeviceRepo.getDevices).toHaveBeenCalledWith({ forceRefresh: true });
    });

    test('refreshData should invalidate cache and reload device readings', async () => {
      await dataContext.refreshDeviceData('1');

      expect(mockCache.invalidate).toHaveBeenCalledWith('readings:1');
      expect(mockDeviceDataRepo.getDeviceReadings).toHaveBeenCalledWith('1', { forceRefresh: true });
    });
  });

  describe('error handling', () => {
    test('should handle repository errors gracefully', async () => {
      mockDeviceRepo.getDevices.mockRejectedValue(new Error('Repository error'));

      await expect(dataContext.getDevices()).rejects.toThrow('Failed to fetch devices: Repository error');
    });

    test('should return null for missing device', async () => {
      const device = await dataContext.getDevice('non-existent');
      expect(device).toBeNull();
    });
  });
});
