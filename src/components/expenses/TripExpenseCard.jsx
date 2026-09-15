import { memo } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  PieChart,
  Tag
} from 'lucide-react';
import clsx from 'clsx';

export const TripExpenseCard = memo(function TripExpenseCard({
  trip,
  tripExpenses = [],
  periodSpent,
  formatCurrency,
  formatDateTime,
  onOpenDetails,
  onAddExpenseToTrip,
  onEditTrip,
  onDeleteTrip
}) {
  const totalSpent = periodSpent !== undefined ? periodSpent : (parseFloat(trip.totalSpent) || 0);

  // Compute category breakdown from tripExpenses
  const categoryTotals = tripExpenses.reduce((acc, item) => {
    const amt = parseFloat(item.amount) || 0;
    acc[item.category] = (acc[item.category] || 0) + amt;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    planning: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 hover:border-indigo-500/60 p-3.5 sm:p-4 transition-all duration-300 shadow-lg shadow-indigo-950/20 hover:shadow-indigo-500/10 group">
      {/* Top Accent Glow Bar */}
      <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500 rounded-full opacity-70 group-hover:opacity-100 transition" />

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
          </div>

          <div className="min-w-0 space-y-1 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-white tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs">
                {trip.name}
              </h4>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                🌴 TRIP TOTAL
              </span>
              {trip.status && (
                <span className={clsx('text-[9px] font-semibold px-1.5 py-0.2 rounded border capitalize shrink-0', statusColors[trip.status] || statusColors.active)}>
                  {trip.status}
                </span>
              )}
            </div>

            {/* Destination & Date Info */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
              {trip.destination && (
                <span className="flex items-center gap-0.5 text-slate-300 font-medium">
                  <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-[130px]">{trip.destination}</span>
                </span>
              )}

              {(trip.startDate || trip.endDate) && (
                <span className="flex items-center gap-1 font-mono text-slate-400">
                  <Calendar className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  <span>
                    {trip.startDate ? String(trip.startDate).slice(0, 10) : ''}
                    {trip.endDate && trip.endDate !== trip.startDate ? ` → ${String(trip.endDate).slice(0, 10)}` : ''}
                  </span>
                </span>
              )}

              <span className="font-mono text-slate-400">• {tripExpenses.length} items</span>
            </div>
          </div>
        </div>

        {/* Right Side: Total Outflow & Actions */}
        <div className="text-right shrink-0 space-y-1">
          <div className="text-xs sm:text-sm md:text-base font-black font-mono text-rose-400 tracking-tight">
            -{formatCurrency(totalSpent)}
          </div>

          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onEditTrip(trip)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition touch-manipulation"
              title="Edit Trip Details"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteTrip(trip)}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition touch-manipulation"
              title="Delete Trip"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Spending Categories Pills Preview */}
      {topCategories.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mr-0.5">
            Top Spend:
          </span>
          {topCategories.map(([cat, amt]) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono flex items-center gap-1"
            >
              <span className="font-sans text-slate-400 font-medium truncate max-w-[80px] sm:max-w-[110px]">{cat}</span>
              <strong className="text-rose-400 font-bold">{formatCurrency(amt)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Bottom Interactive Bar (Click to Open Detail Breakdown like IPO) */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onAddExpenseToTrip(trip)}
          className="py-1.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 border border-slate-700 active:scale-95 shadow-sm touch-manipulation"
        >
          <Plus className="w-3 h-3 text-emerald-400" />
          <span>Add Expense</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenDetails(trip)}
          className="py-1.5 px-2.5 sm:px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 border border-indigo-500/40 active:scale-95 shadow-sm group/btn ml-auto touch-manipulation"
        >
          <span className="truncate">View Breakdown</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition shrink-0" />
        </button>
      </div>
    </div>
  );
});
