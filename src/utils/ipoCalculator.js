/**
 * IPO Allotment, Trade & Statutory Charges Calculation Engine
 */

/**
 * Standard Equity Delivery Charges Auto-Calculator for IPO Allotments & Sells
 * (Brokerage, STT, Exchange Turnover, SEBI Fees, GST, Stamp Duty, DP Transaction Charge)
 */
export const calculateIpoCharges = (quantity, price, isBuy = false) => {
  const qty = parseFloat(quantity) || 0;
  const prc = parseFloat(price) || 0;
  const tradeValue = qty * prc;
  if (tradeValue <= 0) return 0;

  // Zerodha / AngelOne / Groww delivery charges
  const brokerage = isBuy ? 0 : Math.min(20, tradeValue * 0.0005);
  const exchangeCharge = tradeValue * 0.0000325; // NSE 0.00325%
  const sebiCharge = tradeValue * 0.000001; // SEBI ₹10 / crore
  const gst = 0.18 * (brokerage + exchangeCharge + sebiCharge); // 18% GST

  // Delivery Stamp Duty: 0.015% on Buy, 0 on Sell
  const stampDuty = isBuy ? (tradeValue * 0.00015) : 0;
  // Delivery STT: 0.1% on Buy and Sell (for IPO allotment, ASBA buy STT is 0, sell STT is 0.1%)
  const stt = isBuy ? 0 : (tradeValue * 0.001);
  // DP Charge: ₹15.93 to ₹21.50 per scrip per day on selling delivery shares
  const dpCharge = (!isBuy) ? 20.00 : 0;

  const totalCharges = brokerage + exchangeCharge + sebiCharge + gst + stampDuty + stt + dpCharge;
  return Math.round(totalCharges * 100) / 100;
};

/**
 * Calculate detailed metrics for an individual Demat application
 */
