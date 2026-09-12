import { memo } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Edit3, Trash2 } from 'lucide-react';

export const BuyItemCard = memo(function BuyItemCard({
  item,
  formatCurrency,
  onEdit,
  onDelete
}) {
  const isReady = item.savedAmount >= item.estimatedCost && item.estimatedCost > 0;
  const fundedPercent =
    item.estimatedCost > 0
      ? ((item.savedAmount / item.estimatedCost) * 100).toFixed(0)
      : '0';

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-5 shadow-lg space-y-3 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {item.category}
            </span>
            <span
              className={clsx(
                'text-[9px] font-bold px-2 py-0.2 rounded-full',
                item.priority === 'High'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : item.priority === 'Medium'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : 'bg-slate-800 text-slate-400'
              )}
            >
              {item.priority} Priority
            </span>
          </div>
          <h3 className="text-xs sm:text-base font-bold text-white mt-1 break-words">
            {item.title}
          </h3>
          {item.notes && <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">{item.notes}</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isReady && (
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready</span>
            </span>
          )}
          <button
            onClick={() => onEdit(item)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
          <span className="text-slate-400">Saved: {formatCurrency(item.savedAmount)}</span>
          <span className="text-amber-300 font-semibold">
            Cost: {formatCurrency(item.estimatedCost)}
          </span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              isReady ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
            )}
            style={{ width: `${Math.min(parseFloat(fundedPercent), 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
});
