import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Filter,
  Calendar,
  Layers,
  BarChart2,
  PieChart,
  Activity,
  Zap,
  Target,
  Shield,
  Clock,
  Receipt,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Percent,
  DollarSign,
  Flame,
  Scale,
  Sparkles,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Timer,
  CalendarDays
} from 'lucide-react';

const DECISION_PRESETS = [
  'Eagle Eye',
  'Telegram',
  'Self',
  'Price Action Breakout',
  'Chart Pattern',
  'Volume Spike',
  'Algo / Quant Alert',
  'News / Earnings Catalyst'
];

export default function TradingAnalysis({ trades = [], onBack }) {
  // Quick Rolling Timeframe Filter State: 'all' | '30d' | '3m' | '6m'
  const [timeframeFilter, setTimeframeFilter] = useState('all');

  // Analytical Filter States
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTradeType, setSelectedTradeType] = useState('all'); // 'all' | 'stock' | 'intraday'
  const [selectedDecision, setSelectedDecision] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all'); // 'all' | 'profit' | 'loss' | 'open'
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Filter Collapsible State
  const [isFilterExpandedMobile, setIsFilterExpandedMobile] = useState(false);

  // Extract unique years from trades
  const availableYears = useMemo(() => {
    const years = new Set();
    trades.forEach((t) => {
      if (t.buyDate) {
        const y = new Date(t.buyDate).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [trades]);

  // Format Currency (INR)
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  // Format Date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  // Holding duration calculator
  const getHoldingDuration = (buyDateStr, sellDateStr, isClosed) => {
    if (!buyDateStr) return { days: 0, text: '—' };
    try {
      const bDate = new Date(buyDateStr);
      const eDate = isClosed && sellDateStr ? new Date(sellDateStr) : new Date();
      if (isNaN(bDate.getTime()) || isNaN(eDate.getTime())) return { days: 0, text: '—' };

      const diffMs = eDate.getTime() - bDate.getTime();
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      let text = '';
      if (diffDays === 0) {
        text = isClosed ? 'Same Day' : '1 Day (Today)';
      } else if (diffDays === 1) {
        text = '1 Day';
      } else if (diffDays < 30) {
        text = `${diffDays} Days`;
      } else if (diffDays < 365) {
        const m = Math.floor(diffDays / 30);
        const d = diffDays % 30;
        text = `${m}m ${d > 0 ? `${d}d` : ''}`.trim();
      } else {
        const yrs = (diffDays / 365).toFixed(1);
        text = `${yrs} Yrs`;
      }

      return { days: diffDays, text };
    } catch {
      return { days: 0, text: '—' };
    }
  };

  // Standard trade metric calculation
  const calculateTradeMetrics = (trade) => {
    const rawTx = Array.isArray(trade.transactions) ? trade.transactions : [];

    if (rawTx.length > 0) {
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
      const avgSellPrice = totalSellQty > 0 ? totalSellRevenue / totalSellQty : null;

      const remainingQty = Math.max(0, totalBuyQty - totalSellQty);
      const totalCharges = rawTx.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);

      const hasSells = totalSellQty > 0;
      const isFullyClosed = totalBuyQty > 0 && totalSellQty >= totalBuyQty;
      const isPartial = totalSellQty > 0 && totalSellQty < totalBuyQty;

      const costBasisOfSold = totalSellQty * avgBuyPrice;
      const returnsInr = hasSells ? totalSellRevenue - costBasisOfSold - totalCharges : null;
      const returnsPercent = hasSells && costBasisOfSold > 0 ? (returnsInr / costBasisOfSold) * 100 : 0;

      const earliestBuyDate = buyLegs[0]?.date || trade.buyDate;
      const latestSellDate = sellLegs[sellLegs.length - 1]?.date || trade.sellDate;
      const { days: holdingDays, text: holdingDurationText } = getHoldingDuration(
        earliestBuyDate,
        latestSellDate,
        isFullyClosed
      );

      const currentInvested = remainingQty * avgBuyPrice;

      return {
        invested: totalBuyCost,
        currentInvested,
        totalBuyQty: totalBuyQty || (parseInt(trade.quantity, 10) || 1),
        avgBuyPrice,
        totalSellQty,
        avgSellPrice,
        remainingQty,
        hasSells,
        isFullyClosed,
        isClosed: isFullyClosed,
        isPartial,
        isOpen: totalSellQty === 0,
        returnsInr,
        returnsPercent,
        charges: totalCharges,
        holdingDays,
        holdingDurationText
      };
    }

    // Classic single entry
    const buyPrice = parseFloat(trade.buyPrice) || 0;
    const qty = parseInt(trade.quantity, 10) || 0;
    const charges = parseFloat(trade.charges) || 0;
    const invested = buyPrice * qty;

    const isClosed =
      trade.sellPrice !== null &&
      trade.sellPrice !== undefined &&
      trade.sellPrice !== '' &&
      !isNaN(parseFloat(trade.sellPrice));

    const currentInvested = isClosed ? 0 : invested;

    const sellPrice = isClosed ? parseFloat(trade.sellPrice) : null;
    const sellValue = isClosed ? sellPrice * qty : null;

    let returnsInr = null;
    let returnsPercent = null;

    if (isClosed) {
      returnsInr = sellValue - invested - charges;
      returnsPercent = invested > 0 ? (returnsInr / invested) * 100 : 0;
    }

    const { days: holdingDays, text: holdingDurationText } = getHoldingDuration(
      trade.buyDate,
      trade.sellDate,
      isClosed
    );

    return {
      invested,
      currentInvested,
      totalBuyQty: qty,
      avgBuyPrice: buyPrice,
      totalSellQty: isClosed ? qty : 0,
      avgSellPrice: sellPrice,
      remainingQty: isClosed ? 0 : qty,
      hasSells: isClosed,
      isFullyClosed: isClosed,
      isClosed,
      isPartial: false,
      isOpen: !isClosed,
      returnsInr,
      returnsPercent,
      charges,
      holdingDays,
      holdingDurationText
    };
  };

  // Rolling Period Calculation (Last 30 Days, Last 3 Months, Last 6 Months)
  const rollingStats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const t30DaysAgo = now - 30 * dayMs;
    const t90DaysAgo = now - 90 * dayMs;
    const t180DaysAgo = now - 180 * dayMs;

    const computeWindow = (sinceTimestamp) => {
      let pnl = 0;
      let totalTrades = 0;
      let closedTrades = 0;
      let winCount = 0;
      let lossCount = 0;
      let charges = 0;
      let invested = 0;

      trades.forEach((t) => {
        const tradeDateStr = t.sellDate || t.buyDate;
        if (!tradeDateStr) return;
        const dTime = new Date(tradeDateStr).getTime();
        if (isNaN(dTime) || dTime < sinceTimestamp) return;

        totalTrades++;
        const m = calculateTradeMetrics(t);
        invested += m.invested;
        charges += m.charges;

        if (m.hasSells && m.returnsInr !== null) {
          closedTrades++;
          pnl += m.returnsInr;
          if (m.returnsInr > 0) winCount++;
          else if (m.returnsInr < 0) lossCount++;
        }
      });

      const winRate = closedTrades > 0 ? (winCount / closedTrades) * 100 : 0;
      return {
        pnl,
        totalTrades,
        closedTrades,
        winCount,
        lossCount,
        winRate,
        charges,
        invested
      };
    };

    return {
      days30: computeWindow(t30DaysAgo),
      months3: computeWindow(t90DaysAgo),
      months6: computeWindow(t180DaysAgo)
    };
  }, [trades]);

  // Filtered dataset according to analytical criteria
  const filteredTrades = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const t30DaysAgo = now - 30 * dayMs;
    const t90DaysAgo = now - 90 * dayMs;
    const t180DaysAgo = now - 180 * dayMs;

    return trades.filter((trade) => {
      const m = calculateTradeMetrics(trade);

      // Rolling Timeframe Filter
      if (timeframeFilter === '30d') {
        const tradeTime = new Date(trade.sellDate || trade.buyDate || 0).getTime();
        if (isNaN(tradeTime) || tradeTime < t30DaysAgo) return false;
      } else if (timeframeFilter === '3m') {
        const tradeTime = new Date(trade.sellDate || trade.buyDate || 0).getTime();
        if (isNaN(tradeTime) || tradeTime < t90DaysAgo) return false;
      } else if (timeframeFilter === '6m') {
        const tradeTime = new Date(trade.sellDate || trade.buyDate || 0).getTime();
        if (isNaN(tradeTime) || tradeTime < t180DaysAgo) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const d = trade.buyDate ? new Date(trade.buyDate) : null;
        if (!d || isNaN(d.getTime()) || d.getMonth() + 1 !== parseInt(selectedMonth, 10)) {
          return false;
        }
      }

      // Year filter
      if (selectedYear !== 'all') {
        const d = trade.buyDate ? new Date(trade.buyDate) : null;
        if (!d || isNaN(d.getTime()) || d.getFullYear() !== parseInt(selectedYear, 10)) {
          return false;
        }
      }

      // Trade Type
      if (selectedTradeType !== 'all' && trade.tradeType !== selectedTradeType) {
        return false;
      }

      // Trade Decision
      if (selectedDecision !== 'all') {
        if (trade.tradeDecision !== selectedDecision) return false;
      }

      // Outcome Filter
      if (selectedOutcome === 'profit') {
        if (!m.hasSells || m.returnsInr === null || m.returnsInr <= 0) return false;
      } else if (selectedOutcome === 'loss') {
        if (!m.hasSells || m.returnsInr === null || m.returnsInr >= 0) return false;
      } else if (selectedOutcome === 'open') {
        if (!m.isOpen && !m.isPartial) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (trade.assetName || '').toLowerCase().includes(q);
        const decMatch = (trade.tradeDecision || '').toLowerCase().includes(q);
        const noteMatch = (trade.notes || '').toLowerCase().includes(q);
        if (!nameMatch && !decMatch && !noteMatch) return false;
      }

      return true;
    });
  }, [trades, timeframeFilter, selectedMonth, selectedYear, selectedTradeType, selectedDecision, selectedOutcome, searchQuery]);

  // Aggregate Performance Metrics for the filtered subset
  const analytics = useMemo(() => {
    let totalInvested = 0;
    let currentInvested = 0;
    let totalRealizedPnl = 0;
    let totalCharges = 0;

    let winCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;
    let openCount = 0;

    let grossProfit = 0;
    let grossLoss = 0;

    let maxWin = 0;
    let maxWinTrade = null;
    let maxLoss = 0;
    let maxLossTrade = null;

    let winnerHoldingDaysTotal = 0;
    let loserHoldingDaysTotal = 0;

    filteredTrades.forEach((trade) => {
      const m = calculateTradeMetrics(trade);
      totalInvested += m.invested;
      currentInvested += m.currentInvested;
      totalCharges += m.charges;

      if (m.hasSells && m.returnsInr !== null) {
        totalRealizedPnl += m.returnsInr;
        if (m.returnsInr > 0) {
          winCount++;
          grossProfit += m.returnsInr;
          winnerHoldingDaysTotal += m.holdingDays;
          if (m.returnsInr > maxWin) {
            maxWin = m.returnsInr;
            maxWinTrade = trade;
          }
        } else if (m.returnsInr < 0) {
          lossCount++;
          grossLoss += Math.abs(m.returnsInr);
          loserHoldingDaysTotal += m.holdingDays;
          if (m.returnsInr < maxLoss) {
            maxLoss = m.returnsInr;
            maxLossTrade = trade;
          }
        } else {
          breakevenCount++;
        }
      }

      if (m.isOpen || m.isPartial) {
        openCount++;
      }
    });

    const totalClosed = winCount + lossCount + breakevenCount;
    const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0;
    const lossRate = totalClosed > 0 ? (lossCount / totalClosed) * 100 : 0;

    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A';
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';

    const avgWinnerHoldingDays = winCount > 0 ? (winnerHoldingDaysTotal / winCount).toFixed(1) : '0';
    const avgLoserHoldingDays = lossCount > 0 ? (loserHoldingDaysTotal / lossCount).toFixed(1) : '0';

    const overallRoi = totalInvested > 0 ? (totalRealizedPnl / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentInvested,
      totalRealizedPnl,
      totalCharges,
      winCount,
      lossCount,
      breakevenCount,
      openCount,
      totalClosed,
      winRate,
      lossRate,
      grossProfit,
      grossLoss,
      avgWin,
      avgLoss,
      riskRewardRatio,
      profitFactor,
      avgWinnerHoldingDays,
      overallRoi,
      maxWin,
      maxWinTrade,
      maxLoss,
      maxLossTrade
    };
  }, [filteredTrades]);

  // Strategy / Decision Performance Matrix
  const decisionMatrix = useMemo(() => {
    const map = {};

    filteredTrades.forEach((t) => {
      const dec = t.tradeDecision || 'Self';
      if (!map[dec]) {
        map[dec] = {
          name: dec,
          totalTrades: 0,
          closedTrades: 0,
          winCount: 0,
          lossCount: 0,
          totalPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          charges: 0
        };
      }

      const m = calculateTradeMetrics(t);
      map[dec].totalTrades++;
      map[dec].charges += m.charges;

      if (m.hasSells && m.returnsInr !== null) {
        map[dec].closedTrades++;
        map[dec].totalPnl += m.returnsInr;
        if (m.returnsInr > 0) {
          map[dec].winCount++;
          map[dec].grossProfit += m.returnsInr;
        } else if (m.returnsInr < 0) {
          map[dec].lossCount++;
          map[dec].grossLoss += Math.abs(m.returnsInr);
        }
      }
    });

    return Object.values(map).sort((a, b) => b.totalPnl - a.totalPnl);
  }, [filteredTrades]);

  // Monthly Breakdown Matrix
  const monthlyMatrix = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const map = months.map((name, i) => ({
      monthIndex: i + 1,
      name,
      totalTrades: 0,
      closedTrades: 0,
      winCount: 0,
      totalPnl: 0,
      charges: 0
    }));

    filteredTrades.forEach((t) => {
      if (t.buyDate) {
        const d = new Date(t.buyDate);
        if (!isNaN(d.getTime())) {
          const idx = d.getMonth();
          if (map[idx]) {
            const m = calculateTradeMetrics(t);
            map[idx].totalTrades++;
            map[idx].charges += m.charges;
            if (m.hasSells && m.returnsInr !== null) {
              map[idx].closedTrades++;
              map[idx].totalPnl += m.returnsInr;
              if (m.returnsInr > 0) map[idx].winCount++;
            }
          }
        }
      }
    });

    return map;
  }, [filteredTrades]);

  // Holding Period Breakdown (Scalp vs Swing vs Positional)
  const durationBuckets = useMemo(() => {
    const buckets = [
      { label: 'Intraday / Same Day', min: 0, max: 0, count: 0, pnl: 0, wins: 0 },
      { label: 'Short Swing (1–7 Days)', min: 1, max: 7, count: 0, pnl: 0, wins: 0 },
      { label: 'Medium Swing (8–30 Days)', min: 8, max: 30, count: 0, pnl: 0, wins: 0 },
      { label: 'Positional (30+ Days)', min: 31, max: 99999, count: 0, pnl: 0, wins: 0 }
    ];

    filteredTrades.forEach((t) => {
      const m = calculateTradeMetrics(t);
      if (m.hasSells && m.returnsInr !== null) {
        const d = m.holdingDays;
        const bucket = buckets.find((b) => d >= b.min && d <= b.max);
        if (bucket) {
          bucket.count++;
          bucket.pnl += m.returnsInr;
          if (m.returnsInr > 0) bucket.wins++;
        }
      }
    });

    return buckets;
  }, [filteredTrades]);

  // Top 3 Best & Top 3 Worst Trades
  const { topGainers, topLosers } = useMemo(() => {
    const closed = filteredTrades
      .map((t) => ({ ...t, metrics: calculateTradeMetrics(t) }))
      .filter((t) => t.metrics.hasSells && t.metrics.returnsInr !== null);

    const sortedAsc = [...closed].sort((a, b) => a.metrics.returnsInr - b.metrics.returnsInr);
    const sortedDesc = [...closed].sort((a, b) => b.metrics.returnsInr - a.metrics.returnsInr);

    return {
      topGainers: sortedDesc.slice(0, 3),
      topLosers: sortedAsc.slice(0, 3)
    };
  }, [filteredTrades]);

  // Reset all filters
  const handleResetFilters = () => {
    setTimeframeFilter('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setSelectedTradeType('all');
    setSelectedDecision('all');
    setSelectedOutcome('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    timeframeFilter !== 'all' ||
    selectedMonth !== 'all' ||
    selectedYear !== 'all' ||
    selectedTradeType !== 'all' ||
    selectedDecision !== 'all' ||
    selectedOutcome !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="space-y-3.5 sm:space-y-6 animate-fadeIn font-sans selection:bg-indigo-500 selection:text-white max-w-full overflow-hidden">
      {/* 1. Header Navigation & Title Bar (Fully Responsive on Mobile) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95 flex items-center gap-1 text-[11px] sm:text-xs font-semibold shadow-sm shrink-0 mt-0.5 sm:mt-0"
              title="Back to Trading Journal"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Journal</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base md:text-xl font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                  <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
                  <span className="truncate">Trade Analytics & Insights</span>
                </h2>
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold shrink-0">
                  {filteredTrades.length} Trades
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
                Rolling 30D / 3M / 6M metrics, win rate, risk-reward ratios, and strategy breakdown
              </p>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition active:scale-95 self-end sm:self-auto"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. ROLLING PERIOD DASHBOARD (Last 30 Days, Last 3 Months, Last 6 Months) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span className="text-[11px] sm:text-xs">Rolling Timeframe Performance</span>
          </div>
          {timeframeFilter !== 'all' && (
            <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30 font-semibold">
              Filter: {timeframeFilter === '30d' ? '30 Days' : timeframeFilter === '3m' ? '3 Months' : '6 Months'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Card A: Last 30 Days */}
          <div
            onClick={() => setTimeframeFilter(timeframeFilter === '30d' ? 'all' : '30d')}
            className={clsx(
              'p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-md relative overflow-hidden group active:scale-[0.99]',
              timeframeFilter === '30d'
                ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-900 border-cyan-500 ring-2 ring-cyan-500/30 shadow-cyan-500/10'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            )}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px] sm:text-xs">
                <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
                <span>Last 30 Days</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {rollingStats.days30.totalTrades} Trades
              </span>
            </div>

            <div
              className={clsx(
                'text-base sm:text-2xl font-black font-mono tracking-tight my-1',
                rollingStats.days30.pnl > 0 && 'text-emerald-400',
                rollingStats.days30.pnl < 0 && 'text-rose-400',
                rollingStats.days30.pnl === 0 && 'text-slate-300'
              )}
            >
              {rollingStats.days30.pnl > 0 ? '+' : ''}
              {formatCurrency(rollingStats.days30.pnl)}
            </div>

            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
              <span>
                Win: <strong className="text-white">{rollingStats.days30.winRate.toFixed(0)}%</strong> ({rollingStats.days30.winCount}W/{rollingStats.days30.lossCount}L)
              </span>
              <span className="text-amber-400/90">
                Fee: {formatCurrency(rollingStats.days30.charges)}
              </span>
            </div>
          </div>

          {/* Card B: Last 3 Months */}
          <div
            onClick={() => setTimeframeFilter(timeframeFilter === '3m' ? 'all' : '3m')}
            className={clsx(
              'p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-md relative overflow-hidden group active:scale-[0.99]',
              timeframeFilter === '3m'
                ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-500/10'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            )}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px] sm:text-xs">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Last 3 Months</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {rollingStats.months3.totalTrades} Trades
              </span>
            </div>

            <div
              className={clsx(
                'text-base sm:text-2xl font-black font-mono tracking-tight my-1',
                rollingStats.months3.pnl > 0 && 'text-emerald-400',
                rollingStats.months3.pnl < 0 && 'text-rose-400',
                rollingStats.months3.pnl === 0 && 'text-slate-300'
              )}
            >
              {rollingStats.months3.pnl > 0 ? '+' : ''}
              {formatCurrency(rollingStats.months3.pnl)}
            </div>

            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
              <span>
                Win: <strong className="text-white">{rollingStats.months3.winRate.toFixed(0)}%</strong> ({rollingStats.months3.winCount}W/{rollingStats.months3.lossCount}L)
              </span>
              <span className="text-amber-400/90">
                Fee: {formatCurrency(rollingStats.months3.charges)}
              </span>
            </div>
          </div>

          {/* Card C: Last 6 Months */}
          <div
            onClick={() => setTimeframeFilter(timeframeFilter === '6m' ? 'all' : '6m')}
            className={clsx(
              'p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-md relative overflow-hidden group active:scale-[0.99]',
              timeframeFilter === '6m'
                ? 'bg-gradient-to-br from-purple-950/80 via-slate-900 to-slate-900 border-purple-500 ring-2 ring-purple-500/30 shadow-purple-500/10'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            )}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px] sm:text-xs">
                <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Last 6 Months</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {rollingStats.months6.totalTrades} Trades
              </span>
            </div>

            <div
              className={clsx(
                'text-base sm:text-2xl font-black font-mono tracking-tight my-1',
                rollingStats.months6.pnl > 0 && 'text-emerald-400',
                rollingStats.months6.pnl < 0 && 'text-rose-400',
                rollingStats.months6.pnl === 0 && 'text-slate-300'
              )}
            >
              {rollingStats.months6.pnl > 0 ? '+' : ''}
              {formatCurrency(rollingStats.months6.pnl)}
            </div>

            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
              <span>
                Win: <strong className="text-white">{rollingStats.months6.winRate.toFixed(0)}%</strong> ({rollingStats.months6.winCount}W/{rollingStats.months6.lossCount}L)
              </span>
              <span className="text-amber-400/90">
                Fee: {formatCurrency(rollingStats.months6.charges)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Analytical Interactive Filters Bar (Collapsible on Mobile) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl space-y-2.5">
        <div
          onClick={() => setIsFilterExpandedMobile(!isFilterExpandedMobile)}
          className="flex items-center justify-between text-xs font-semibold text-slate-300 cursor-pointer sm:cursor-default"
        >
          <span className="flex items-center gap-1.5 text-indigo-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Detailed Filters</span>
          </span>

          {/* Toggle icon for small screens */}
          <div className="flex items-center gap-1 sm:hidden text-slate-400">
            <span className="text-[10px]">{isFilterExpandedMobile ? 'Hide' : 'Show All'}</span>
            <ChevronDown
              className={clsx(
                'w-4 h-4 transition-transform duration-200',
                isFilterExpandedMobile && 'rotate-180'
              )}
            />
          </div>
        </div>

        {/* Filters Grid - Always visible on desktop (sm:grid), collapsible on mobile */}
        <div
          className={clsx(
            'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-800/80',
            !isFilterExpandedMobile && 'hidden sm:grid'
          )}
        >
          {/* Month Filter */}
          <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-slate-800 space-y-0.5">
            <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-cyan-400" />
              <span>Month</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Months</option>
              <option value="1" className="bg-slate-900">January</option>
              <option value="2" className="bg-slate-900">February</option>
              <option value="3" className="bg-slate-900">March</option>
              <option value="4" className="bg-slate-900">April</option>
              <option value="5" className="bg-slate-900">May</option>
              <option value="6" className="bg-slate-900">June</option>
              <option value="7" className="bg-slate-900">July</option>
              <option value="8" className="bg-slate-900">August</option>
              <option value="9" className="bg-slate-900">September</option>
              <option value="10" className="bg-slate-900">October</option>
              <option value="11" className="bg-slate-900">November</option>
              <option value="12" className="bg-slate-900">December</option>
            </select>
          </div>

          {/* Year Filter */}
          <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-slate-800 space-y-0.5">
            <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-indigo-400" />
              <span>Year</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Trade Type Filter */}
          <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-slate-800 space-y-0.5">
            <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
              <Layers className="w-2.5 h-2.5 text-blue-400" />
              <span>Type</span>
            </label>
            <select
              value={selectedTradeType}
              onChange={(e) => setSelectedTradeType(e.target.value)}
              className="w-full bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Types</option>
              <option value="stock" className="bg-slate-900">Stock (Delivery)</option>
              <option value="intraday" className="bg-slate-900">Intraday</option>
            </select>
          </div>

          {/* Trade Decision / Strategy */}
          <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-slate-800 space-y-0.5">
            <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
              <Target className="w-2.5 h-2.5 text-amber-400" />
              <span>Strategy</span>
            </label>
            <select
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
              className="w-full bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Strategies</option>
              {DECISION_PRESETS.map((d) => (
                <option key={d} value={d} className="bg-slate-900">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-slate-800 space-y-0.5">
            <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-emerald-400" />
              <span>Outcome</span>
            </label>
            <select
              value={selectedOutcome}
              onChange={(e) => setSelectedOutcome(e.target.value)}
              className="w-full bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="profit" className="bg-slate-900 text-emerald-400">Wins Only</option>
              <option value="loss" className="bg-slate-900 text-rose-400">Losses Only</option>
              <option value="open" className="bg-slate-900 text-cyan-400">Active Positions</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="bg-slate-950 p-1.5 sm:p-2 rounded-xl border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
            <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
              <Search className="w-2.5 h-2.5 text-slate-400" />
              <span>Search</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker..."
              className="w-full bg-transparent text-[11px] sm:text-xs text-white font-medium placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Executive KPI Dashboard Grid (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Net Realized P&L */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-indigo-500/20 shadow-md space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1 text-indigo-300">
              <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
              <span>Net P&L</span>
            </span>
            <span
              className={clsx(
                'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded',
                analytics.overallRoi >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              )}
            >
              ROI {analytics.overallRoi > 0 ? '+' : ''}
              {analytics.overallRoi.toFixed(0)}%
            </span>
          </div>
          <div
            className={clsx(
              'text-base sm:text-2xl font-black font-mono tracking-tight truncate',
              analytics.totalRealizedPnl > 0 && 'text-emerald-400',
              analytics.totalRealizedPnl < 0 && 'text-rose-400',
              analytics.totalRealizedPnl === 0 && 'text-slate-200'
            )}
          >
            {analytics.totalRealizedPnl > 0 ? '+' : ''}
            {formatCurrency(analytics.totalRealizedPnl)}
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 flex items-center justify-between gap-1 truncate font-mono">
            <span className="text-emerald-400 font-semibold" title="Active capital in open positions">
              Active: {formatCurrency(analytics.currentInvested)}
            </span>
            <span className="text-slate-500" title="Total cumulative capital deployed">
              Inflow: {formatCurrency(analytics.totalInvested)}
            </span>
          </div>
        </div>

        {/* KPI 2: Win Rate & Trade Counts */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-md space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1 text-emerald-300">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Win Rate</span>
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {analytics.winCount}W / {analytics.lossCount}L
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black font-mono tracking-tight text-emerald-400">
            {analytics.winRate.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${analytics.winRate}%` }}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${analytics.lossRate}%` }}
            />
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            {analytics.totalClosed} closed • {analytics.openCount} open
          </p>
        </div>

        {/* KPI 3: Profit Factor & Risk-Reward */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-cyan-500/20 shadow-md space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1 text-cyan-300">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>Profit Factor</span>
            </span>
            <span className="text-[9px] font-mono text-cyan-400 font-bold">
              R:R {analytics.riskRewardRatio}
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black font-mono tracking-tight text-cyan-300">
            {analytics.profitFactor}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Win: <span className="text-emerald-400 font-mono font-semibold">+{formatCurrency(analytics.avgWin)}</span> • Loss: <span className="text-rose-400 font-mono font-semibold">-{formatCurrency(analytics.avgLoss)}</span>
          </p>
        </div>

        {/* KPI 4: Total Charges & Average Hold Time */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-amber-500/20 shadow-md space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1 text-amber-300">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Charges Paid</span>
            </span>
            <span className="text-[9px] font-mono text-amber-400">
              Fees & Taxes
            </span>
          </div>
          <div className="text-base sm:text-2xl font-black font-mono tracking-tight text-amber-400 truncate">
            {formatCurrency(analytics.totalCharges)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Hold: Win <strong className="text-white">{analytics.avgWinnerHoldingDays}d</strong> • Loss <strong className="text-white">{analytics.avgLoserHoldingDays}d</strong>
          </p>
        </div>
      </div>

      {/* 5. Strategy / Trade Decision Performance Matrix (Responsive Mobile Cards + Desktop Table) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Strategy & Setup Performance Matrix
              </h3>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Identify which setups generate the highest alpha and consistent win rates
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {decisionMatrix.length} Setups
          </span>
        </div>

        {/* 5A. Mobile Cards View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-800/80 p-2 space-y-2">
          {decisionMatrix.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No strategies recorded in this selection.
            </div>
          ) : (
            decisionMatrix.map((item, idx) => {
              const wr = item.closedTrades > 0 ? (item.winCount / item.closedTrades) * 100 : 0;
              const isPositive = item.totalPnl > 0;
              const isNegative = item.totalPnl < 0;

              return (
                <div
                  key={item.name}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-mono flex items-center justify-center text-slate-400 font-bold shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white text-xs font-mono truncate">
                        {item.name}
                      </span>
                    </div>

                    <span
                      className={clsx(
                        'text-[10px] font-mono font-bold px-2 py-0.5 rounded',
                        isPositive && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                        isNegative && 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                        !isPositive && !isNegative && 'bg-slate-800 text-slate-300'
                      )}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(item.totalPnl)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800/80 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Trades & Win Rate:</span>
                      <span className="text-slate-200">
                        {item.totalTrades} ({item.winCount}W/{item.lossCount}L)
                      </span>
                      <span
                        className={clsx(
                          'text-[10px] font-bold block',
                          wr >= 50 ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {wr.toFixed(1)}% Win Rate
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Profit vs Loss:</span>
                      <span className="text-emerald-400 font-medium block">
                        +{formatCurrency(item.grossProfit)}
                      </span>
                      <span className="text-rose-400 font-medium block">
                        -{formatCurrency(item.grossLoss)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5B. Desktop Table View (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <th className="py-2.5 px-3.5">Strategy / Setup</th>
                <th className="py-2.5 px-3 text-center">Trades Count</th>
                <th className="py-2.5 px-3 text-center">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Gross Profit</th>
                <th className="py-2.5 px-3 text-right">Gross Loss</th>
                <th className="py-2.5 px-3.5 text-right font-bold">Net Realized P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {decisionMatrix.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                    No trades match the current filter criteria.
                  </td>
                </tr>
              ) : (
                decisionMatrix.map((item, idx) => {
                  const wr = item.closedTrades > 0 ? (item.winCount / item.closedTrades) * 100 : 0;
                  const isPositive = item.totalPnl > 0;
                  const isNegative = item.totalPnl < 0;

                  return (
                    <tr key={item.name} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3.5 font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="tracking-tight">{item.name}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-center text-slate-300">
                        {item.totalTrades} ({item.closedTrades} closed)
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={clsx(
                              'font-mono font-bold text-[11px] px-1.5 py-0.2 rounded',
                              wr >= 60 && 'bg-emerald-500/10 text-emerald-400',
                              wr < 60 && wr >= 40 && 'bg-amber-500/10 text-amber-400',
                              wr < 40 && 'bg-rose-500/10 text-rose-400'
                            )}
                          >
                            {wr.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {item.winCount}W / {item.lossCount}L
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right text-emerald-400/90 font-medium">
                        +{formatCurrency(item.grossProfit)}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right text-rose-400/90 font-medium">
                        -{formatCurrency(item.grossLoss)}
                      </td>

                      <td
                        className={clsx(
                          'py-2.5 px-3.5 font-mono font-bold text-right text-xs',
                          isPositive && 'text-emerald-400',
                          isNegative && 'text-rose-400',
                          !isPositive && !isNegative && 'text-slate-300'
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(item.totalPnl)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Two Column Analytical Grid: Monthly Performance + Holding Duration Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Monthly Performance Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Monthly Realized P&L</h3>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Jan - Dec Breakdown</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {monthlyMatrix.map((m) => {
              const isProfit = m.totalPnl > 0;
              const isLoss = m.totalPnl < 0;

              return (
                <div
                  key={m.name}
                  className={clsx(
                    'p-2 sm:p-2.5 rounded-xl border text-center font-mono space-y-0.5 transition',
                    m.totalTrades === 0
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : isProfit
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isLoss
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-slate-950 border-slate-800'
                  )}
                >
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold block uppercase">
                    {m.name}
                  </span>
                  <div
                    className={clsx(
                      'text-[11px] sm:text-xs font-bold truncate',
                      isProfit && 'text-emerald-400',
                      isLoss && 'text-rose-400',
                      !isProfit && !isLoss && 'text-slate-500'
                    )}
                  >
                    {m.totalPnl !== 0 ? `${m.totalPnl > 0 ? '+' : ''}${formatCurrency(m.totalPnl)}` : '₹0'}
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-slate-500 block truncate">
                    {m.totalTrades} trades
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Holding Duration Analysis (Scalp vs Swing vs Positional) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Holding Duration vs Returns</h3>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Time Horizon</span>
          </div>

          <div className="space-y-2">
            {durationBuckets.map((b) => {
              const wr = b.count > 0 ? (b.wins / b.count) * 100 : 0;
              const isProfit = b.pnl > 0;
              const isLoss = b.pnl < 0;

              return (
                <div
                  key={b.label}
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-200 block text-[11px] sm:text-xs truncate">{b.label}</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                      {b.count} trades • {wr.toFixed(0)}% Win
                    </span>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span
                      className={clsx(
                        'font-bold text-[11px] sm:text-xs block',
                        isProfit && 'text-emerald-400',
                        isLoss && 'text-rose-400',
                        !isProfit && !isLoss && 'text-slate-400'
                      )}
                    >
                      {b.pnl > 0 ? '+' : ''}
                      {formatCurrency(b.pnl)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Top Highlights: Best Outliers & Worst Drawdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Top 3 Gainers */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-xl space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold border-b border-slate-800 pb-2">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span>Top Performing Trades (Biggest Winners)</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {topGainers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No winning trades recorded yet.</p>
            ) : (
              topGainers.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-2 sm:p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white font-mono text-[11px] sm:text-xs block truncate">
                      #{idx + 1} {t.assetName}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">
                      {t.tradeDecision} • Held {t.metrics.holdingDurationText}
                    </span>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span className="text-emerald-400 font-bold block text-[11px] sm:text-xs">
                      +{formatCurrency(t.metrics.returnsInr)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-300">
                      +{t.metrics.returnsPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 3 Losers */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-xl space-y-2">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold border-b border-slate-800 pb-2">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            <span>Drawdown Analysis (Biggest Losses / Lessons)</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {topLosers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No loss trades in this period.</p>
            ) : (
              topLosers.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-2 sm:p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white font-mono text-[11px] sm:text-xs block truncate">
                      #{idx + 1} {t.assetName}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">
                      {t.tradeDecision} • Held {t.metrics.holdingDurationText}
                    </span>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span className="text-rose-400 font-bold block text-[11px] sm:text-xs">
                      {formatCurrency(t.metrics.returnsInr)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-rose-300">
                      {t.metrics.returnsPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