export const calculateApplicationMetrics = (app, ipo) => {
  if (!app) return null;

  const lotCost = parseFloat(ipo?.lotCost) || 0;
  const rawAllottedShares = parseInt(app.allottedShares, 10) || 0;
  const rawAllottedPrice = parseFloat(app.allottedPrice) || 0;

  // Derive estimated shares or price from lotCost if one is missing
  let allottedShares = rawAllottedShares;
  let allottedPrice = rawAllottedPrice;

  if (allottedShares === 0 && allottedPrice > 0 && lotCost > 0) {
    allottedShares = Math.round(lotCost / allottedPrice);
  } else if (allottedShares > 0 && allottedPrice === 0 && lotCost > 0) {
    allottedPrice = Math.round((lotCost / allottedShares) * 100) / 100;
  } else if (allottedShares === 0 && allottedPrice === 0 && lotCost > 0) {
    allottedShares = 1;
    allottedPrice = lotCost;
  }

  const rawTx = Array.isArray(app.transactions) ? app.transactions : [];

  if (rawTx.length > 0) {
    const buyLegs = rawTx.filter((l) => l.type === 'BUY');
    const sellLegs = rawTx.filter((l) => l.type === 'SELL');

    const totalBuyQty = buyLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0) || (allottedShares || 1);
    const totalBuyCost = buyLegs.length > 0
      ? buyLegs.reduce((acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0), 0)
      : (allottedShares * allottedPrice || lotCost);
    const avgBuyPrice = totalBuyQty > 0 ? (totalBuyCost / totalBuyQty) : (allottedPrice || lotCost);

    const totalSellQty = sellLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
    const totalSellRevenue = sellLegs.reduce(
      (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
      0
    );
    const avgSellPrice = totalSellQty > 0 ? (totalSellRevenue / totalSellQty) : null;

    const remainingShares = Math.max(0, totalBuyQty - totalSellQty);
    const totalBuyCharges = buyLegs.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);
    const totalSellCharges = sellLegs.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);
    const totalCharges = rawTx.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);

    const hasSells = totalSellQty > 0;
    const isFullyClosed = totalBuyQty > 0 && totalSellQty >= totalBuyQty;
    const isPartial = totalSellQty > 0 && totalSellQty < totalBuyQty;
    const isOpen = totalSellQty === 0;

    const costBasisOfSold = totalSellQty * avgBuyPrice;
    const soldRatio = totalBuyQty > 0 ? Math.min(1, totalSellQty / totalBuyQty) : 0;
    const realizedBuyCharges = totalBuyCharges * soldRatio;
    const realizedCharges = totalSellCharges + realizedBuyCharges;

    const grossPnl = hasSells ? (totalSellRevenue - costBasisOfSold) : null;
    const returnsInr = hasSells ? (totalSellRevenue - costBasisOfSold - realizedCharges) : null;
    const returnsPercent = hasSells && costBasisOfSold > 0 ? (returnsInr / costBasisOfSold) * 100 : 0;

    const currentInvested = remainingShares * avgBuyPrice;
    const latestSellDate = sellLegs.length > 0 ? sellLegs[sellLegs.length - 1].date : null;

    return {
      allottedShares: totalBuyQty,
      allottedPrice: avgBuyPrice,
      totalInvested: totalBuyCost,
      currentInvested,
      totalSellQty,
      avgSellPrice,
      totalSellRevenue: hasSells ? totalSellRevenue : null,
      remainingShares,
      hasSells,
      isFullyClosed,
      isPartial,
      isOpen,
      grossPnl,
      returnsInr,
      returnsPercent,
      charges: isFullyClosed ? totalCharges : (hasSells ? realizedCharges : totalBuyCharges),
      totalGrossCharges: totalCharges,
      realizedCharges,
      latestSellDate,
      legs: rawTx,
      hasDetails: true
    };
  }

  // Single-sell / simple allotment format
  const shares = allottedShares > 0 ? allottedShares : 1;
  const price = allottedPrice > 0 ? allottedPrice : (lotCost > 0 ? lotCost / shares : 0);
  const totalInvested = price * shares > 0 ? price * shares : lotCost;

  const hasSellPrice =
    app.sellPrice !== null &&
    app.sellPrice !== undefined &&
    app.sellPrice !== '' &&
    !isNaN(parseFloat(app.sellPrice));

  const sellPrice = hasSellPrice ? parseFloat(app.sellPrice) : null;
  const totalSellRevenue = hasSellPrice ? (sellPrice * shares) : null;
  const charges = parseFloat(app.charges) || (hasSellPrice ? calculateIpoCharges(shares, sellPrice, false) : 0);

  let grossPnl = null;
  let returnsInr = null;
  let returnsPercent = null;

  if (hasSellPrice) {
    grossPnl = totalSellRevenue - totalInvested;
    returnsInr = totalSellRevenue - totalInvested - charges;
    returnsPercent = totalInvested > 0 ? (returnsInr / totalInvested) * 100 : 0;
  }

  const isFullyClosed = hasSellPrice;
  const isOpen = !hasSellPrice;

  return {
    allottedShares: shares,
    allottedPrice: price,
    totalInvested,
    currentInvested: isFullyClosed ? 0 : totalInvested,
    totalSellQty: isFullyClosed ? shares : 0,
    avgSellPrice: sellPrice,
    totalSellRevenue,
    remainingShares: isFullyClosed ? 0 : shares,
    hasSells: hasSellPrice,
    isFullyClosed,
    isPartial: false,
    isOpen,
    grossPnl,
    returnsInr,
    returnsPercent,
    charges,
    totalGrossCharges: charges,
    realizedCharges: isFullyClosed ? charges : 0,
    latestSellDate: app.sellDate || null,
    legs: [
      {
        id: 'allotment-entry',
        type: 'BUY',
        date: ipo?.createdAt ? String(ipo.createdAt).slice(0, 10) : new Date().toISOString().split('T')[0],
        price,
        quantity: shares,
        charges: 0,
        notes: 'IPO Allotment'
      },
      ...(hasSellPrice
        ? [
            {
              id: 'full-sell-exit',
              type: 'SELL',
              date: app.sellDate || new Date().toISOString().split('T')[0],
              price: sellPrice,
              quantity: shares,
              charges,
              notes: 'Full Exit'
            }
          ]
        : [])
    ],
    hasDetails: Boolean(rawAllottedShares > 0 || rawAllottedPrice > 0 || hasSellPrice || rawTx.length > 0)
  };
};

/**
 * Calculate aggregated metrics across all Demat applications for an IPO
 */
