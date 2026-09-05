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

export const TradeDesktopRow = React.memo(function TradeDesktopRow({
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
    sellValue,
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
    <tr className="hover:bg-slate-800/40 transition-colors group text-slate-200">
      {/* Asset Name + Status Pill + Legs */}
      <td className="py-2.5 px-3.5 font-bold text-white sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="tracking-tight text-white">{trade.assetName}</span>

          {isFullyClosed ? (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/30">
              Closed
            </span>
          ) : isPartial ? (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-500/30">
              Partial
            </span>
          ) : (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
              Open
            </span>
          )}

          {hasMultiLegs && (
            <button
              onClick={() => onViewLegs(trade)}
              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/40 transition"
              title="View execution legs"
            >
              {legs.length} Legs
            </button>
          )}
        </div>
        {trade.notes && (
          <div
            className="text-[10px] text-slate-400 font-normal truncate max-w-[160px] mt-0.5"
            title={trade.notes}
          >
            {trade.notes}
          </div>
        )}
      </td>

      {/* Buy Date */}
      <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-300 border-r border-slate-800/60">
        {formatDate(trade.buyDate)}
      </td>

      {/* Avg Buy Price */}
      <td className="py-2.5 px-2.5 font-mono text-right text-slate-200 border-r border-slate-800/60">
        <span>{formatCurrency(avgBuyPrice)}</span>
      </td>

      {/* Quantity (Bought / Sold / Open) */}
      <td className="py-2.5 px-2 font-mono text-center text-slate-300 border-r border-slate-800/60">
        <div className="flex flex-col items-center">
          <span className="font-bold text-white">{totalBuyQty} Buy</span>
          {hasSells && (
            <span className="text-[10px] text-slate-400">
              {totalSellQty} Sold {remainingQty > 0 ? `• ${remainingQty} Open` : ''}
            </span>
          )}
        </div>
      </td>

      {/* Total Invested Cost */}
      <td className="py-2.5 px-2.5 font-mono text-right font-medium text-slate-200 border-r border-slate-800/60">
        {formatCurrency(invested)}
      </td>

      {/* Total Charges */}
      <td className="py-2.5 px-2 font-mono text-right text-amber-400/90 border-r border-slate-800/60">
        {charges > 0 ? formatCurrency(charges) : '₹0'}
      </td>

      {/* Trade Decision */}
      <td className="py-2.5 px-2.5 border-r border-slate-800/60 text-center">
        <span
          className={clsx(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[100px] inline-block',
            trade.tradeDecision === 'Eagle Eye' &&
              'bg-amber-500/10 text-amber-300 border-amber-500/30',
            trade.tradeDecision === 'Telegram' &&
              'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
            trade.tradeDecision === 'Self' &&
              'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
            !['Eagle Eye', 'Telegram', 'Self'].includes(trade.tradeDecision) &&
              'bg-slate-800 text-slate-300 border-slate-700'
          )}
        >
          {trade.tradeDecision}
        </span>
      </td>

      {/* Exit Date */}
      <td className="py-2.5 px-2.5 font-mono text-[11px] border-r border-slate-800/60">
        {trade.sellDate ? (
          formatDate(trade.sellDate)
        ) : (
          <button
            onClick={() => onPartialSell(trade)}
            className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"
            title="Click to sell / exit position"
          >
            <MinusCircle className="w-3 h-3" />
            <span>Partial Sell</span>
          </button>
        )}
      </td>

      {/* Holding Duration Column */}
      <td className="py-2.5 px-2.5 text-center font-mono text-[11px] border-r border-slate-800/60">
        <span
          className={clsx(
            'px-2 py-0.5 rounded-md font-semibold text-[10px] inline-flex items-center gap-1 border',
            isFullyClosed
              ? 'bg-slate-950 text-slate-300 border-slate-800'
              : isPartial
              ? 'bg-amber-950/30 text-amber-300 border-amber-500/30'
              : 'bg-cyan-950/30 text-cyan-300 border-cyan-500/30'
          )}
          title={`Bought on ${formatDate(trade.buyDate)}${
            trade.sellDate ? ` • Sold on ${formatDate(trade.sellDate)}` : ' • Position currently open'
          }`}
        >
          <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
          <span>{holdingDurationText}</span>
        </span>
      </td>

      {/* Avg Sell Price */}
      <td className="py-2.5 px-2.5 font-mono text-right border-r border-slate-800/60">
        {hasSells ? (
          formatCurrency(avgSellPrice)
        ) : (
          <span className="text-slate-500 italic">Open</span>
        )}
      </td>

      {/* Realized Value */}
      <td className="py-2.5 px-2.5 font-mono text-right border-r border-slate-800/60">
        {hasSells ? (
          formatCurrency(sellValue)
        ) : (
          <span className="text-slate-500 italic">Open</span>
        )}
      </td>

      {/* Realized Returns (₹) */}
      <td
        className={clsx(
          'py-2.5 px-3 font-mono font-bold text-right border-r border-slate-800/60',
          isProfit && 'text-emerald-400 bg-emerald-500/5',
          isLoss && 'text-rose-400 bg-rose-500/5',
          !hasSells && 'text-slate-400'
        )}
      >
        {hasSells ? (
          <>
            {returnsInr > 0 ? '+' : ''}
            {formatCurrency(returnsInr)}
          </>
        ) : (
          <span className="text-slate-500 font-normal italic">Open Pos</span>
        )}
      </td>

      {/* Realized Returns (%) */}
      <td
        className={clsx(
          'py-2.5 px-2.5 font-mono font-bold text-right border-r border-slate-800/60',
          isProfit && 'text-emerald-400',
          isLoss && 'text-rose-400',
          !hasSells && 'text-slate-500 font-normal'
        )}
      >
        {hasSells ? (
          <span
            className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded font-mono',
              isProfit &&
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              isLoss &&
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            )}
          >
            {returnsPercent > 0 ? '+' : ''}
            {returnsPercent.toFixed(2)}%
          </span>
        ) : (
          '—'
        )}
      </td>

      {/* Actions */}
      <td className="py-2.5 px-2 text-center sticky right-0 bg-slate-900 group-hover:bg-slate-850 border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-center gap-1">
          {remainingQty > 0 && (
            <button
              onClick={() => onPartialSell(trade)}
              className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-900/50 transition"
              title="Record Partial / Full Sell"
            >
              <MinusCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {remainingQty > 0 && (
            <button
              onClick={() => onPartialBuy(trade)}
              className="p-1 rounded text-blue-400 hover:text-white hover:bg-blue-900/50 transition"
              title="Add Buy (Accumulate)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onViewLegs(trade)}
            className="p-1 rounded text-indigo-400 hover:text-white hover:bg-indigo-900/50 transition"
            title="View Execution Legs"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onEdit(trade)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Edit trade details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(trade)}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Delete trade"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
