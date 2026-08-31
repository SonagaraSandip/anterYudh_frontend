import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  Zap,
  Activity
} from 'lucide-react';

export default function MainDashboard({ onNavigateTab }) {
  const [ipoStats, setIpoStats] = useState({
    totalIpos: 0,
    totalProfitLoss: 0,
    totalAllotted: 0,
    totalApplied: 0,
    overallRoi: null
  });
  const [cashflowStats, setCashflowStats] = useState({
    totalExpense: 0,
    totalIncome: 0,
    netSavings: 0,
    count: 0
  });
  const [tradingStats, setTradingStats] = useState({
    stockPl: 0,
    intradayPl: 0,
    netPl: 0,
    totalTrades: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch live stats for overview
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [ipoRes, expRes, tradeRes] = await Promise.allSettled([
          axios.get('/api/ipos'),
          axios.get('/api/expenses'),
          axios.get('/api/trades')
        ]);

        if (ipoRes.status === 'fulfilled' && Array.isArray(ipoRes.value.data)) {
          let pl = 0;
          let applied = 0;
          let allotted = 0;
          let invested = 0;

          ipoRes.value.data.forEach((ipo) => {
            const p = parseFloat(ipo.profitLoss) || 0;
            const lc = parseFloat(ipo.lotCost) || 0;
            pl += p;

            let ipoAllotted = 0;
            (ipo.applications || []).forEach((app) => {
              if (app.applied) applied += 1;
              if (app.allotted) {
                allotted += 1;
                ipoAllotted += 1;
              }
            });

            if (ipoAllotted > 0 && lc > 0) {
              invested += lc * ipoAllotted;
            } else if (p !== 0 && lc > 0) {
              invested += lc;
            }
          });

          const roi = invested > 0 ? ((pl / invested) * 100).toFixed(1) : null;

          setIpoStats({
            totalIpos: ipoRes.value.data.length,
            totalProfitLoss: pl,
            totalAllotted: allotted,
            totalApplied: applied,
            overallRoi: roi
          });
        }

        if (expRes.status === 'fulfilled' && Array.isArray(expRes.value.data)) {
          let totExp = 0;
          let totInc = 0;

          expRes.value.data.forEach((t) => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'income') {
              totInc += amt;
            } else {
              totExp += amt;
            }
          });

          setCashflowStats({
            totalExpense: totExp,
            totalIncome: totInc,
            netSavings: totInc - totExp,
            count: expRes.value.data.length
          });
        }

        if (tradeRes.status === 'fulfilled' && Array.isArray(tradeRes.value.data)) {
          let sPl = 0;
          let iPl = 0;

          tradeRes.value.data.forEach((t) => {
            const buyPrice = parseFloat(t.buyPrice) || 0;
            const qty = parseInt(t.quantity, 10) || 0;
            const charges = parseFloat(t.charges) || 0;
            const isClosed = t.sellPrice !== null && t.sellPrice !== undefined && t.sellPrice !== '';

            if (isClosed) {
              const sellPrice = parseFloat(t.sellPrice) || 0;
              const ret = (sellPrice * qty) - (buyPrice * qty) - charges;
              if (t.tradeType === 'stock') {
                sPl += ret;
              } else {
                iPl += ret;
              }
            }
          });

          setTradingStats({
            stockPl: sPl,
            intradayPl: iPl,
            netPl: sPl + iPl,
            totalTrades: tradeRes.value.data.length
          });
        }
      } catch (err) {
        console.warn('Could not fetch summary for dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);



  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(parseFloat(val) || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn font-sans">
        {/* Skeleton Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 w-full max-w-xl">
              <div className="h-5 w-48 rounded-full animate-shimmer" />
              <div className="h-8 w-72 rounded-xl animate-shimmer" />
              <div className="h-4 w-full rounded-lg animate-shimmer" />
            </div>
            <div className="h-10 w-36 rounded-xl animate-shimmer shrink-0" />
          </div>
        </div>

        {/* Skeleton Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl animate-shimmer" />
                <div className="w-16 h-5 rounded-full animate-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 rounded animate-shimmer" />
                <div className="h-3 w-36 rounded animate-shimmer opacity-70" />
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 rounded animate-shimmer opacity-60" />
                  <div className="h-3 w-20 rounded animate-shimmer" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3 w-14 rounded animate-shimmer opacity-60" />
                  <div className="h-3 w-16 rounded animate-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Deep Dive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="h-5 w-48 rounded animate-shimmer mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 rounded-xl animate-shimmer" />
              ))}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="h-5 w-36 rounded animate-shimmer mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-10 rounded-xl animate-shimmer" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AntarYudh Executive Command Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">AntarYudh</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Your centralized personal wealth & financial management ecosystem. Monitor active IPO investments, track long-term goals, organize budgets, and manage planned asset purchases in one unified space.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('ipo')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition active:scale-95 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Open IPO Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Module Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: IPO Matrix Status (Live) */}
        <div
          onClick={() => onNavigateTab('ipo')}
          className="bg-slate-900/90 border border-blue-500/20 hover:border-blue-500/50 rounded-2xl p-5 shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live & Synced
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">IPO Matrix</h3>
          <p className="text-xs text-slate-400 mb-3">Multi-Demat tracking & P&L</p>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Gain/Loss</span>
              <span className={`font-mono font-bold ${ipoStats.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ipoStats.totalProfitLoss > 0 ? '+' : ''}{formatCurrency(ipoStats.totalProfitLoss)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Active IPOs</span>
              <span className="font-mono font-semibold text-slate-200">{ipoStats.totalIpos} Listed</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-400 group-hover:text-blue-300">
            <span>Open Demat Matrix</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>


        {/* Card 2: Trading Journal */}
        <div
          onClick={() => onNavigateTab('trading')}
          className="bg-slate-900/90 border border-indigo-500/20 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Live Journal
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">Trading Journal</h3>
          <p className="text-xs text-slate-400 mb-3">Stocks & Intraday P/L</p>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Net Trading P/L</span>
              <span className={`font-mono font-bold ${tradingStats.netPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tradingStats.netPl > 0 ? '+' : ''}{formatCurrency(tradingStats.netPl)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Setups</span>
              <span className="font-mono font-semibold text-slate-200">{tradingStats.totalTrades} Logged</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300">
            <span>Open Trading Journal</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Card 3: Expenses Tracking */}
        <div
          onClick={() => onNavigateTab('expenses')}
          className="bg-slate-900/90 border border-rose-500/20 hover:border-rose-500/50 rounded-2xl p-5 shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Live Ledger
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">Cashflow & Expenses</h3>
          <p className="text-xs text-slate-400 mb-3">Two-way income & expense ledger</p>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Spent</span>
              <span className="font-mono font-bold text-rose-400">
                -{formatCurrency(cashflowStats.totalExpense)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Inflow</span>
              <span className="font-mono font-bold text-emerald-400">
                +{formatCurrency(cashflowStats.totalIncome)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-rose-400 group-hover:text-rose-300">
            <span>Open Cashflow Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Card 4: Buy & Wishlist */}
        <div
          onClick={() => onNavigateTab('buy')}
          className="bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Module
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">Buy / Wishlist</h3>
          <p className="text-xs text-slate-400 mb-3">Planned Asset Purchases</p>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Planned Items</span>
              <span className="font-mono font-semibold text-amber-400">6 Items</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Priority High</span>
              <span className="font-mono font-semibold text-slate-200">2 Items Ready</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-amber-400 group-hover:text-amber-300">
            <span>Open Buy List</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>
      </div>

      {/* Deep Dive Section: Quick Insights & Ecosystem Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Platform Features & Timeline */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                AntarYudh Platform Modules Overview
              </h3>
            </div>
            <span className="text-xs text-slate-400">Core Release</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">IPO Matrix Module</h4>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Active Live</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Complete Demat application tracking across multiple person accounts, automated lot cost ROI calculations, realized P&L badges, and persistent Aiven MySQL database cloud syncing.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Trading Journal Module (Stocks & Intraday)</h4>
                  <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">Active Live</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Notion-style data grids for tracking Positional Stock Delivery and Intraday Momentum trades with automated Net P/L, Returns %, and decision filters (Eagle Eye, Telegram, Self).
                </p>
              </div>
            </div>


            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Expenses & Outflow Tracker</h4>
                  <span className="text-[10px] text-rose-300 font-semibold bg-rose-500/10 px-2 py-0.5 rounded">Ready for Setup</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Categorize recurring and one-off expenditures, analyze burn rate, and monitor savings margins every month.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Planned Purchases (Buy Hub)</h4>
                  <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">Ready for Setup</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prioritize asset and item purchases with dynamic urgency scoring, price target tracking, and dedicated purchase budgets.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Status & Ecosystem Health */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              System & Database
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Database Connection</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                MySQL Cloud Connected
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Active Platform</span>
              <span className="text-white font-mono font-medium">AntarYudh Core v2.0</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Demat Synchronization</span>
              <span className="text-cyan-400 font-mono font-medium">Realtime Multi-Account</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-500/20 text-xs space-y-2">
            <div className="font-semibold text-indigo-300">💡 AntarYudh Architecture Tip</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Use the top navigation bar to switch between the <strong>IPO Matrix</strong>, <strong>Goals</strong>, <strong>Expenses</strong>, and <strong>Buy Hub</strong>. Each module has dedicated analytics matching its financial domain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
