import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  TrendingUp,
  Coins,
  Receipt,
  CheckCircle2,
  Calendar,
  Calculator,
  Split
} from 'lucide-react';
import clsx from 'clsx';
import { calculateIpoCharges, calculateApplicationMetrics } from '../../utils/ipoCalculator';

export function IpoQuickPartialSellModal({
  isOpen,
  onClose,
  ipo,
  personName,
  application,
  onSubmitPartialSell
}) {
  if (!isOpen || !ipo || !personName) return null;

  const metrics = calculateApplicationMetrics(application, ipo);
  const remainingShares = metrics?.remainingShares > 0 ? metrics.remainingShares : 1;
  const avgBuyPrice = metrics?.allottedPrice || (parseFloat(ipo.lotCost) || 0);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState(() => String(remainingShares));
  const [price, setPrice] = useState(() => {
    return application?.sellPrice ? String(application.sellPrice) : '';
  });
  const [charges, setCharges] = useState(() => {
    const q = remainingShares;
    const p = parseFloat(price) || avgBuyPrice || 0;
    return p > 0 ? String(calculateIpoCharges(q, p, false)) : '20';
  });
  const [notes, setNotes] = useState('Partial Exit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate statutory charges on quantity/price changes
  useEffect(() => {
    const q = parseInt(quantity, 10) || 0;
    const p = parseFloat(price) || 0;
    if (q > 0 && p > 0) {
      const autoChg = calculateIpoCharges(q, p, false);
      setCharges(String(autoChg));
    }
  }, [quantity, price]);

  // Real-time calculations
  const qtyNum = parseInt(quantity, 10) || 0;
  const prcNum = parseFloat(price) || 0;
  const chgNum = parseFloat(charges) || 0;
  const sellRevenue = qtyNum * prcNum;
  const costBasis = qtyNum * avgBuyPrice;
  const realizedNetPnl = prcNum > 0 ? (sellRevenue - costBasis - chgNum) : null;
  const pnlPercent = realizedNetPnl !== null && costBasis > 0 ? (realizedNetPnl / costBasis) * 100 : 0;

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || qtyNum <= 0 || prcNum <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmitPartialSell({
        personName,
        date,
        quantity: qtyNum,
        price: prcNum,
        charges: chgNum,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      console.error('Failed to submit partial sell:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/90 overflow-hidden my-auto max-h-[92vh] flex flex-col z-[100000] animate-slideDown"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Split className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base truncate">Quick Partial Sell</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-semibold border border-indigo-500/30 shrink-0">
                  {personName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {ipo.ipoName} • <span className="text-indigo-300 font-mono font-bold">{remainingShares} shares open</span> (@ {formatCurrency(avgBuyPrice)} avg)
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

        {/* Scrollable Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sell Date */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Sell Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Sell Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-400">
                  Sell Quantity <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setQuantity(String(remainingShares))}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium active:scale-95"
                >
                  Max ({remainingShares})
                </button>
              </div>
              <input
                type="number"
                min="1"
                max={remainingShares > 0 ? remainingShares : 999999}
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sell Price */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Selling Price per Share (₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                autoFocus
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 480"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Delivery Charges */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-400">
                  Statutory Charges (₹)
                </label>
                <span className="text-[10px] text-slate-500">STT, DP (₹20), GST</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
                placeholder="20"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Tranche / Sell Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Listing Day Partial Profit Booking"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Live Net Return Preview */}
          {prcNum > 0 && qtyNum > 0 && (
            <div
              className={clsx(
                'p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 animate-in fade-in',
                (realizedNetPnl || 0) >= 0
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              )}
            >
              <div>
                <div className="text-[11px] text-slate-400">
                  Revenue: {formatCurrency(sellRevenue)} • Cost Basis: {formatCurrency(costBasis)}
                </div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>Tranche Realized Net P&L:</span>
                  <span className="font-mono text-base">
                    {(realizedNetPnl || 0) >= 0 ? '+' : ''}
                    {formatCurrency(realizedNetPnl)}
                  </span>
                </div>
              </div>

              <span
                className={clsx(
                  'px-3 py-1 rounded-xl font-mono font-bold text-xs border shrink-0 text-center self-start sm:self-center',
                  pnlPercent >= 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                )}
              >
                {pnlPercent >= 0 ? '+' : ''}
                {pnlPercent.toFixed(2)}% ROI
              </span>
            </div>
          )}
        </form>

        {/* Fixed Footer Actions */}
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
            disabled={isSubmitting || qtyNum <= 0 || prcNum <= 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Recording...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Execute Partial Sell</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
