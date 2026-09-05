import React from 'react';
import clsx from 'clsx';
import {
  Clock,
  MinusCircle,
  PlusCircle,
  History,
  Edit2,
  Trash2
} from 'lucide-react';

export const TradeMobileCard = React.memo(function TradeMobileCard({
  trade,
  metrics,
  formatDate,
  formatCurrency,
  onPartialSell,
  onPartialBuy,
  onViewLegs,
  onEdit,
  onDelete
}) {
  const {
    invested,
    totalBuyQty,
    avgBuyPrice,
    totalSellQty,
    avgSellPrice,
    remainingQty,
    hasSells,
    isFullyClosed,
    isPartial,
    returnsInr,
    returnsPercent,
    charges,
    hasMultiLegs,
    legs,
    holdingDurationText
  } = metrics;

  const isProfit = hasSells && returnsInr > 0;
  const isLoss = hasSells && returnsInr < 0;

  return (
    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5 shadow-sm">
      {/* Top Line: Asset + Status + P/L */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="font-bold text-white text-xs sm:text-sm font-mono tracking-tight truncate">
            {trade.assetName}
          </span>

          {/* Status Badge */}
          {isFullyClosed ? (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Closed
            </span>
          ) : isPartial ? (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Partial ({totalSellQty}/{totalBuyQty})
            </span>
          ) : (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Open ({totalBuyQty} Qty)
            </span>
          )}

          {/* Multi-leg pill */}
          {hasMultiLegs && (
            <button
              onClick={() => onViewLegs(trade)}
              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5 hover:bg-indigo-500/30 transition"
            >
              <History className="w-2.5 h-2.5" />
              <span>{legs.length} Legs</span>
            </button>
          )}
        </div>

        {/* P&L badge if any portion sold */}
        <div className="shrink-0">
          {hasSells ? (
            <span
              className={clsx(
                'text-[10px] font-bold px-2 py-0.5 rounded font-mono',
                isProfit && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                isLoss && 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                !isProfit && !isLoss && 'bg-slate-800 text-slate-300'
              )}
            >
              {returnsInr > 0 ? '+' : ''}
              {formatCurrency(returnsInr)} ({returnsPercent > 0 ? '+' : ''}
              {returnsPercent.toFixed(1)}%)
            </span>
          ) : (
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
              Active Position
            </span>
          )}
        </div>
      </div>

      {/* Middle Line: Entry vs Exit Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
        <div>
          <span className="text-slate-400 block text-[10px]">Buy (Avg):</span>
          <span className="font-mono font-medium text-slate-200">
            {totalBuyQty} @ {formatCurrency(avgBuyPrice)}
          </span>
          <span className="text-[10px] text-slate-400 block">
            Inv: {formatCurrency(invested)}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px]">Exit / Realized:</span>
          {hasSells ? (
            <>
              <span className="font-mono font-medium text-slate-200">
                {totalSellQty} @ {formatCurrency(avgSellPrice)}
              </span>
              <span className="text-[10px] text-amber-300/90 block font-mono">
                {remainingQty > 0 ? `${remainingQty} Open Qty` : 'Fully Sold'}
              </span>
            </>
          ) : (
            <span className="text-cyan-400 font-medium italic text-[11px]">
              0 Sold • {remainingQty} Open
            </span>
          )}
        </div>
      </div>

      {/* Bottom Line: Hold Duration & Actions */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>Hold: {holdingDurationText}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/20">
            Fee: {formatCurrency(charges)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {remainingQty > 0 && (
            <button
              onClick={() => onPartialSell(trade)}
              className="px-2 py-1 rounded-lg bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 active:scale-95 shadow-sm"
              title="Sell / Exit Partial or Full Quantity"
            >
              <MinusCircle className="w-3 h-3 text-cyan-400" />
              <span>Sell</span>
            </button>
          )}

          {remainingQty > 0 && (
            <button
              onClick={() => onPartialBuy(trade)}
              className="p-1 rounded-lg text-blue-300 hover:text-white bg-blue-950/60 border border-blue-500/30 active:scale-95"
              title="Add Buy / Accumulate Position"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onEdit(trade)}
            className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 active:scale-95"
            title="Edit trade"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(trade)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/40 active:scale-95"
            title="Delete trade"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});
