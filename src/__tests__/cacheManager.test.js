import { describe, it, expect, beforeEach, vi } from 'vitest';
import cacheManager from '../utils/cacheManager';

describe('Client-Side LRU Cache Manager', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  it('stores and retrieves cached items before TTL expires', () => {
    cacheManager.set('test_key', { value: 42 }, 5000);
    const result = cacheManager.get('test_key');
    expect(result).toEqual({ value: 42 });
  });

  it('returns null and purges item once TTL expires', () => {
    // Set 100ms TTL
    cacheManager.set('expired_key', 'some_data', 100);
    
    // Simulate passage of time
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 200);

    expect(cacheManager.get('expired_key')).toBeNull();
    vi.restoreAllMocks();
  });

  it('invalidates specific cache keys upon request', () => {
    cacheManager.set('trade_list', [1, 2, 3], 60000);
    cacheManager.invalidate('trade_list');
    expect(cacheManager.get('trade_list')).toBeNull();
  });
});
