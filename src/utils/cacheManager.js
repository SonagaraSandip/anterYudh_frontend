/**
 * AntarYudh Smart Cache & Session Manager
 * Features:
 * 1. Stale-While-Revalidate (SWR): Instant 0ms cache rendering + background fresh sync
 * 2. In-Memory + LocalStorage multi-layer caching with TTL
 * 3. Cache invalidation on mutations (Add/Edit/Delete)
 * 4. Session state persistence for seamless reconnects
 */

const MEMORY_CACHE = new Map();
const DEFAULT_TTL = 60 * 1000; // 1 minute default TTL

export const cacheManager = {
  /**
   * Read from cache (Memory first, then LocalStorage)
   */
  get(key, fallback = null) {
    // 1. Check memory cache
    if (MEMORY_CACHE.has(key)) {
      const item = MEMORY_CACHE.get(key);
      if (Date.now() < item.expiry) {
        return item.data;
      }
      MEMORY_CACHE.delete(key);
    }

    // 2. Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`ay_cache_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (!parsed.expiry || Date.now() < parsed.expiry)) {
            // Restore to memory cache
            MEMORY_CACHE.set(key, parsed);
            return parsed.data;
          }
          localStorage.removeItem(`ay_cache_${key}`);
        }
      } catch {
        // Ignore parse error
      }
    }

    if (typeof fallback === 'function') {
      try {
        return fallback();
      } catch {
        return null;
      }
    }
    return fallback;
  },

  /**
   * Set cache with TTL
   */
  set(key, data, ttlMs = DEFAULT_TTL) {
    const payload = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMs
    };

    // Save in memory
    MEMORY_CACHE.set(key, payload);

    // Save in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ay_cache_${key}`, JSON.stringify(payload));
      } catch {
        // Ignore storage quota error
      }
    }
  },

  /**
   * Stale-While-Revalidate (SWR) Fetcher
   * Returns cached data immediately if available, then updates in background.
   */
  async fetchWithSWR(key, fetchFn, { ttl = DEFAULT_TTL, onUpdate } = {}) {
    const cached = this.get(key);

    // Run fetch in background
    const bgFetch = async () => {
      try {
        const freshData = await fetchFn();
        if (freshData !== undefined && freshData !== null) {
          this.set(key, freshData, ttl);
          if (typeof onUpdate === 'function') {
            onUpdate(freshData);
          }
          return freshData;
        }
      } catch (err) {
        console.warn(`[CacheManager] Background sync for '${key}' failed:`, err.message);
      }
      return cached;
    };

    if (cached !== null) {
      // Trigger background sync without awaiting
      bgFetch();
      return cached;
    }

    // No cache: await fresh data
    return await bgFetch();
  },

  /**
   * Invalidate specific keys or patterns
   */
  invalidate(keyOrPattern) {
    // Clear matching memory keys
    for (const k of MEMORY_CACHE.keys()) {
      if (k === keyOrPattern || k.startsWith(keyOrPattern)) {
        MEMORY_CACHE.delete(k);
      }
    }

    // Clear matching localStorage keys
    if (typeof window !== 'undefined') {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key === `ay_cache_${keyOrPattern}` || key.startsWith(`ay_cache_${keyOrPattern}`))) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Clear all cache entries
   */
  clear() {
    MEMORY_CACHE.clear();
    if (typeof window !== 'undefined') {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ay_cache_')) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Session Storage Helpers
   */
  session: {
    get(key, fallback = null) {
      if (typeof window === 'undefined') return fallback;
      try {
        const raw = sessionStorage.getItem(`ay_sess_${key}`);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, val) {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(`ay_sess_${key}`, JSON.stringify(val));
      } catch {
        // Ignore
      }
    },
    remove(key) {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.removeItem(`ay_sess_${key}`);
      } catch {
        // Ignore
      }
    }
  }
};

export default cacheManager;
