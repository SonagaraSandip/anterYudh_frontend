import { describe, it, expect } from 'vitest';
import { calculateTradeCharges, calculateMtfInterest } from '../components/TradingView';

describe('Trading auto charge calculation (Groww Standard)', () => {
  it('calculates ADF Foods Delivery BUY charges matching Groww contract note (Image 1)', () => {
    // 70 Shares @ 272.50 = 19,075.00
    const buyCharges = calculateTradeCharges(70, 272.50, 'stock', true);
    // Groww breakdown: Brokerage (19.08) + Exch (0.59) + SEBI (0.02) + STT (19.00) + Stamp (2.86) + GST (3.54) = ~45.09
    expect(buyCharges).toBeGreaterThanOrEqual(44.5);
    expect(buyCharges).toBeLessThanOrEqual(46.0);
  });

  it('calculates ADF Foods Delivery SELL charges matching Groww contract note (Image 2)', () => {
    // 70 Shares @ 273.50 = 19,145.00
    const sellCharges = calculateTradeCharges(70, 273.50, 'stock', false);
    // Groww breakdown: Brokerage (19.15) + Exch (0.57) + SEBI (0.02) + IPFT (0.02) + STT (19.15) + DP (20.00) + GST (3.56) = ~62.45
    expect(sellCharges).toBeGreaterThanOrEqual(60.0);
    expect(sellCharges).toBeLessThanOrEqual(66.5);
    expect(sellCharges).toBe(62.45);
  });

  it('calculates PART 3 Delivery Trade example (100 TCS @ ₹3,000 Buy and @ ₹3,100 Sell)', () => {
    // Buy 100 shares @ 3,000 = ₹3,00,000
    const buyCost = calculateTradeCharges(100, 3000, 'stock', true);
    // Brokerage (20 capped) + STT (300) + Stamp (45) + Exch (8.91) + SEBI (0.30) + IPFT (0.30) + GST (5.31) = ~379.82
    expect(buyCost).toBeCloseTo(379.82, 1);

    // Sell 100 shares @ 3,100 = ₹3,10,000
    const sellCost = calculateTradeCharges(100, 3100, 'stock', false);
    // Brokerage (20 capped) + STT (310) + Exch (9.21) + SEBI (0.31) + IPFT (0.31) + DP (20) + GST (5.37) = ~365.20
    expect(sellCost).toBeCloseTo(365.20, 1);
  });

  it('calculates PART 5 Intraday Trade example (50 HDFC Bank @ ₹1,700 Buy and @ ₹1,720 Sell)', () => {
    // Buy 50 shares @ 1,700 = ₹85,000
    const buyCost = calculateTradeCharges(50, 1700, 'intraday', true);
    // Brokerage (20 capped) + Stamp (2.55) + Exch (2.52) + SEBI+IPFT (0.17) + GST (4.09) = ~29.33
    expect(buyCost).toBeCloseTo(29.33, 1);

    // Sell 50 shares @ 1,720 = ₹86,000
    const sellCost = calculateTradeCharges(50, 1720, 'intraday', false);
    // Brokerage (20 capped) + STT (21.50) + Exch (2.55) + SEBI+IPFT (0.17) + GST (4.09) = ~48.31
    expect(sellCost).toBeCloseTo(48.31, 1);
  });

  it('calculates PART 6 MTF Trade Brokerage (No ₹20 Cap) & Interest (14.95% p.a.)', () => {
    // Buy ₹1,00,000 shares on MTF: 0.1% = ₹100 (No cap for MTF)
    const mtfBuyCost = calculateTradeCharges(100, 1000, 'mtf', true);
    // Brokerage (100) + STT (100) + Stamp (15) + Exch (2.97) + SEBI+IPFT (0.20) + GST (18% on 103.17 = 18.57) = ~236.74
    expect(mtfBuyCost).toBeCloseTo(236.74, 1);

    // MTF Interest on ₹60,000 funded amount for 10 days @ 14.95%
    const interest = calculateMtfInterest(60000, 10, 14.95);
    // 60,000 * 0.1495 / 365 * 10 = ~245.75
    expect(interest).toBeCloseTo(245.75, 1);
  });
});
