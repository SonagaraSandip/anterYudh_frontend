import React from 'react';
import { Users, Edit2, Calendar, Trash2, Split, CheckCircle2, ChevronRight, Layers, Coins } from 'lucide-react';
import clsx from 'clsx';
import { calculateApplicationMetrics, calculateIpoMetrics } from '../../utils/ipoCalculator';

const isSamePerson = (p1, p2) =>
  String(p1 || '').trim().toLowerCase() === String(p2 || '').trim().toLowerCase();

export const IpoDesktopRow = React.memo(function IpoDesktopRow({
  ipo,
  persons,
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
  const lc = parseFloat(ipo.lotCost) || 0;
  const isPositive = pl > 0;
  const isNegative = pl < 0;
  const ipoPercent = ipoMetrics.percentage !== null ? ipoMetrics.percentage : calculateIpoPercentage(ipo);
  const appliedCount = (ipo.applications || []).filter((a) => a.applied).length;
  const totalDematCount = persons.length;

  return (
    <tr
      className={`transition-colors group ${
        appliedCount > 0 ? 'bg-slate-900/90 hover:bg-slate-800/60' : 'hover:bg-slate-800/40'
      }`}
    >
      {/* 1. Left: IPO Name, Lot Cost & Notes */}
      <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-200 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850 min-w-[220px] sm:min-w-[260px] border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-2">
          <div
            className="font-semibold text-slate-100 text-xs sm:text-sm tracking-tight truncate max-w-[180px]"
            title={ipo.ipoName}
          >
            {ipo.ipoName}
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 border transition-all ${
              appliedCount === totalDematCount && totalDematCount > 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : appliedCount > 0
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={`${appliedCount} of ${totalDematCount} Demat accounts applied`}
          >
            <Users className="w-3 h-3 text-indigo-400" />
            <span>
              {appliedCount}/{totalDematCount}
            </span>
          </span>
        </div>

        {/* Lot Cost & Date Added */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {editingLotCostId === ipo.id ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={lotCostInput}
                onChange={(e) => onLotCostInputChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveLotCost(ipo.id);
                  if (e.key === 'Escape') onCancelEditLotCost();
                }}
                placeholder="0"
                autoFocus
                className="w-20 px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-indigo-500 rounded text-white focus:outline-none"
              />
              <button
                onClick={() => onSaveLotCost(ipo.id)}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => onStartEditLotCost(ipo)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 hover:border-indigo-500/50 transition flex items-center gap-1"
              title="Click to edit Lot Cost"
            >
              <span>Lot: {lc > 0 ? formatCurrency(lc) : 'Set Cost'}</span>
              <Edit2 className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>
          )}

          {ipo.createdAt && (
            <span
              className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80"
              title={`Added on ${formatDate(ipo.createdAt)}`}
            >
              <Calendar className="w-2.5 h-2.5 text-slate-500 shrink-0" />
              <span>{formatDate(ipo.createdAt)}</span>
            </span>
          )}
        </div>

        {ipo.notes && (
          <div className="text-[11px] text-slate-400 max-w-[240px] truncate mt-1" title={ipo.notes}>
            {ipo.notes}
          </div>
        )}
      </td>

      {/* 2. Dynamic Middle Columns for Each Person */}
      {persons.map((person) => {
        const app = (ipo.applications || []).find((a) => isSamePerson(a.personName, person)) || {
          applied: false,
          allotted: false,
          notes: ''
        };

        const appMetrics = app.allotted ? calculateApplicationMetrics(app, ipo) : null;

        return (
          <td
            key={person}
            className={`py-1.5 px-2 min-w-[160px] max-w-[200px] border-r border-slate-800/80 align-middle transition-colors ${
              app.allotted ? 'bg-emerald-950/25' : app.applied ? 'bg-indigo-950/40' : ''
            }`}
          >
            <div className="flex flex-col gap-1.5">
              {/* Checkboxes Row */}
              <div className="grid grid-cols-2 gap-1">
                {/* Applied Checkbox */}
                <label
                  className={`flex items-center justify-center gap-1 p-0.5 rounded cursor-pointer transition select-none border ${
                    app.applied
                      ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-200 shadow-sm'
                      : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(app.applied)}
                    onChange={() => onToggleApplication(ipo.id, person, 'applied')}
                    className="w-3 h-3 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                  />
                  <span className={`text-[9px] ${app.applied ? 'text-indigo-200 font-bold' : 'text-slate-500'}`}>
                    App
                  </span>
                </label>

                {/* Allotted Checkbox */}
                <label
                  className={`flex items-center justify-center gap-1 p-0.5 rounded cursor-pointer transition select-none border ${
                    app.allotted
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(app.allotted)}
                    onChange={() => onToggleAllottedWithConfirm(ipo, person, Boolean(app.allotted))}
                    className="w-3 h-3 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer accent-emerald-500"
                  />
                  <span className={`text-[9px] ${app.allotted ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                    Allot
                  </span>
                </label>
              </div>

              {/* Allotted Details Pill & Trading Controls */}
              {app.allotted && appMetrics && (
                <div className="flex items-center justify-between gap-1 p-1 bg-slate-950/90 rounded-lg border border-slate-800 text-[10px] font-mono">
                  {/* Status / P&L Badge */}
                  <div
                    onClick={() => onOpenAllotmentModal && onOpenAllotmentModal(ipo, person, app)}
                    className="cursor-pointer hover:underline flex items-center gap-1 truncate"
                    title="Click to manage Allotment shares, issue price & partial sell tranches"
                  >
                    {appMetrics.isFullyClosed ? (
                      <span className={clsx('font-bold', (appMetrics.returnsInr || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {(appMetrics.returnsInr || 0) >= 0 ? '+' : ''}
                        {formatCurrency(appMetrics.returnsInr)}
                      </span>
                    ) : appMetrics.isPartial ? (
                      <span className="text-amber-300 font-bold">
                        {appMetrics.remainingShares}/{appMetrics.allottedShares} sh
                      </span>
                    ) : (
                      <span className="text-indigo-300">
                        {appMetrics.allottedShares} sh @ ₹{appMetrics.allottedPrice}
                      </span>
                    )}
                  </div>

                  {/* Actions: Quick Partial Sell & Full Modal */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!appMetrics.isFullyClosed && onOpenQuickPartialSellModal && (
                      <button
                        type="button"
                        onClick={() => onOpenQuickPartialSellModal(ipo, person, app)}
                        className="p-0.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition"
                        title="Quick Partial Sell"
                      >
                        <Split className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenAllotmentModal && onOpenAllotmentModal(ipo, person, app)}
                      className="p-0.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition"
                      title="Manage Allotment & Sells"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Notes Input per person */}
              <input
                type="text"
                placeholder="Notes..."
                value={app.notes || ''}
                onChange={(e) => onUpdatePersonNotes(ipo.id, person, e.target.value)}
                className="w-full px-1.5 py-0.5 text-[9px] bg-slate-950/80 border border-slate-800/90 rounded text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </td>
        );
      })}

      {/* 3. Right: Profit / Loss Badge & Percentage Return */}
      <td className="py-2.5 px-3 sm:px-4 text-right sticky right-0 z-10 bg-slate-900 group-hover:bg-slate-850 min-w-[140px] border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
        {editingProfitLossId === ipo.id ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              value={profitLossInput}
              onChange={(e) => onProfitLossInputChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveProfitLoss(ipo.id);
                if (e.key === 'Escape') onCancelEditProfitLoss();
              }}
              placeholder="0"
              autoFocus
              className="w-16 px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-indigo-500 rounded text-right text-white focus:outline-none"
            />
            <button
              onClick={() => onSaveProfitLoss(ipo.id)}
              className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
            >
              Save
            </button>
          </div>
        ) : (
          <div
            onClick={() => onStartEditProfitLoss(ipo)}
            className="flex flex-col items-end gap-0.5 cursor-pointer group/pl"
            title={ipoMetrics.charges > 0 ? `Net P&L (Total Charges: ${formatCurrency(ipoMetrics.charges)})` : "Click to edit Profit/Loss"}
          >
            <div className="inline-flex items-center gap-1">
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] sm:text-[11px] font-bold border transition ${
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 group-hover/pl:bg-emerald-500/20'
                    : isNegative
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 group-hover/pl:bg-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isPositive ? '+' : ''}
                {formatCurrency(pl)}
              </span>
              <Edit2 className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover/pl:opacity-100 transition hidden sm:inline" />
            </div>

            {ipoPercent !== null ? (
              <span
                className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                  ipoPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {ipoPercent > 0 ? '+' : ''}
                {ipoPercent.toFixed(1)}% Return
              </span>
            ) : (
              <span className="text-[9px] text-slate-500">{lc <= 0 ? 'Set lot ₹' : '0.0%'}</span>
            )}
          </div>
        )}
      </td>

      {/* 4. Delete Action Button */}
      <td className="py-2 px-1 text-center w-8 min-w-[32px]">
        <button
          onClick={() => onDeleteIpo(ipo.id)}
          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition"
          title="Delete IPO entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
});
