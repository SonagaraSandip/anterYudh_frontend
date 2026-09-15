import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass,
  MapPin,
  Calendar,
  X,
  Plus,
  Edit2,
  Trash2,
  PieChart,
  TrendingDown,
  Clock,
  Search,
  Flame,
  CheckCircle2,
  Receipt,
  Layers,
  Sparkles,
  ArrowDownLeft,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

export default function TripDetailsModal({
  isOpen,
  trip,
  tripExpenses = [],
  formatCurrency,
  formatDateTime,
  onClose,
  onEditTrip,
  onAddExpenseToTrip,
  onEditExpense,
  onDeleteExpense
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Lock background body scroll and listen for ESC key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Compute Trip Analytics
  const analytics = useMemo(() => {
    let totalExpense = 0;
    const catMap = {};

    tripExpenses.forEach((item) => {
      const amt = parseFloat(item.amount) || 0;
      if (item.type === 'expense' || !item.type) {
        totalExpense += amt;
        catMap[item.category] = (catMap[item.category] || 0) + amt;
      }
    });

    const categoryList = Object.entries(catMap)
      .map(([cat, total]) => ({
        category: cat,
        total,
        percentage: totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);

    const highestSpendCategory = categoryList[0] || null;

    return {
      totalExpense,
      categoryList,
      highestSpendCategory,
      avgPerItem: tripExpenses.length > 0 ? totalExpense / tripExpenses.length : 0
    };
  }, [trip, tripExpenses]);

  // Filtered itemized expenses
  const filteredExpenses = useMemo(() => {
    return tripExpenses.filter((item) => {
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchCategory = (item.category || '').toLowerCase().includes(q);
        const matchPayment = (item.paymentMode || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchPayment && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [tripExpenses, selectedCategoryFilter, searchQuery]);

  if (!isOpen || !trip) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-3xl w-full p-3 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 max-h-[92vh] flex flex-col relative z-[100000] my-auto overflow-hidden"
      >
        {/* Top Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/30 p-3 sm:p-4 shrink-0 shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-lg shadow-indigo-600/30 shrink-0">
                <Compass className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-xl font-black text-white tracking-tight truncate max-w-[180px] sm:max-w-md">
                    {trip.name}
                  </h2>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                    Inspector
                  </span>
                  {trip.status && (
                    <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded border capitalize bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0">
                      {trip.status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300 flex-wrap">
                  {trip.destination && (
                    <span className="flex items-center gap-1 font-medium text-slate-200">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{trip.destination}</span>
                    </span>
                  )}

                  {(trip.startDate || trip.endDate) && (
                    <span className="flex items-center gap-1 font-mono text-slate-400">
                      <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span>
                        {trip.startDate ? String(trip.startDate).slice(0, 10) : ''}
                        {trip.endDate && trip.endDate !== trip.startDate ? ` → ${String(trip.endDate).slice(0, 10)}` : ''}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEditTrip(trip)}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition touch-manipulation"
                title="Edit Trip Info"
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition touch-manipulation"
                title="Close"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar inside Header */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-slate-800/80">
            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold block truncate">Total Spent</span>
              <span className="text-xs sm:text-base font-black font-mono text-rose-400 truncate block mt-0.5">
                {formatCurrency(analytics.totalExpense)}
              </span>
            </div>

            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold block truncate">Receipts</span>
              <span className="text-xs sm:text-base font-black font-mono text-indigo-300 truncate block mt-0.5">
                {tripExpenses.length} entries
              </span>
            </div>

            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold block truncate">Avg / Item</span>
              <span className="text-xs sm:text-base font-black font-mono text-emerald-400 truncate block mt-0.5">
                {formatCurrency(analytics.avgPerItem)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          
          {/* 1. "WHERE DID I SPEND TOO MUCH?" CATEGORY ANALYSIS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    Where Did You Spend Too Much?
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Category expense breakdown & spend concentration
                  </p>
                </div>
              </div>

              {analytics.highestSpendCategory && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30 text-rose-300 font-bold shrink-0">
                  🔥 Max: {analytics.highestSpendCategory.category} ({analytics.highestSpendCategory.percentage}%)
                </span>
              )}
            </div>

            {/* Category Progress Bars */}
            {analytics.categoryList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">No category data yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analytics.categoryList.map((cat, idx) => (
                  <div
                    key={cat.category}
                    onClick={() =>
                      setSelectedCategoryFilter((prev) =>
                        prev === cat.category ? 'all' : cat.category
                      )
                    }
                    className={clsx(
                      'p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5',
                      selectedCategoryFilter === cat.category
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-200 truncate max-w-[140px]">
                        {idx + 1}. {cat.category}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-rose-400 font-black">{formatCurrency(cat.total)}</span>
                        <span className="text-[10px] text-slate-400">({cat.percentage}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-300',
                          idx === 0
                            ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                            : idx === 1
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                        )}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. ITEMIZED EXPENSES LIST (IPO-LIKE DEMAT ROWS) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
            {/* Action Bar: Search, Category Filter, and Add Expense */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-indigo-500 transition min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inside this trip..."
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {selectedCategoryFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedCategoryFilter('all')}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 flex items-center gap-1 shrink-0"
                  >
                    <span>Filtered: {selectedCategoryFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onAddExpenseToTrip(trip)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0 touch-manipulation"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item to Trip</span>
              </button>
            </div>

            {/* List of itemized entries */}
            <div className="divide-y divide-slate-800/80 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
              {filteredExpenses.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-1.5">
                  <Receipt className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs font-medium">No expenses found for this filter.</p>
                  <button
                    onClick={() => onAddExpenseToTrip(trip)}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 underline touch-manipulation"
                  >
                    + Add first expense to this trip
                  </button>
                </div>
              ) : (
                filteredExpenses.map((item) => {
                  const { date, time } = formatDateTime(item.transactionDate || item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className="p-2 sm:p-3 hover:bg-slate-900/60 rounded-xl transition flex items-start justify-between gap-2 group"
                    >
                      <div className="flex items-start gap-2 sm:gap-2.5 flex-1 min-w-0">
                        <div className="p-1 sm:p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 mt-0.5">
                          <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[130px] xs:max-w-[200px] sm:max-w-sm">
                              {item.title}
                            </h4>
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-rose-950/80 text-rose-300 border-rose-500/30 shrink-0">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-slate-400 font-mono flex-wrap">
                            <span className="flex items-center gap-1 text-slate-300">
                              <Calendar className="w-2.5 h-2.5 text-rose-400" />
                              <span>{date}</span>
                            </span>
                            {time && <span>• {time}</span>}
                            {item.paymentMode && <span className="truncate max-w-[90px] sm:max-w-none">• {item.paymentMode}</span>}
                          </div>

                          {item.notes && (
                            <p className="text-[10px] text-slate-400 italic truncate max-w-[170px] sm:max-w-sm">"{item.notes}"</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Action Buttons */}
                      <div className="text-right shrink-0 space-y-1">
                        <div className="text-xs sm:text-sm font-black font-mono text-rose-400">
                          -{formatCurrency(item.amount)}
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditExpense(item)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition touch-manipulation"
                            title="Edit this item"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(item)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition touch-manipulation"
                            title="Delete this item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800 shrink-0">
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
            <span>Total: </span>
            <strong className="text-rose-400">{formatCurrency(analytics.totalExpense)}</strong>
            <span className="hidden xs:inline"> ({tripExpenses.length} items)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition touch-manipulation shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
