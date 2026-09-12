import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import cacheManager from '../utils/cacheManager';
import {
  TrendingUp,
  BarChart2,
  CreditCard,
  FileText,
  ShoppingBag,
  Clock,
  Sparkles,
  ChevronRight,
  Activity,
  FileSpreadsheet,
  Cloud,
  BookOpen
} from 'lucide-react';
import { calculateIpoMetrics } from '../utils/ipoCalculator';

export default function MainDashboard({ onNavigateTab, onOpenBackup }) {
  // Live Data States backed by SWR Cache
  const [ipos, setIpos] = useState(() => {
    const cached = cacheManager.get('ipos_list');
    return Array.isArray(cached) ? cached : [];
  });

  const [trades, setTrades] = useState(() => {
    const cached = cacheManager.get('trades_list');
    return Array.isArray(cached) ? cached : [];
  });

  const [expenses, setExpenses] = useState(() => {
    const cached = cacheManager.get('cashflow_transactions');
    return Array.isArray(cached) ? cached : [];
  });

  const [notes, setNotes] = useState(() => {
    const cached = cacheManager.get('personal_notes_list');
    return Array.isArray(cached) ? cached : [];
  });

  const [buyItems, setBuyItems] = useState(() => {
    const cached = cacheManager.get('personal_buy_items_list');
    return Array.isArray(cached) ? cached : [];
  });

  const [backupStatus, setBackupStatus] = useState(null);

  // Fetch all live data in 1 single high-speed batch roundtrip
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const res = await axios.get('/api/dashboard/summary');
        if (res.data && res.data.success) {
          const { ipos: iposData, trades: tradesData, expenses: expData, notes: notesData, buyItems: buyData, backupStatus: bStatus } = res.data;

          if (Array.isArray(iposData)) {
            setIpos(iposData);
            cacheManager.set('ipos_list', iposData, 120000);
            localStorage.setItem('antaryudh_ipo_data', JSON.stringify(iposData));
          }
          if (Array.isArray(tradesData)) {
            setTrades(tradesData);
            cacheManager.set('trades_list', tradesData, 120000);
            localStorage.setItem('antaryudh_trading_data', JSON.stringify(tradesData));
          }
          if (Array.isArray(expData)) {
            setExpenses(expData);
            cacheManager.set('cashflow_transactions', expData, 120000);
            localStorage.setItem('antaryudh_cashflow_data', JSON.stringify(expData));
          }
          if (Array.isArray(notesData)) {
            setNotes(notesData);
            cacheManager.set('personal_notes_list', notesData, 120000);
            localStorage.setItem('antaryudh_cached_notes', JSON.stringify(notesData));
          }
          if (Array.isArray(buyData)) {
            setBuyItems(buyData);
            cacheManager.set('personal_buy_items_list', buyData, 120000);
            localStorage.setItem('antaryudh_cached_buy_items', JSON.stringify(buyData));
          }
          if (bStatus) {
            setBackupStatus(bStatus);
          }
          return;
        }
      } catch (err) {
        console.warn('Dashboard batch summary fallback to individual endpoints:', err.message);
      }

      // Fallback: Parallel separate endpoints if summary endpoint is unreachable
      try {
        const [ipoRes, tradeRes, expRes, noteRes, buyRes, backupRes] = await Promise.allSettled([
          axios.get('/api/ipos'),
          axios.get('/api/trades'),
          axios.get('/api/expenses'),
          axios.get('/api/notes'),
          axios.get('/api/buy'),
          axios.get('/api/backup/status')
        ]);

        if (ipoRes.status === 'fulfilled' && Array.isArray(ipoRes.value.data)) {
          setIpos(ipoRes.value.data);
          cacheManager.set('ipos_list', ipoRes.value.data, 120000);
        }
        if (tradeRes.status === 'fulfilled' && Array.isArray(tradeRes.value.data)) {
          setTrades(tradeRes.value.data);
          cacheManager.set('trades_list', tradeRes.value.data, 120000);
        }
        if (expRes.status === 'fulfilled' && Array.isArray(expRes.value.data)) {
          setExpenses(expRes.value.data);
          cacheManager.set('cashflow_transactions', expRes.value.data, 120000);
        }
        if (noteRes.status === 'fulfilled' && Array.isArray(noteRes.value.data)) {
          setNotes(noteRes.value.data);
          cacheManager.set('personal_notes_list', noteRes.value.data, 120000);
        }
        if (buyRes.status === 'fulfilled' && Array.isArray(buyRes.value.data)) {
          setBuyItems(buyRes.value.data);
          cacheManager.set('personal_buy_items_list', buyRes.value.data, 120000);
        }
        if (backupRes.status === 'fulfilled' && backupRes.value.data) {
          setBackupStatus(backupRes.value.data);
        }
      } catch (fallbackErr) {
        console.warn('Dashboard fallback fetch error:', fallbackErr);
      }
    };

    fetchAllData();
  }, []);

  // Format Backup Time
  const formatBackupTime = (dateStr) => {
    if (!dateStr) return 'No backup yet';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      if (isToday) return `Today at ${timeStr}`;
      if (isYesterday) return `Yesterday at ${timeStr}`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return 'Recently';
    }
  };

  // Format Currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(parseFloat(val) || 0);
  };

  // 1. IPO Analytics Calculations
  const ipoStats = useMemo(() => {
    let totalProfitLoss = 0;
    let totalApplied = 0;
    let totalAllotted = 0;
    let totalInvested = 0;

    (Array.isArray(ipos) ? ipos : []).forEach((ipo) => {
      const m = calculateIpoMetrics(ipo);
      totalProfitLoss += m.profitLoss;
      totalInvested += m.totalInvested;

      (ipo.applications || []).forEach((app) => {
        if (app.applied) totalApplied += 1;
        if (app.allotted) totalAllotted += 1;
      });
    });

    const allotmentRate = totalApplied > 0 ? ((totalAllotted / totalApplied) * 100).toFixed(1) : '0.0';

    return {
      count: ipos.length,
      totalProfitLoss,
      totalInvested,
      totalApplied,
      totalAllotted,
      allotmentRate
    };
  }, [ipos]);

  // 2. Trading Journal Analytics Calculations (Full multi-leg & partial closes support)
  const tradingStats = useMemo(() => {
    let stockPl = 0;
    let intradayPl = 0;
    let winningTrades = 0;
    let closedTrades = 0;
    let openTrades = 0;
    let totalInvested = 0;
    let currentInvested = 0;

    (Array.isArray(trades) ? trades : []).forEach((t) => {
      const buyPrice = parseFloat(t.buyPrice) || 0;
      const qty = parseInt(t.quantity, 10) || 0;
      const charges = parseFloat(t.charges) || 0;
      const tradeBuyCost = buyPrice * qty;
      totalInvested += tradeBuyCost;

      const isClosed = t.sellPrice !== null && t.sellPrice !== undefined && t.sellPrice !== '';
      if (isClosed) {
        closedTrades += 1;
        const sellPrice = parseFloat(t.sellPrice) || 0;
        const netTradePl = (sellPrice * qty) - tradeBuyCost - charges;
        if (netTradePl > 0) winningTrades += 1;

        if (t.tradeType === 'stock') {
          stockPl += netTradePl;
        } else {
          intradayPl += netTradePl;
        }
      } else {
        openTrades += 1;
        currentInvested += tradeBuyCost;
      }
    });

    const netPl = stockPl + intradayPl;
    const winRate = closedTrades > 0 ? ((winningTrades / closedTrades) * 100).toFixed(1) : '0.0';

    return {
      total: trades.length,
      netPl,
      stockPl,
      intradayPl,
      winningTrades,
      closedTrades,
      openTrades,
      winRate,
      totalInvested,
      currentInvested
    };
  }, [trades]);

  // 3. Cashflow / Expenses Analytics Calculations
  const cashflowStats = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;

    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    let monthExpense = 0;
    let monthIncome = 0;

    (Array.isArray(expenses) ? expenses : []).forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      const dateStr = (e.transactionDate || '').slice(0, 7);

      if (e.type === 'income') {
        totalIncome += amt;
        if (dateStr === currentMonthPrefix) monthIncome += amt;
      } else {
        totalExpense += amt;
        if (dateStr === currentMonthPrefix) monthExpense += amt;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const monthSavings = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? Math.max(0, ((monthSavings / monthIncome) * 100)).toFixed(1) : '0.0';

    return {
      totalExpense,
      totalIncome,
      netSavings,
      monthExpense,
      monthIncome,
      monthSavings,
      savingsRate,
      count: expenses.length
    };
  }, [expenses]);

  // Combined Portfolio Net Wealth (Trading + Savings only)
  const portfolioNetWealth = useMemo(() => {
    const totalPnl = (tradingStats.netPl || 0) + (cashflowStats.netSavings || 0);
    const combinedIncome = (cashflowStats.totalIncome || 0);
    const combinedExpense = (cashflowStats.totalExpense || 0);
    const netCashSavings = combinedIncome - combinedExpense;
    return {
      totalPnl,
      netCashSavings,
      totalRealizedGain: (tradingStats.netPl || 0) + Math.max(0, netCashSavings)
    };
  }, [tradingStats, cashflowStats]);

  // 4. Notes & Vault Stats
  const noteStats = useMemo(() => {
    const total = (Array.isArray(notes) ? notes : []).length;
    const secretCount = (Array.isArray(notes) ? notes : []).filter((n) => n.isSecret).length;
    return { total, secretCount };
  }, [notes]);

  // 5. Planned Buys / Wishlist Stats
  const buyStats = useMemo(() => {
    let totalEst = 0;
    let totalSaved = 0;

    (Array.isArray(buyItems) ? buyItems : []).forEach((b) => {
      const cost = parseFloat(b.estimatedCost) || 0;
      const saved = parseFloat(b.savedAmount) || 0;
      totalEst += cost;
      totalSaved += saved;
    });

    const fundingPct = totalEst > 0 ? Math.min(100, (totalSaved / totalEst) * 100).toFixed(0) : '0';

    return {
      total: buyItems.length,
      totalEst,
      totalSaved,
      fundingPct
    };
  }, [buyItems]);

  // 6. Recent Global Activity Stream (Combined from IPO, Trades, Expenses, Notes)
  const recentActivities = useMemo(() => {
    const list = [];

    // Recent Trades
    (Array.isArray(trades) ? trades : []).slice(0, 8).forEach((t) => {
      const isClosed = t.sellPrice !== null && t.sellPrice !== undefined && t.sellPrice !== '';
      const buyPrice = parseFloat(t.buyPrice) || 0;
      const sellPrice = parseFloat(t.sellPrice) || 0;
      const qty = parseInt(t.quantity, 10) || 0;
      const charges = parseFloat(t.charges) || 0;
      const pl = isClosed ? (sellPrice * qty) - (buyPrice * qty) - charges : 0;

      list.push({
        id: `trade-${t.id}`,
        module: 'trading',
        title: `${t.assetName} (${t.tradeType === 'stock' ? 'Stock' : 'Intraday'})`,
        subtitle: isClosed
          ? `Closed: ${pl >= 0 ? '+' : ''}${formatCurrency(pl)}`
          : `Open: ${qty} shares @ ₹${buyPrice}`,
        date: t.buyDate || t.createdAt,
        type: isClosed ? (pl >= 0 ? 'profit' : 'loss') : 'neutral',
        icon: BarChart2,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10'
      });
    });

    // Recent IPOs
    (Array.isArray(ipos) ? ipos : []).slice(0, 5).forEach((ipo) => {
      const pl = parseFloat(ipo.profitLoss) || 0;
      list.push({
        id: `ipo-${ipo.id}`,
        module: 'ipo',
        title: `${ipo.ipoName} IPO`,
        subtitle: ipo.status === 'listed'
          ? `P&L: ${pl >= 0 ? '+' : ''}${formatCurrency(pl)}`
          : `Status: ${ipo.status?.toUpperCase() || 'APPLIED'}`,
        date: ipo.createdAt,
        type: pl > 0 ? 'profit' : pl < 0 ? 'loss' : 'neutral',
        icon: TrendingUp,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10'
      });
    });

    // Recent Cashflow Transactions
    (Array.isArray(expenses) ? expenses : []).slice(0, 6).forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      list.push({
        id: `exp-${e.id}`,
        module: 'expenses',
        title: e.title,
        subtitle: `${e.type === 'income' ? '+' : '-'}${formatCurrency(amt)} • ${e.category}`,
        date: e.transactionDate || e.createdAt,
        type: e.type === 'income' ? 'income' : 'expense',
        icon: CreditCard,
        color: e.type === 'income' ? 'text-emerald-400' : 'text-rose-400',
        bg: e.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
      });
    });

    // Sort by Date Descending and pick top 6
    return list
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6);
  }, [trades, ipos, expenses]);

  return (
    <div className="space-y-3.5 sm:space-y-6 animate-fadeIn font-sans max-w-full overflow-hidden">
      {/* 1. EXECUTIVE WEALTH & REALIZED P&L HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-3.5 sm:p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                Executive Portfolio Overview
              </h2>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
                Live Cloud
              </span>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-white">
                {portfolioNetWealth.totalPnl >= 0 ? '+' : ''}{formatCurrency(portfolioNetWealth.totalPnl)}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
                Total Wealth (Trading + Savings)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] sm:text-xs font-mono text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 truncate">
                Trading: <strong className={tradingStats.netPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(tradingStats.netPl)}</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 truncate">
                Savings: <strong className={cashflowStats.netSavings >= 0 ? 'text-purple-300' : 'text-rose-400'}>{formatCurrency(cashflowStats.netSavings)}</strong>
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Buttons (Responsive Grid on Mobile) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onNavigateTab('trading')}
              className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-blue-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Trading</span>
            </button>
            <button
              onClick={() => onNavigateTab('ipo')}
              className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-cyan-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">IPO Matrix</span>
            </button>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-rose-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Expenses</span>
            </button>
            <button
              onClick={() => onNavigateTab('notes')}
              className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-purple-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Notes</span>
            </button>
            <button
              onClick={() => onNavigateTab('growth')}
              className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-amber-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate cursor-pointer col-span-2 sm:col-span-1"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Skills & Books</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP SHORTCUT QUICK-ACCESS BUTTONS (Responsive Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Shortcut 1: IPO Matrix */}
        <button
          onClick={() => onNavigateTab('ipo')}
          className="group relative p-3 sm:p-4 md:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-cyan-500/50 shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 active:scale-[0.98] text-left flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 truncate">
              {ipoStats.count} IPOs
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xs sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
              <span className="truncate">IPO Matrix</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all shrink-0" />
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              {ipoStats.totalAllotted} Allotted Lots • {formatCurrency(ipoStats.totalProfitLoss)} P&L
            </p>
          </div>
        </button>

        {/* Shortcut 2: Trading Journal */}
        <button
          onClick={() => onNavigateTab('trading')}
          className="group relative p-3 sm:p-4 md:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-indigo-500/50 shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 active:scale-[0.98] text-left flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
              <BarChart2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate">
              {tradingStats.total} Setups
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xs sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
              <span className="truncate">Trading Journal</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all shrink-0" />
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate font-mono">
              Active: <span className="text-emerald-400 font-bold">{formatCurrency(tradingStats.currentInvested)}</span> • Total: {formatCurrency(tradingStats.totalInvested)}
            </p>
          </div>
        </button>

        {/* Shortcut 3: Expenses & Cashflow */}
        <button
          onClick={() => onNavigateTab('expenses')}
          className="group relative p-3 sm:p-4 md:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-rose-500/50 shadow-lg hover:shadow-rose-500/10 transition-all duration-300 active:scale-[0.98] text-left flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 truncate">
              {cashflowStats.count} Txns
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xs sm:text-base font-bold text-white group-hover:text-rose-300 transition-colors flex items-center justify-between">
              <span className="truncate">Expenses</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-rose-300 group-hover:translate-x-1 transition-all shrink-0" />
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              {formatCurrency(cashflowStats.monthExpense)} Month Spent • Ledger
            </p>
          </div>
        </button>

        {/* Shortcut 4: Notes & Secret Vault */}
        <button
          onClick={() => onNavigateTab('notes')}
          className="group relative p-3 sm:p-4 md:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/10 transition-all duration-300 active:scale-[0.98] text-left flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform shrink-0">
              <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 truncate">
              {noteStats.total} Notes
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xs sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
              <span className="truncate">Notes & Vault</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-1 transition-all shrink-0" />
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              {noteStats.secretCount} Passwords • {buyStats.total} Wishlist Items
            </p>
          </div>
        </button>
      </div>

      {/* 3. DEEP ANALYTICS: MONTHLY CASHFLOW HEALTH & RECENT ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">
        {/* Left: Monthly Cashflow & Savings Distribution Meter */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-3.5 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 sm:pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                Cashflow Health & Dynamics
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
              {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <div className="p-2 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center sm:text-left">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate block">Month Inflow</span>
              <div className="text-xs sm:text-base md:text-lg font-bold font-mono text-emerald-400 mt-0.5 sm:mt-1 truncate">
                +{formatCurrency(cashflowStats.monthIncome)}
              </div>
            </div>
            <div className="p-2 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center sm:text-left">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate block">Month Outflow</span>
              <div className="text-xs sm:text-base md:text-lg font-bold font-mono text-rose-400 mt-0.5 sm:mt-1 truncate">
                -{formatCurrency(cashflowStats.monthExpense)}
              </div>
            </div>
            <div className="p-2 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center sm:text-left">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate block">Savings Rate</span>
              <div className="text-xs sm:text-base md:text-lg font-bold font-mono text-cyan-400 mt-0.5 sm:mt-1">
                {cashflowStats.savingsRate}%
              </div>
            </div>
          </div>

          {/* Savings Ratio Progress Bar */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[10px] sm:text-xs">Expense vs Inflow Ratio</span>
              <span className="font-mono text-slate-300 text-[10px] sm:text-xs">
                Spent: {cashflowStats.monthIncome > 0 ? ((cashflowStats.monthExpense / cashflowStats.monthIncome) * 100).toFixed(0) : '0'}%
              </span>
            </div>
            <div className="w-full h-2 sm:h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-gradient-to-r from-rose-500 to-amber-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, cashflowStats.monthIncome > 0 ? (cashflowStats.monthExpense / cashflowStats.monthIncome) * 100 : 0)}%`
                }}
              />
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, 100 - (cashflowStats.monthIncome > 0 ? (cashflowStats.monthExpense / cashflowStats.monthIncome) * 100 : 0))}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">Out ({formatCurrency(cashflowStats.monthExpense)})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">Retained ({formatCurrency(cashflowStats.monthSavings)})</span>
              </span>
            </div>
          </div>

          {/* Planned Buys Target Funding Meter */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold text-[10px] sm:text-xs">
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">Goals Funding</span>
              </span>
              <span className="font-mono text-purple-300 font-bold text-[10px] sm:text-xs">
                {formatCurrency(buyStats.totalSaved)} / {formatCurrency(buyStats.totalEst)} ({buyStats.fundingPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 h-full transition-all duration-500"
                style={{ width: `${buyStats.fundingPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Database Cloud Backup Quick Card + Unified Activity Stream */}
        <div className="space-y-3.5 sm:space-y-4 flex flex-col">
          {/* Cloud Database Backup Widget */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                    <span>Database & Drive Sync</span>
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                    <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Last: {formatBackupTime(backupStatus?.lastBackupTime)}</span>
                  </div>
                </div>
              </div>

              <span className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                backupStatus?.isConfigured
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {backupStatus?.isConfigured ? '🟢 Drive Linked' : '🟡 Local Mode'}
              </span>
            </div>

            <button
              onClick={onOpenBackup}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Backup Database Now</span>
            </button>
          </div>

          {/* Unified Activity Stream */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 sm:space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Recent Activity
                </h3>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Live Feed
              </span>
            </div>

          <div className="space-y-2 sm:space-y-2.5">
            {recentActivities.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                No recent transactions or trades recorded yet.
              </div>
            ) : (
              recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={() => onNavigateTab(act.module)}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${act.bg} ${act.color} shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] sm:text-xs font-bold text-slate-200 group-hover:text-white truncate">
                          {act.title}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                          {act.subtitle}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
