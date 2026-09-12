import { describe, it, expect } from 'vitest';
import {
  calculateIpoCharges,
  calculateApplicationMetrics,
  calculateIpoMetrics
} from '../utils/ipoCalculator';

describe('ipoCalculator', () => {
  describe('calculateIpoCharges', () => {
    it('calculates 0 charges for IPO allotment (buy via ASBA)', () => {
      const charges = calculateIpoCharges(50, 300, true);
      expect(charges).toBe(0);
    });

    it('calculates delivery sell charges with STT and DP transaction charges', () => {
      const charges = calculateIpoCharges(50, 450, false);
      // Sell value = 22,500. STT (0.1%) = 22.5, DP charge = 20, Brokerage = min(20, 22.5) = 20, GST = 18%, etc.
      expect(charges).toBeGreaterThan(50);
      expect(charges).toBeLessThan(80);
    });
  });

  describe('calculateApplicationMetrics', () => {
    it('calculates simple closed exit with net profit and charges', () => {
      const app = {
        allotted: true,
        allottedShares: 50,
        allottedPrice: 300,
        sellPrice: 450,
        charges: 55
      };
      const ipo = { lotCost: 15000 };
      const m = calculateApplicationMetrics(app, ipo);

      expect(m.allottedShares).toBe(50);
      expect(m.allottedPrice).toBe(300);
      expect(m.totalInvested).toBe(15000);
      expect(m.totalSellRevenue).toBe(22500);
      expect(m.grossPnl).toBe(7500);
      expect(m.returnsInr).toBe(7500 - 55);
      expect(m.isFullyClosed).toBe(true);
      expect(m.remainingShares).toBe(0);
    });

    it('calculates multi-leg partial sell correctly', () => {
      const app = {
        allotted: true,
        allottedShares: 50,
        allottedPrice: 300,
        transactions: [
          { id: 'b1', type: 'BUY', price: 300, quantity: 50, charges: 0 },
          { id: 's1', type: 'SELL', price: 500, quantity: 25, charges: 30 }
        ]
      };
      const ipo = { lotCost: 15000 };
      const m = calculateApplicationMetrics(app, ipo);

      expect(m.allottedShares).toBe(50);
      expect(m.totalSellQty).toBe(25);
      expect(m.remainingShares).toBe(25);
      expect(m.isPartial).toBe(true);
      // Sold 25 shares @ 500 = 12500 revenue. Cost basis = 25 * 300 = 7500. Gross = 5000. Realized PnL = 5000 - 30 = 4970.
      expect(m.returnsInr).toBe(4970);
      expect(m.currentInvested).toBe(7500);
    });
  });

  describe('calculateIpoMetrics', () => {
    it('aggregates multiple allotted applications accurately', () => {
      const ipo = {
        lotCost: 15000,
        applications: [
          {
            personName: 'Person A',
            allotted: true,
            allottedShares: 50,
            allottedPrice: 300,
            sellPrice: 400,
            charges: 50
          },
          {
            personName: 'Person B',
            allotted: true,
            allottedShares: 50,
            allottedPrice: 300,
            sellPrice: 500,
            charges: 60
          },
          {
            personName: 'Person C',
            applied: true,
            allotted: false
          }
        ]
      };

      const m = calculateIpoMetrics(ipo);
      expect(m.allottedCount).toBe(2);
      expect(m.totalInvested).toBe(30000);
      // Person A profit: (20000 - 15000 - 50) = 4950
      // Person B profit: (25000 - 15000 - 60) = 9940
      // Total profit: 14890
      expect(m.profitLoss).toBe(14890);
      expect(m.charges).toBe(110);
      expect(m.isFullyClosed).toBe(true);
    });
  });
});
