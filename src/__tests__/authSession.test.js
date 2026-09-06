import { describe, it, expect, vi } from 'vitest';

describe('30-Minute Security Session & Master Auth', () => {
  const SESSION_DURATION_MS = 30 * 60 * 1000;

  const validateSession = (expiryTimestamp, currentTime) => {
    if (!expiryTimestamp) return false;
    const expiry = parseInt(expiryTimestamp, 10);
    return !isNaN(expiry) && currentTime < expiry;
  };

  const extendSession = (currentTime) => {
    return currentTime + SESSION_DURATION_MS;
  };

  it('validates session as active within 30 minutes of unlock', () => {
    const loginTime = 1750000000000;
    const sessionExpiry = loginTime + SESSION_DURATION_MS;
    
    // Check at 15 minutes after login
    const checkTime = loginTime + 15 * 60 * 1000;
    expect(validateSession(sessionExpiry.toString(), checkTime)).toBe(true);
  });

  it('invalidates session once 30 minutes have elapsed without activity', () => {
    const loginTime = 1750000000000;
    const sessionExpiry = loginTime + SESSION_DURATION_MS;
    
    // Check at 31 minutes after login
    const checkTime = loginTime + 31 * 60 * 1000;
    expect(validateSession(sessionExpiry.toString(), checkTime)).toBe(false);
  });

  it('extends session expiration on user activity', () => {
    const activityTime = 1750000900000;
    const newExpiry = extendSession(activityTime);
    expect(newExpiry).toBe(activityTime + (30 * 60 * 1000));
  });
});
