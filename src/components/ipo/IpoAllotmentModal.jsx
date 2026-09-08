import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  TrendingUp,
  TrendingDown,
  Layers,
  Coins,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Split,
  Calculator
} from 'lucide-react';
import clsx from 'clsx';
import { calculateIpoCharges, calculateApplicationMetrics } from '../../utils/ipoCalculator';

export function IpoAllotmentModal({
  isOpen,
  onClose,
  ipo,
  personName,
  application,
  onSaveAllotment
}) {
  if (!isOpen || !ipo || !personName) return null;

  const lotCost = parseFloat(ipo.lotCost) || 0;
  const initialApp = application || {};
  const metrics = calculateApplicationMetrics(initialApp, ipo);

  // Mode: 'simple' (Single full/standard exit) | 'multileg' (Multiple partial sell tranches)
  const hasMultipleLegs = Array.isArray(initialApp.transactions) && initialApp.transactions.length > 1;
  const [mode, setMode] = useState(hasMultipleLegs ? 'multileg' : 'simple');

  // Allotment inputs
  const [allottedShares, setAllottedShares] = useState(() => {
    if (initialApp.allottedShares > 0) return String(initialApp.allottedShares);
    if (lotCost > 0 && initialApp.allottedPrice > 0) return String(Math.round(lotCost / initialApp.allottedPrice));
    return '1';
  });

  const [allottedPrice, setAllottedPrice] = useState(() => {
    if (initialApp.allottedPrice > 0) return String(initialApp.allottedPrice);
    if (lotCost > 0 && parseInt(allottedShares, 10) > 0) return String(Math.round((lotCost / parseInt(allottedShares, 10)) * 100) / 100);
    return lotCost > 0 ? String(lotCost) : '';
  });

  const [allotmentCharges, setAllotmentCharges] = useState('0');

  // Simple Exit Mode inputs
  const [isExited, setIsExited] = useState(() => {
    return initialApp.sellPrice !== null && initialApp.sellPrice !== undefined && initialApp.sellPrice !== '';
  });

  const [sellPrice, setSellPrice] = useState(() => {
    return initialApp.sellPrice !== null && initialApp.sellPrice !== undefined ? String(initialApp.sellPrice) : '';
  });

  const [sellDate, setSellDate] = useState(() => {
    return initialApp.sellDate ? initialApp.sellDate.slice(0, 10) : new Date().toISOString().split('T')[0];
  });

  const [simpleCharges, setSimpleCharges] = useState(() => {
    if (initialApp.charges !== undefined && initialApp.charges !== null && initialApp.charges > 0) {
      return String(initialApp.charges);
    }
    const q = parseInt(allottedShares, 10) || 1;
    const sp = parseFloat(sellPrice) || 0;
    return sp > 0 ? String(calculateIpoCharges(q, sp, false)) : '20';
  });

  const [notes, setNotes] = useState(() => initialApp.notes || '');

  // Multi-Leg Partial Sells
  const [legs, setLegs] = useState(() => {
    if (Array.isArray(initialApp.transactions) && initialApp.transactions.length > 0) {
      return initialApp.transactions.map((l) => ({
        id: l.id || `leg-${Math.random()}`,
        type: l.type || 'SELL',
        date: l.date ? l.date.slice(0, 10) : new Date().toISOString().split('T')[0],
        price: String(l.price ?? ''),
        quantity: String(l.quantity ?? '1'),
        charges: String(l.charges ?? '0'),
        notes: l.notes || ''
      }));
    }
    return [
      {
        id: `leg-buy-${Date.now()}`,
        type: 'BUY',
        date: ipo.createdAt ? String(ipo.createdAt).slice(0, 10) : new Date().toISOString().split('T')[0],
        price: allottedPrice,
        quantity: allottedShares,
        charges: '0',
        notes: 'IPO Allotment'
      }
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate charges for simple exit when shares or sell price change
  useEffect(() => {
    if (mode === 'simple' && isExited && sellPrice) {
      const q = parseInt(allottedShares, 10) || 0;
      const sp = parseFloat(sellPrice) || 0;
      if (q > 0 && sp > 0) {
        const auto = calculateIpoCharges(q, sp, false);
        setSimpleCharges(String(auto));
      }
    }
  }, [allottedShares, sellPrice, isExited, mode]);

  // Total Allotment Cost Calculation
  const totalAllotmentCost = (parseInt(allottedShares, 10) || 0) * (parseFloat(allottedPrice) || 0);

  // Real-time Preview in Simple Mode
  const simpleSellQty = parseInt(allottedShares, 10) || 0;
  const simpleSellPrc = parseFloat(sellPrice) || 0;
  const simpleSellRevenue = simpleSellQty * simpleSellPrc;
  const simpleChargesNum = parseFloat(simpleCharges) || 0;
  const simpleNetPnl = isExited && simpleSellPrc > 0 ? (simpleSellRevenue - totalAllotmentCost - simpleChargesNum) : null;
  const simplePnlPercent = simpleNetPnl !== null && totalAllotmentCost > 0 ? (simpleNetPnl / totalAllotmentCost) * 100 : 0;

  // Real-time Multi-Leg Calculations
  const multiBuyLegs = legs.filter((l) => l.type === 'BUY');
  const multiSellLegs = legs.filter((l) => l.type === 'SELL');
  const multiTotalBuyQty = multiBuyLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
  const multiTotalSellQty = multiSellLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
  const multiRemainingQty = Math.max(0, multiTotalBuyQty - multiTotalSellQty);
  const multiSellRevenue = multiSellLegs.reduce(
    (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
    0
  );
  const multiTotalCharges = legs.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);
  const avgMultiBuyPrice = parseFloat(allottedPrice) || 0;
  const multiSoldCostBasis = multiTotalSellQty * avgMultiBuyPrice;
  const multiNetPnl = multiSellLegs.length > 0 ? (multiSellRevenue - multiSoldCostBasis - multiTotalCharges) : null;
  const multiPnlPercent = multiNetPnl !== null && multiSoldCostBasis > 0 ? (multiNetPnl / multiSoldCostBasis) * 100 : 0;

  // Currency helper
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  // Add partial sell leg
  const handleAddSellLeg = () => {
    const defaultQty = multiRemainingQty > 0 ? String(multiRemainingQty) : '1';
    const defaultPrice = sellPrice || allottedPrice || '0';
    const autoChg = calculateIpoCharges(parseInt(defaultQty, 10) || 1, parseFloat(defaultPrice) || 0, false);

    setLegs((prev) => [
      ...prev,
      {
        id: `leg-sell-${Date.now()}`,
        type: 'SELL',
        date: new Date().toISOString().split('T')[0],
        price: defaultPrice,
        quantity: defaultQty,
        charges: String(autoChg),
        notes: multiSellLegs.length === 0 ? 'Partial Exit' : `Tranche ${multiSellLegs.length + 1}`
      }
    ]);
  };

  // Remove leg
  const handleRemoveLeg = (id) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  // Update leg field
  const handleUpdateLeg = (id, field, value) => {
    setLegs((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const q = parseInt(field === 'quantity' ? value : l.quantity, 10) || 0;
          const p = parseFloat(field === 'price' ? value : l.price) || 0;
          if (q > 0 && p > 0 && l.type === 'SELL') {
            updated.charges = String(calculateIpoCharges(q, p, false));
          }
        }
        return updated;
      })
    );
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const cleanShares = parseInt(allottedShares, 10) || 1;
      const cleanPrice = parseFloat(allottedPrice) || 0;

      let transactionsPayload = null;
      let finalSellPrice = null;
      let finalSellDate = null;
      let finalCharges = 0;

      if (mode === 'simple') {
        finalSellPrice = isExited && sellPrice ? parseFloat(sellPrice) : null;
        finalSellDate = isExited && sellPrice ? sellDate : null;
        finalCharges = isExited ? (parseFloat(simpleCharges) || 0) : 0;

        transactionsPayload = [
          {
            id: `leg-buy-${Date.now()}`,
            type: 'BUY',
            date: ipo.createdAt ? String(ipo.createdAt).slice(0, 10) : new Date().toISOString().split('T')[0],
            price: cleanPrice,
            quantity: cleanShares,
            charges: parseFloat(allotmentCharges) || 0,
            notes: 'IPO Allotment'
          },
          ...(isExited && finalSellPrice
            ? [
                {
                  id: `leg-sell-${Date.now() + 1}`,
                  type: 'SELL',
                  date: finalSellDate || new Date().toISOString().split('T')[0],
                  price: finalSellPrice,
                  quantity: cleanShares,
                  charges: finalCharges,
                  notes: 'Full Exit'
                }
              ]
            : [])
        ];
      } else {
        // Multi-leg mode
        transactionsPayload = legs.map((l) => ({
          ...l,
          quantity: parseInt(l.quantity, 10) || 1,
          price: parseFloat(l.price) || 0,
          charges: parseFloat(l.charges) || 0
        }));

        const sLegs = transactionsPayload.filter((l) => l.type === 'SELL');
        const sQty = sLegs.reduce((acc, l) => acc + l.quantity, 0);
        const sRev = sLegs.reduce((acc, l) => acc + l.price * l.quantity, 0);
        finalSellPrice = sQty > 0 ? sRev / sQty : null;
        finalSellDate = sLegs.length > 0 ? sLegs[sLegs.length - 1].date : null;
        finalCharges = transactionsPayload.reduce((acc, l) => acc + l.charges, 0);
      }

      await onSaveAllotment({
        personName,
        allotted: true,
        applied: true,
        allottedShares: cleanShares,
        allottedPrice: cleanPrice,
        sellPrice: finalSellPrice,
        sellDate: finalSellDate,
        charges: finalCharges,
        transactions: transactionsPayload,
        notes: notes.trim()
      });

      onClose();
    } catch (err) {
      console.error('Failed to save allotment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/90 overflow-hidden my-auto max-h-[92vh] flex flex-col z-[100000] animate-slideDown"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base truncate">Allotment & Trade Manager</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-semibold border border-indigo-500/30 shrink-0">
                  {personName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {ipo.ipoName} • Setup issue price, shares & selling tranches
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition active:scale-90 shrink-0 ml-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Section 1: Allotment Position Setup */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-400" />
                1. Allotment Basis
              </span>
              <span className="text-xs font-mono text-indigo-300 font-bold bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-500/30">
                Total Cost: {formatCurrency(totalAllotmentCost)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Allotted Shares <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={allottedShares}
                  onChange={(e) => {
                    setAllottedShares(e.target.value);
                    if (mode === 'multileg' && legs.length > 0 && legs[0].type === 'BUY') {
                      handleUpdateLeg(legs[0].id, 'quantity', e.target.value);
                    }
                  }}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Issue / Allotment Price (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={allottedPrice}
                  onChange={(e) => {
                    setAllottedPrice(e.target.value);
                    if (mode === 'multileg' && legs.length > 0 && legs[0].type === 'BUY') {
                      handleUpdateLeg(legs[0].id, 'price', e.target.value);
                    }
                  }}
                  placeholder="e.g. 300"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Mode Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              2. Selling & Realized Profit/Loss
            </span>
            <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('simple')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition active:scale-95',
                  mode === 'simple'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Simple Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('multileg');
                  if (legs.filter((l) => l.type === 'SELL').length === 0 && isExited && sellPrice) {
                    handleAddSellLeg();
                  }
                }}
                className={clsx(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1 active:scale-95',
                  mode === 'multileg'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Split className="w-3 h-3" />
                <span>Partial Sells</span>
              </button>
            </div>
          </div>

          {/* Simple Exit Mode */}
          {mode === 'simple' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isExited}
                    onChange={(e) => setIsExited(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">
                    Shares Sold / Closed Position
                  </span>
                </label>
                {isExited && (
                  <span className="text-[11px] text-slate-400">
                    Auto-calculates STT (0.1%), DP fees (₹20), GST & SEBI
                  </span>
                )}
              </div>

              {isExited && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Selling Price per Share (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required={isExited}
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Sell Date
                    </label>
                    <input
                      type="date"
                      value={sellDate}
                      onChange={(e) => setSellDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-400">
                        Total Charges (₹)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const q = parseInt(allottedShares, 10) || 0;
                          const sp = parseFloat(sellPrice) || 0;
                          if (q > 0 && sp > 0) {
                            setSimpleCharges(String(calculateIpoCharges(q, sp, false)));
                          }
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 active:scale-95"
                        title="Recalculate statutory delivery charges"
                      >
                        <Calculator className="w-2.5 h-2.5" />
                        <span>Auto-Calc</span>
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={simpleCharges}
                      onChange={(e) => setSimpleCharges(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Simple Mode Live Calculation Banner */}
              {isExited && simpleSellPrc > 0 && (
                <div
                  className={clsx(
                    'p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in',
                    simpleNetPnl >= 0
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Gross: {formatCurrency(simpleSellRevenue - totalAllotmentCost)}</span>
                      <span>•</span>
                      <span>Charges: {formatCurrency(simpleChargesNum)}</span>
                    </div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>Net Realized P&L:</span>
                      <span className="font-mono text-base">
                        {simpleNetPnl >= 0 ? '+' : ''}
                        {formatCurrency(simpleNetPnl)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      'px-3 py-1 rounded-xl font-mono font-bold text-xs border text-center self-start sm:self-center',
                      simplePnlPercent >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    )}
                  >
                    {simplePnlPercent >= 0 ? '+' : ''}
                    {simplePnlPercent.toFixed(2)}% ROI
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Multi-Leg Partial Sells Mode */}
          {mode === 'multileg' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                  <div>
                    <span className="text-slate-400">Allotted: </span>
                    <span className="text-white font-bold">{multiTotalBuyQty} sh</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sold: </span>
                    <span className="text-emerald-400 font-bold">{multiTotalSellQty} sh</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Remaining: </span>
                    <span className={clsx('font-bold', multiRemainingQty > 0 ? 'text-indigo-300' : 'text-slate-500')}>
                      {multiRemainingQty} sh
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSellLeg}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm shadow-emerald-600/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Partial Sell</span>
                </button>
              </div>

              {/* Legs Container */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {legs.map((leg, idx) => {
                  const isBuy = leg.type === 'BUY';
                  return (
                    <div
                      key={leg.id}
                      className={clsx(
                        'p-3 rounded-2xl border space-y-2 transition',
                        isBuy
                          ? 'bg-indigo-950/20 border-indigo-500/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={clsx(
                            'text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono uppercase shrink-0',
                            isBuy
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          )}
                        >
                          {isBuy ? 'ALLOTMENT ENTRY' : `TRANCHE #${idx}`}
                        </span>

                        {!isBuy && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLeg(leg.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition active:scale-90"
                            title="Remove partial sell leg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Responsive Grid of Inputs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Date */}
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Date</label>
                          <input
                            type="date"
                            value={leg.date}
                            onChange={(e) => handleUpdateLeg(leg.id, 'date', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Shares</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={leg.quantity}
                            onChange={(e) => handleUpdateLeg(leg.id, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                          />
                        </div>

                        {/* Price */}
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Price (₹)</label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            placeholder="Price"
                            value={leg.price}
                            onChange={(e) => handleUpdateLeg(leg.id, 'price', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                          />
                        </div>

                        {/* Charges */}
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Charges (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={leg.charges}
                            onChange={(e) => handleUpdateLeg(leg.id, 'charges', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Tranche Notes */}
                      <input
                        type="text"
                        placeholder="Tranche notes (e.g. Listing Day 50% Profit Booking)..."
                        value={leg.notes}
                        onChange={(e) => handleUpdateLeg(leg.id, 'notes', e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Multi-Leg Live Calculation Banner */}
              {multiSellLegs.length > 0 && (
                <div
                  className={clsx(
                    'p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in',
                    (multiNetPnl || 0) >= 0
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Sold: {multiTotalSellQty} sh ({formatCurrency(multiSellRevenue)})</span>
                      <span>•</span>
                      <span>Charges: {formatCurrency(multiTotalCharges)}</span>
                    </div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>Realized Net P&L:</span>
                      <span className="font-mono text-base">
                        {(multiNetPnl || 0) >= 0 ? '+' : ''}
                        {formatCurrency(multiNetPnl)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      'px-3 py-1 rounded-xl font-mono font-bold text-xs border text-center self-start sm:self-center',
                      multiPnlPercent >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    )}
                  >
                    {multiPnlPercent >= 0 ? '+' : ''}
                    {multiPnlPercent.toFixed(2)}% ROI
                  </span>
                </div>
              )}
            </div>
          )}

          {/* General Demat Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Account Strategy Remarks / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booked 50% profit, holding balance for long term..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Allotment & Trades</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
