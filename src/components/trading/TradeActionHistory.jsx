import { useMemo } from 'react';
import clsx from 'clsx';
import {
  History,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  PlusCircle,
  Layers,
  Clock,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

export function TradeActionHistory({
  trades = [],
  onOpenTrade,
  onOpenLegsHistory,
  formatCurrency,
  formatDate
}) {
  // Derive latest actions from all trades' transactions/legs
  const allActions = useMemo(() => {
    const list = [];

    (trades || []).forEach((trade) => {
      // 1. Extract raw transactions (supports Array or JSON-serialized string from DB)
      let rawTx = [];
      if (Array.isArray(trade.transactions) && trade.transactions.length > 0) {
        rawTx = trade.transactions;
      } else if (typeof trade.transactions === 'string' && trade.transactions.trim().startsWith('[')) {
        try {
          rawTx = JSON.parse(trade.transactions);
        } catch {
          rawTx = [];
        }
      } else if (Array.isArray(trade.legs) && trade.legs.length > 0) {
        rawTx = trade.legs;
      }

      const hasSingleSell =
        trade.sellPrice !== null &&
        trade.sellPrice !== undefined &&
        trade.sellPrice !== '' &&
        !isNaN(parseFloat(trade.sellPrice)) &&
        parseFloat(trade.sellPrice) > 0;

      // Fallback to single-entry trade legs if rawTx is empty
      if (!Array.isArray(rawTx) || rawTx.length === 0) {
        const buyQty = parseInt(trade.quantity, 10) || 1;
        const buyPrice = parseFloat(trade.buyPrice) || 0;
        const buyCharges = parseFloat(trade.charges) || 0;
        const buyDate = trade.buyDate || trade.createdAt || '';

        rawTx = [
          {
            id: `${trade.id}-buy-0`,
            type: 'BUY',
            date: buyDate,
            price: buyPrice,
            quantity: buyQty,
            charges: buyCharges,
            notes: trade.notes || 'Initial Entry'
          }
        ];

        if (hasSingleSell) {
          const sellPrice = parseFloat(trade.sellPrice) || 0;
          const sellDate = trade.sellDate || trade.buyDate || trade.createdAt || '';
          rawTx.push({
            id: `${trade.id}-sell-0`,
            type: 'SELL',
            date: sellDate,
            price: sellPrice,
            quantity: buyQty,
            charges: 0,
            notes: trade.notes || 'Full Exit'
          });
        }
      }

      // Compute trade-level metrics for accurate status & PnL
      const buyLegs = rawTx.filter((l) => l.type === 'BUY');
      const sellLegs = rawTx.filter((l) => l.type === 'SELL');

      const totalBuyQty = buyLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
      const totalBuyCost = buyLegs.reduce(
        (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
        0
      );
      const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : (parseFloat(trade.buyPrice) || 0);

      const totalSellQty = sellLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
      const totalSellRevenue = sellLegs.reduce(
        (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
        0
      );
      const totalCharges = rawTx.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);

      const isFullyClosed = totalBuyQty > 0 && totalSellQty >= totalBuyQty;
      const isPartial = totalSellQty > 0 && totalSellQty < totalBuyQty;
      const isOpen = totalSellQty === 0;
      const remainingQty = Math.max(0, totalBuyQty - totalSellQty);

      const totalRealizedPnl =
        totalSellQty > 0 ? totalSellRevenue - totalSellQty * avgBuyPrice - totalCharges : null;

      let seenBuyCount = 0;

      rawTx.forEach((leg, legIndex) => {
        const isBuy = leg.type === 'BUY';
        if (isBuy) seenBuyCount += 1;

        const isFirstBuy = isBuy && seenBuyCount === 1;
        const isAccumulate = isBuy && seenBuyCount > 1;
        const isExit = !isBuy;

        const qty = parseInt(leg.quantity, 10) || 0;
        const price = parseFloat(leg.price) || 0;
        const value = qty * price;
        const legCharges = parseFloat(leg.charges) || 0;

        // Calculate PnL for sell leg
        let pnl = null;
        let pnlPct = null;
        if (isExit && avgBuyPrice > 0) {
          const costBasis = qty * avgBuyPrice;
          pnl = value - costBasis - legCharges;
          if (costBasis > 0) {
            pnlPct = (pnl / costBasis) * 100;
          }
        }

        const isThisLastSell = isExit && legIndex === rawTx.length - 1 && isFullyClosed;
        const actionType = isFirstBuy
          ? 'NEW_ENTRY'
          : isAccumulate
          ? 'ACCUMULATE'
          : isThisLastSell || isFullyClosed
          ? 'FULL_EXIT'
          : 'PARTIAL_SELL';

        const rawDate = leg.date || (isExit ? trade.sellDate : trade.buyDate) || trade.createdAt || '';
        let timestamp = 0;
        if (rawDate) {
          const parsed = new Date(rawDate).getTime();
          timestamp = isNaN(parsed) ? 0 : parsed;
        }

        list.push({
          id: `action-${trade.id}-${leg.id || legIndex}`,
          tradeId: trade.id,
          trade,
          assetName: trade.assetName,
          tradeType: trade.tradeType, // 'stock' | 'intraday'
          actionType,
          type: leg.type,
          date: rawDate,
          timestamp,
          legIndex,
          quantity: qty,
          price,
          value,
          pnl,
          pnlPct,
          isTradeClosed: isFullyClosed,
          isTradePartial: isPartial,
          isTradeOpen: isOpen,
          remainingQty,
          totalRealizedPnl,
          notes: leg.notes || trade.notes || '',
          tradeDecision: trade.tradeDecision
        });
      });
    });

    // 2. Sort descending: Latest timestamp first. If timestamps match, SELL comes before BUY.
    list.sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      if (a.type !== b.type) {
        return a.type === 'SELL' ? -1 : 1;
      }
      return (b.legIndex || 0) - (a.legIndex || 0) || (b.tradeId || 0) - (a.tradeId || 0);
    });

    // Return the latest 5 actions
    return list.slice(0, 5);
  }, [trades]);

  const getActionBadge = (actionType, pnl) => {
    switch (actionType) {
      case 'NEW_ENTRY':
        return {
          label: 'BUY ENTRY',
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          icon: PlusCircle
        };
      case 'ACCUMULATE':
        return {
          label: 'ACCUMULATE',
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          icon: Layers
        };
      case 'PARTIAL_SELL':
        return {
          label: 'PARTIAL SELL',
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: ArrowUpRight
        };
      case 'FULL_EXIT':
        return {
          label: pnl >= 0 ? 'EXIT PROFIT' : 'EXIT LOSS',
          bg:
            pnl >= 0
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          icon: pnl >= 0 ? TrendingUp : TrendingDown
        };
      default:
        return {
          label: 'ACTION',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Clock
        };
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg space-y-2.5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-sm shrink-0">
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Last 5 Action History
            </h3>
            <span className="text-[9px] px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold font-mono">
              5 Recent Executions
            </span>
          </div>
        </div>
      </div>

      {/* Action Items List */}
      {allActions.length === 0 ? (
        <div className="py-4 text-center text-slate-500 text-xs bg-slate-950/40 rounded-lg border border-slate-800/80">
          No trading actions recorded yet.
        </div>
      ) : (
        <div className="space-y-1.5">
          {allActions.map((act, index) => {
            const badge = getActionBadge(act.actionType, act.pnl);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={act.id || index}
                className="bg-slate-950/70 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs group"
              >
                {/* Left: Rank, Badge, Symbol, Trade Type, Inline Execution Metrics */}
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                  {/* Rank Badge */}
                  <span className="w-5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-400 shrink-0">
                    #{index + 1}
                  </span>

                  {/* Action Badge */}
                  <span
                    className={clsx(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 shrink-0',
                      badge.bg
                    )}
                  >
                    <BadgeIcon className="w-2.5 h-2.5" />
                    <span>{badge.label}</span>
                  </span>

                  {/* Asset Name */}
                  <span className="font-bold text-white font-mono tracking-tight text-xs sm:text-sm truncate">
                    {act.assetName}
                  </span>

                  {/* Delivery / Intraday Pill */}
                  <span
                    className={clsx(
                      'text-[9px] font-semibold px-1.5 py-0.2 rounded font-mono shrink-0',
                      act.tradeType === 'intraday'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    )}
                  >
                    {act.tradeType === 'intraday' ? 'Intra' : 'Del'}
                  </span>

                  {/* Compact Metrics Bar */}
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                    <span className="text-slate-300 font-semibold">{act.quantity} Qty</span>
                    <span className="text-slate-600">@</span>
                    <span className="text-slate-300 font-semibold">{formatCurrency(act.price)}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-300 font-bold">{formatCurrency(act.value)}</span>
                    {act.date && (
                      <span className="text-slate-500 hidden md:inline">({formatDate(act.date)})</span>
                    )}
                  </div>
                </div>

                {/* Right: Outcome + Mobile Date + Breakdown Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                  {/* Outcome / PnL / State Badge */}
                  {act.type === 'SELL' ? (
                    <span
                      className={clsx(
                        'font-bold font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded flex items-center gap-1 shrink-0',
                        act.pnl > 0
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : act.pnl < 0
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      )}
                    >
                      {act.pnl > 0 ? '+' : ''}
                      {formatCurrency(act.pnl)}
                      {act.pnlPct !== null && ` (${act.pnlPct > 0 ? '+' : ''}${act.pnlPct.toFixed(1)}%)`}
                    </span>
                  ) : act.isTradeClosed ? (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Trade Closed</span>
                    </span>
                  ) : act.isTradePartial ? (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>Partial ({act.remainingQty} Open)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Active Position</span>
                    </span>
                  )}

                  {/* Mobile Date */}
                  {act.date && (
                    <span className="text-[10px] text-slate-500 font-mono sm:hidden">
                      {formatDate(act.date)}
                    </span>
                  )}

                  {/* Breakdown Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenLegsHistory && act.trade) {
                        onOpenLegsHistory(act.trade);
                      } else if (onOpenTrade && act.trade) {
                        onOpenTrade(act.trade);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1 text-[10px] font-semibold active:scale-95 touch-manipulation shrink-0"
                    title="View Trade Breakdown"
                  >
                    <History className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span>Breakdown</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
