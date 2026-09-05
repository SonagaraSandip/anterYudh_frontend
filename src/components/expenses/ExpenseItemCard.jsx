import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';

export const ExpenseItemCard = React.memo(function ExpenseItemCard({
  item,
  formatCurrency,
  formatDateTime,
  onEdit,
  onDelete
}) {
  const isIncome = item.type === 'income';
  const { date, time } = formatDateTime(item.transactionDate || item.createdAt);

  return (
    <div className="p-3 sm:p-3.5 rounded-xl hover:bg-slate-800/50 transition-all duration-200 group flex items-start justify-between gap-2.5 border border-transparent hover:border-slate-800">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <div
          className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
            isIncome
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[170px] sm:max-w-xs">
              {item.title}
            </h4>
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${
                isIncome
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
              }`}
            >
              {item.category}
            </span>
          </div>

          {/* Timestamp & Payment Mode Details */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono flex-wrap">
            <span className="flex items-center gap-1 text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              <Calendar className={`w-2.5 h-2.5 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>{date}</span>
            </span>

            {time && (
              <span className="flex items-center gap-1 text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                <Clock className="w-2.5 h-2.5 text-slate-500" />
                <span>{time}</span>
              </span>
            )}

            {item.paymentMode && (
              <span className="text-slate-400 truncate max-w-[120px]">• {item.paymentMode}</span>
            )}
          </div>

          {item.notes && <p className="text-[10px] text-slate-400 italic truncate max-w-xs">"{item.notes}"</p>}
        </div>
      </div>

      {/* Right: Amount & Actions */}
      <div className="text-right shrink-0 space-y-1">
        <div
          className={`text-xs sm:text-sm font-black font-mono ${
            isIncome ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
        </div>

        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Edit transaction"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Delete transaction"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});
