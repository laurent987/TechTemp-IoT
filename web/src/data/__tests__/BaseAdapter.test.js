/**
 * Tests unitaires pour BaseAdapter
 */
import { BaseAdapter } from '../adapters/BaseAdapter';

describe('BaseAdapter', () => {
  let adapter;

  beforeEach(() => {
    // Create a minimal implementation of BaseAdapter for testing
    adapter = new class TestAdapter extends BaseAdapter {
      normalize(data) {
        return data;
      }
    }('test');
  });

  describe('cleanValue', () => {
    test('should return defaultValue for null', () => {
      expect(adapter.cleanValue(null, 'default')).toBe('default');
    });

    test('should return defaultValue for undefined', () => {
      expect(adapter.cleanValue(undefined, 'default')).toBe('default');
    });

    test('should return original number', () => {
      expect(adapter.cleanValue(42)).toBe(42);
    });

    test('should convert string number to number', () => {
      expect(adapter.cleanValue('42')).toBe(42);
    });

    test('should handle non-numeric strings', () => {
      expect(adapter.cleanValue('text')).toBe('text');
    });
  });

  describe('normalizeTimestamp', () => {
    test('should handle ISO string dates', () => {
      const isoDate = '2023-09-01T12:00:00.000Z';
      expect(adapter.normalizeTimestamp(isoDate)).toBe(isoDate);
    });

    test('should convert unix timestamp (seconds) to ISO', () => {
      const unixTimestamp = 1630504800; // 2021-09-01 12:00:00 UTC in seconds
      const result = adapter.normalizeTimestamp(unixTimestamp);
      expect(new Date(result).getTime()).toBe(unixTimestamp * 1000);
    });

    test('should handle millisecond timestamps', () => {
      const msTimestamp = 1630504800000; // 2021-09-01 12:00:00 UTC in ms
      const result = adapter.normalizeTimestamp(msTimestamp);
      expect(new Date(result).getTime()).toBe(msTimestamp);
    });

    test('should return current time for invalid input', () => {
      const invalidDate = 'not-a-date';
      const result = adapter.normalizeTimestamp(invalidDate);

      // Allow for small time difference during test execution
      const now = new Date().toISOString();
      const resultTime = new Date(result).getTime();
      const nowTime = new Date(now).getTime();

      expect(Math.abs(resultTime - nowTime)).toBeLessThan(1000);
    });
  });

  describe('validate', () => {
    test('should throw error for null data', () => {
      expect(() => adapter.validate(null)).toThrow('Data is required');
    });

    test('should return data if valid', () => {
      const data = { test: 'value' };
      expect(adapter.validate(data)).toBe(data);
    });
  });

  describe('withDefaults', () => {
    test('should apply defaults to empty object', () => {
      const defaults = { a: 1, b: 2 };
      const data = {};
      expect(adapter.withDefaults(data, defaults)).toEqual(defaults);
    });

    test('should override defaults with provided data', () => {
      const defaults = { a: 1, b: 2, c: 3 };
      const data = { b: 20, d: 40 };
      expect(adapter.withDefaults(data, defaults)).toEqual({ a: 1, b: 20, c: 3, d: 40 });
    });
  });
});
