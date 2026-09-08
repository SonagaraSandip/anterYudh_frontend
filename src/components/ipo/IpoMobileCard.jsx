import React from 'react';
import { Users, Edit2, ChevronDown, Trash2, Calendar, CheckCircle2, Split, Layers, Coins } from 'lucide-react';
import clsx from 'clsx';
import { calculateApplicationMetrics, calculateIpoMetrics } from '../../utils/ipoCalculator';

const isSamePerson = (p1, p2) =>
  String(p1 || '').trim().toLowerCase() === String(p2 || '').trim().toLowerCase();

export const IpoMobileCard = React.memo(function IpoMobileCard({
  ipo,
  persons,
  isExpanded,
  onToggleExpand,
  editingLotCostId,
  lotCostInput,
  onLotCostInputChange,
  onSaveLotCost,
  onCancelEditLotCost,
  onStartEditLotCost,
  editingProfitLossId,
  profitLossInput,
  onProfitLossInputChange,
  onSaveProfitLoss,
  onCancelEditProfitLoss,
  onStartEditProfitLoss,
  onToggleApplication,
  onToggleAllottedWithConfirm,
  onUpdatePersonNotes,
  onOpenAllotmentModal,
  onOpenQuickPartialSellModal,
  onDeleteIpo,
  formatDate,
  formatCurrency,
  calculateIpoPercentage
}) {
  const ipoMetrics = calculateIpoMetrics(ipo);
  const pl = ipoMetrics.profitLoss;
  const lc = ipoMetrics.effectiveLotCost || parseFloat(ipo.lotCost) || 0;
  const lotSize = ipoMetrics.effectiveLotSize || parseInt(ipo.lotSize, 10) || 0;
  const issuePrice = ipoMetrics.effectiveIssuePrice || parseFloat(ipo.issuePrice) || 0;
  const isPositive = pl > 0;
  const isNegative = pl < 0;
  const ipoPercent = ipoMetrics.percentage !== null ? ipoMetrics.percentage : calculateIpoPercentage(ipo);
  const appliedCount = (ipo.applications || []).filter((a) => a.applied).length;
  const allottedCount = (ipo.applications || []).filter((a) => a.allotted).length;
  const totalDematCount = persons.length;

  return (
    <div
      className={clsx(
        'rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg space-y-0',
        isExpanded
          ? 'bg-slate-900 border-cyan-500/40 shadow-cyan-500/5 ring-1 ring-cyan-500/20'
          : 'bg-slate-900/95 border-slate-800 hover:border-slate-700'
      )}
    >
      <div className="p-3.5 sm:p-4 space-y-2.5">
        {/* Row 1: IPO Name + P/L Badge + Trash Icon */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-white text-sm sm:text-base tracking-tight truncate flex-1">
            {ipo.ipoName}
          </h3>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* P/L Badge (Editable) */}
            {editingProfitLossId === ipo.id ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={profitLossInput}
                  onChange={(e) => onProfitLossInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveProfitLoss(ipo.id);
                    if (e.key === 'Escape') onCancelEditProfitLoss();
                  }}
                  placeholder="0"
                  autoFocus
                  className="w-16 px-1.5 py-0.5 text-xs bg-slate-950 border border-cyan-500 rounded text-white focus:outline-none"
                />
                <button
                  onClick={() => onSaveProfitLoss(ipo.id)}
                  className="px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartEditProfitLoss(ipo)}
                className={clsx(
                  'px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold border transition active:scale-95',
                  isPositive
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                    : isNegative
                    ? 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                )}
                title={ipoMetrics.charges > 0 ? `Net P&L (Total Charges: ${formatCurrency(ipoMetrics.charges)})` : "Click to edit P&L"}
              >
                {isPositive ? '+' : ''}
                {formatCurrency(pl)}
              </button>
            )}

            {/* Delete IPO Button */}
            <button
              type="button"
              onClick={() => onDeleteIpo(ipo.id)}
              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-90"
              title="Delete IPO entry"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Lot Cost + Date + Return % */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lot Cost Pill (Editable) */}
            {editingLotCostId === ipo.id ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={lotCostInput}
                  onChange={(e) => onLotCostInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveLotCost(ipo.id);
                    if (e.key === 'Escape') onCancelEditLotCost();
                  }}
                  placeholder="0"
                  autoFocus
                  className="w-20 px-1.5 py-0.5 text-xs bg-slate-950 border border-indigo-500 rounded text-white focus:outline-none"
                />
                <button
                  onClick={() => onSaveLotCost(ipo.id)}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartEditLotCost(ipo)}
                className="px-2.5 py-0.5 rounded-md bg-[#1e1b4b]/60 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 font-mono text-[11px] font-medium transition flex items-center gap-1 active:scale-95"
                title={
                  lotSize > 0 && lc > 0
                    ? `Lot Cost: ${formatCurrency(lc)} (${lotSize} shares${issuePrice > 0 ? ` @ ₹${issuePrice}` : ''})`
                    : 'Click to edit lot cost'
                }
              >
                <span>
                  {lc > 0
                    ? `Lot: ${formatCurrency(lc)}${lotSize > 0 ? ` (${lotSize} sh)` : ''}`
                    : 'Lot: Set Cost'}
                </span>
                <Edit2 className="w-2.5 h-2.5 opacity-60" />
              </button>
            )}

            {/* Date Pill */}
            {ipo.createdAt && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-slate-400 text-[10px] font-mono">
                <Calendar className="w-2.5 h-2.5 text-slate-500" />
                <span>{formatDate(ipo.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Return % */}
          <div className="text-[11px] font-mono font-semibold text-right">
            {ipoPercent !== null ? (
              <span className={ipoPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {ipoPercent > 0 ? '+' : ''}
                {ipoPercent.toFixed(1)}% Return
              </span>
            ) : (
              <span className="text-emerald-400">0.0% Return</span>
            )}
          </div>
        </div>

        {/* Row 3: Applied Badge + Allotted Badge + Show Demats Toggle */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Applied Badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold font-mono">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>
                {appliedCount}/{totalDematCount} Applied
              </span>
            </span>

            {/* Allotted Badge */}
            {allottedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold font-mono animate-fadeIn">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>
                  {allottedCount} Allotted
                </span>
              </span>
            )}
          </div>

          {/* Show Demats Button */}
          <button
            type="button"
            onClick={() => onToggleExpand(ipo.id)}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition active:scale-95 touch-manipulation group/btn"
          >
            <span>{isExpanded ? 'Hide Demats' : 'Show Demats'}</span>
            <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 group-hover/btn:bg-cyan-900/60 group-hover/btn:border-cyan-400/60 transition flex items-center justify-center shadow-sm">
              <ChevronDown
                className={clsx(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  isExpanded && 'rotate-180 text-cyan-300'
                )}
              />
            </div>
          </button>
        </div>

        {/* Optional Notes */}
        {ipo.notes && (
          <p className="text-[11px] text-slate-400 italic line-clamp-1 border-t border-slate-800/40 pt-1">
            {ipo.notes}
          </p>
        )}
      </div>

      {/* Accordion Person Applications Drawer */}
      {isExpanded && (
        <div className="p-3 bg-slate-950/90 border-t border-cyan-500/20 space-y-2 animate-fadeIn">
          {persons.length === 0 ? (
            <div className="text-center py-2 text-xs text-slate-500">
              No Demat accounts added yet.
            </div>
          ) : (
            persons.map((person) => {
              const app = (ipo.applications || []).find((a) =>
                isSamePerson(a.personName, person)
              ) || {
                applied: false,
                allotted: false,
                notes: ''
              };

              const appMetrics = app.allotted ? calculateApplicationMetrics(app, ipo) : null;

              return (
                <div
                  key={person}
                  className={clsx(
                    'p-2.5 rounded-xl border flex flex-col gap-2 transition-all',
                    app.allotted
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : app.applied
                      ? 'bg-cyan-950/20 border-cyan-500/40'
                      : 'bg-slate-900 border-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{person}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(app.applied)}
                          onChange={() => onToggleApplication(ipo.id, person, 'applied')}
                          className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700 accent-cyan-500 cursor-pointer"
                        />
                        <span
                          className={
                            app.applied
                              ? 'text-cyan-300 font-bold text-xs'
                              : 'text-slate-400 text-xs'
                          }
                        >
                          Applied
                        </span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(app.allotted)}
                          onChange={() =>
                            onToggleAllottedWithConfirm(ipo, person, Boolean(app.allotted))
                          }
                          className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 accent-emerald-500 cursor-pointer"
                        />
                        <span
                          className={
                            app.allotted
                              ? 'text-emerald-300 font-bold text-xs'
                              : 'text-slate-400 text-xs'
                          }
                        >
                          Allotted
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Allotment & Trading Quick Bar */}
                  {app.allotted && appMetrics && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-[11px] text-slate-400">
                          {appMetrics.allottedShares} sh @ ₹{appMetrics.allottedPrice}
                        </div>
                        <div className="font-bold text-xs truncate">
                          {appMetrics.isFullyClosed ? (
                            <span className={(appMetrics.returnsInr || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              Net P&L: {(appMetrics.returnsInr || 0) >= 0 ? '+' : ''}{formatCurrency(appMetrics.returnsInr)}
                            </span>
                          ) : appMetrics.isPartial ? (
                            <span className="text-amber-300">
                              Partial Exit: {appMetrics.remainingShares} sh open
                            </span>
                          ) : (
                            <span className="text-indigo-300">
                              Position Open (Cost: {formatCurrency(appMetrics.totalInvested)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {!appMetrics.isFullyClosed && onOpenQuickPartialSellModal && (
                          <button
                            type="button"
                            onClick={() => onOpenQuickPartialSellModal(ipo, person, app)}
                            className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                          >
                            <Split className="w-3 h-3" />
                            <span>Sell</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenAllotmentModal && onOpenAllotmentModal(ipo, person, app)}
                          className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="App notes..."
                    value={app.notes || ''}
                    onChange={(e) => onUpdatePersonNotes(ipo.id, person, e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
});