export const calculateIpoMetrics = (ipo) => {
  if (!ipo) return { profitLoss: 0, totalInvested: 0, percentage: null, charges: 0, allottedCount: 0 };

  const manualPl = parseFloat(ipo.profitLoss) || 0;
  const rawLotCost = parseFloat(ipo.lotCost) || 0;
  const rawLotSize = parseInt(ipo.lotSize, 10) || 0;
  const rawIssuePrice = parseFloat(ipo.issuePrice) || 0;
  const applications = ipo.applications || [];

  // Derive effective lotCost, lotSize, and issuePrice from applications if not explicitly set
  let effectiveLotCost = rawLotCost;
  let effectiveLotSize = rawLotSize;
  let effectiveIssuePrice = rawIssuePrice;

  const appWithDetails = applications.find(
    (a) => (parseInt(a.allottedShares, 10) > 0 && parseFloat(a.allottedPrice) > 0) ||
           parseInt(a.allottedShares, 10) > 0 ||
           parseFloat(a.allottedPrice) > 0
  );

  if (appWithDetails) {
    if (effectiveLotSize === 0 && parseInt(appWithDetails.allottedShares, 10) > 0) {
      effectiveLotSize = parseInt(appWithDetails.allottedShares, 10);
    }
    if (effectiveIssuePrice === 0 && parseFloat(appWithDetails.allottedPrice) > 0) {
      effectiveIssuePrice = parseFloat(appWithDetails.allottedPrice);
    }
    if (effectiveLotCost === 0) {
      if (effectiveLotSize > 0 && effectiveIssuePrice > 0) {
        effectiveLotCost = Math.round(effectiveLotSize * effectiveIssuePrice * 100) / 100;
      }
    }
  }

  const allottedApps = applications.filter((a) => a.allotted);
  const allottedCount = allottedApps.length;

  if (allottedCount === 0) {
    const defaultCost = effectiveLotCost > 0 ? effectiveLotCost : 0;
    const pct = defaultCost > 0 && manualPl !== 0 ? (manualPl / defaultCost) * 100 : null;
    return {
      profitLoss: manualPl,
      totalInvested: defaultCost,
      currentInvested: defaultCost,
      percentage: pct,
      charges: 0,
      allottedCount: 0,
      totalAllottedShares: 0,
      totalRemainingShares: 0,
      hasDetails: false,
      isFullyClosed: false,
      isOpen: true,
      hasSells: false,
      effectiveLotCost,
      effectiveLotSize,
      effectiveIssuePrice
    };
  }

  let totalRealizedPnl = 0;
  let totalInvestedCost = 0;
  let totalCurrentInvested = 0;
  let totalCharges = 0;
  let totalAllottedShares = 0;
  let totalRemainingShares = 0;
  let hasAnyDetails = false;
  let hasAnySells = false;
  let closedCount = 0;

  allottedApps.forEach((app) => {
    const m = calculateApplicationMetrics(app, ipo);
    if (m.hasDetails) hasAnyDetails = true;

    totalInvestedCost += m.totalInvested;
    totalCurrentInvested += m.currentInvested;
    totalAllottedShares += m.allottedShares;
    totalRemainingShares += m.remainingShares;
    totalCharges += m.charges;

    if (m.hasSells && m.returnsInr !== null) {
      hasAnySells = true;
      totalRealizedPnl += m.returnsInr;
      if (m.isFullyClosed) closedCount += 1;
    }
  });

  // If none of the applications have sell details yet, fallback to manual IPO profitLoss if provided
  const finalProfitLoss = hasAnySells ? totalRealizedPnl : manualPl;
  const fallbackInvested = totalInvestedCost > 0 ? totalInvestedCost : (allottedCount * effectiveLotCost || effectiveLotCost);
  const finalPercent = fallbackInvested > 0 && (hasAnySells || manualPl !== 0)
    ? (finalProfitLoss / fallbackInvested) * 100
    : null;

  return {
    profitLoss: finalProfitLoss,
    totalInvested: fallbackInvested,
    currentInvested: totalCurrentInvested,
    percentage: finalPercent,
    charges: totalCharges,
    allottedCount,
    totalAllottedShares,
    totalRemainingShares,
    hasDetails: hasAnyDetails,
    isFullyClosed: closedCount === allottedCount && allottedCount > 0,
    isPartial: hasAnySells && closedCount < allottedCount,
    isOpen: !hasAnySells,
    hasSells: hasAnySells,
    effectiveLotCost,
    effectiveLotSize,
    effectiveIssuePrice
  };
};
