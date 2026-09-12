import { useState, useMemo, Fragment } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  BarChart2,
  PieChart,
  Activity,
  Zap,
  Target,
  Shield,
  Clock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Wallet,
  CreditCard,
  ShoppingBag,
  Receipt,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Coins,
  Flame,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function ExpenseAnalysis({ transactions = [], onBack }) {
  // Quick Rolling Timeframe Filter: 'all' | '30d' | '3m' | '6m' | '1y' | 'current_year'
  const [timeframeFilter, setTimeframeFilter] = useState('all');

  // Analytical Filters
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'expense' | 'income'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('all');
  const [selectedPnlStatus, setSelectedPnlStatus] = useState('all'); // 'all' | 'surplus' | 'deficit'
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Filter Collapsible State
  const [isFilterExpandedMobile, setIsFilterExpandedMobile] = useState(false);

  // Monthly Table Sorting State
  const [monthlySortKey, setMonthlySortKey] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc' | 'income_desc' | 'expense_desc' | 'savings_desc'

  // Selected Month for Deep-Dive Drawer
  const [expandedMonthKey, setExpandedMonthKey] = useState(null);

  // Format Currency (INR ₹)
  const formatCurrency = (val, maxDecimals = 0) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: maxDecimals
    }).format(num);
  };

  // Format Date (e.g. "15 Aug 2026")
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

  // Extract unique years from transactions
  const availableYears = useMemo(() => {
    const years = new Set();
    transactions.forEach((t) => {
      if (t.transactionDate) {
        const y = new Date(t.transactionDate).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Extract unique categories & payment modes
  const { availableCategories, availablePaymentModes } = useMemo(() => {
    const catSet = new Set();
    const paySet = new Set();
    transactions.forEach((t) => {
      if (t.category) catSet.add(t.category);
      if (t.paymentMode) paySet.add(t.paymentMode);
    });
    return {
      availableCategories: Array.from(catSet).sort(),
      availablePaymentModes: Array.from(paySet).sort()
    };
  }, [transactions]);

  // Rolling Period Calculation (Last 30 Days, Last 3 Months, Last 6 Months)
  const rollingStats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const t30DaysAgo = now - 30 * dayMs;
    const t90DaysAgo = now - 90 * dayMs;
    const t180DaysAgo = now - 180 * dayMs;

    const computeWindow = (sinceTimestamp) => {
      let income = 0;
      let expense = 0;
      let totalTx = 0;
      let incomeTx = 0;
      let expenseTx = 0;

      transactions.forEach((t) => {
        if (!t.transactionDate) return;
        const dTime = new Date(t.transactionDate).getTime();
        if (isNaN(dTime) || dTime < sinceTimestamp) return;

        totalTx++;
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
          income += amt;
          incomeTx++;
        } else {
          expense += amt;
          expenseTx++;
        }
      });

      const netPnl = income - expense;
      const savingsRate = income > 0 ? (netPnl / income) * 100 : expense > 0 ? -100 : 0;
      return {
        income,
        expense,
        netPnl,
        savingsRate,
        totalTx,
        incomeTx,
        expenseTx
      };
    };

    return {
      days30: computeWindow(t30DaysAgo),
      months3: computeWindow(t90DaysAgo),
      months6: computeWindow(t180DaysAgo)
    };
  }, [transactions]);

  // Filtered dataset according to criteria
  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const t30DaysAgo = now - 30 * dayMs;
    const t90DaysAgo = now - 90 * dayMs;
    const t180DaysAgo = now - 180 * dayMs;
    const t365DaysAgo = now - 365 * dayMs;
    const currentYear = new Date().getFullYear();

    return transactions.filter((t) => {
      const d = t.transactionDate ? new Date(t.transactionDate) : null;
      const tTime = d && !isNaN(d.getTime()) ? d.getTime() : 0;

      // Rolling timeframe filter
      if (timeframeFilter === '30d' && tTime < t30DaysAgo) return false;
      if (timeframeFilter === '3m' && tTime < t90DaysAgo) return false;
      if (timeframeFilter === '6m' && tTime < t180DaysAgo) return false;
      if (timeframeFilter === '1y' && tTime < t365DaysAgo) return false;
      if (timeframeFilter === 'current_year' && d && d.getFullYear() !== currentYear) return false;

      // Year filter
      if (selectedYear !== 'all') {
        if (!d || d.getFullYear() !== parseInt(selectedYear, 10)) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        if (!d || d.getMonth() + 1 !== parseInt(selectedMonth, 10)) return false;
      }

      // Transaction type filter
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Payment Mode filter
      if (selectedPaymentMode !== 'all' && t.paymentMode !== selectedPaymentMode) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const catMatch = (t.category || '').toLowerCase().includes(q);
        const payMatch = (t.paymentMode || '').toLowerCase().includes(q);
        const noteMatch = (t.notes || '').toLowerCase().includes(q);
        if (!titleMatch && !catMatch && !payMatch && !noteMatch) return false;
      }

      return true;
    });
  }, [
    transactions,
    timeframeFilter,
    selectedYear,
    selectedMonth,
    selectedType,
    selectedCategory,
    selectedPaymentMode,
    searchQuery
  ]);

  // Master KPI Overall Analytics
  const analytics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    let maxExpense = 0;
    let maxExpenseTx = null;
    let maxIncome = 0;
    let maxIncomeTx = null;

    filteredTransactions.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
        incomeCount++;
        if (amt > maxIncome) {
          maxIncome = amt;
          maxIncomeTx = t;
        }
      } else {
        totalExpense += amt;
        expenseCount++;
        if (amt > maxExpense) {
          maxExpense = amt;
          maxExpenseTx = t;
        }
      }
    });

    const netPnl = totalIncome - totalExpense; // Net Realized Surplus (+) or Deficit (-)
    const savingsRate = totalIncome > 0 ? (netPnl / totalIncome) * 100 : totalExpense > 0 ? -100 : 0;
    const expenseToIncomeRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : totalExpense > 0 ? 100 : 0;

    const avgExpensePerTx = expenseCount > 0 ? totalExpense / expenseCount : 0;
    const avgIncomePerTx = incomeCount > 0 ? totalIncome / incomeCount : 0;

    // Date range span in days
    const dates = filteredTransactions
      .map((t) => new Date(t.transactionDate).getTime())
      .filter((tm) => !isNaN(tm));

    let daySpan = 30;
    if (dates.length > 1) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      daySpan = Math.max(1, Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
    }

    const dailyBurnRate = daySpan > 0 ? totalExpense / daySpan : 0;
    const dailyIncomeRate = daySpan > 0 ? totalIncome / daySpan : 0;

    return {
      totalIncome,
      totalExpense,
      netPnl,
      savingsRate,
      expenseToIncomeRatio,
      incomeCount,
      expenseCount,
      totalCount: incomeCount + expenseCount,
      avgExpensePerTx,
      avgIncomePerTx,
      maxExpense,
      maxExpenseTx,
      maxIncome,
      maxIncomeTx,
      daySpan,
      dailyBurnRate,
      dailyIncomeRate
    };
  }, [filteredTransactions]);

  // Category Matrix Table & Performance
  const categoryMatrix = useMemo(() => {
    const map = {};
    let totalOutflow = 0;

    filteredTransactions.forEach((t) => {
      const cat = t.category || 'General';
      const amt = parseFloat(t.amount) || 0;

      if (!map[cat]) {
        map[cat] = {
          category: cat,
          totalCount: 0,
          expenseCount: 0,
          incomeCount: 0,
          totalExpense: 0,
          totalIncome: 0,
          netPnl: 0
        };
      }

      map[cat].totalCount++;
      if (t.type === 'income') {
        map[cat].totalIncome += amt;
        map[cat].incomeCount++;
      } else {
        map[cat].totalExpense += amt;
        map[cat].expenseCount++;
        totalOutflow += amt;
      }
    });

    return Object.values(map)
      .map((c) => ({
        ...c,
        netPnl: c.totalIncome - c.totalExpense,
        expensePercentage: totalOutflow > 0 ? (c.totalExpense / totalOutflow) * 100 : 0
      }))
      .sort((a, b) => b.totalExpense - a.totalExpense);
  }, [filteredTransactions]);

  // 12-Month Jan-Dec Realized P&L Matrix (Grid Box of 12 Months)
  const monthlyJanDecMatrix = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const map = months.map((name, i) => ({
      monthIndex: i + 1,
      name,
      totalCount: 0,
      expenseCount: 0,
      incomeCount: 0,
      income: 0,
      expense: 0,
      totalPnl: 0 // Realized Net P&L (Income - Expense)
    }));

    filteredTransactions.forEach((t) => {
      if (t.transactionDate) {
        const d = new Date(t.transactionDate);
        if (!isNaN(d.getTime())) {
          const idx = d.getMonth();
          if (map[idx]) {
            const amt = parseFloat(t.amount) || 0;
            map[idx].totalCount++;
            if (t.type === 'income') {
              map[idx].income += amt;
              map[idx].incomeCount++;
            } else {
              map[idx].expense += amt;
              map[idx].expenseCount++;
            }
          }
        }
      }
    });

    map.forEach((m) => {
      m.totalPnl = m.income - m.expense;
    });

    return map;
  }, [filteredTransactions]);

  // Expense Ticket Size & Outflow Velocity Buckets (Scalp/Swing equivalent)
  const expenseTicketBuckets = useMemo(() => {
    const buckets = [
      { label: 'Micro Spend (< ₹500)', min: 0, max: 499.99, count: 0, totalAmount: 0 },
      { label: 'Day-to-Day (₹500 – ₹2,000)', min: 500, max: 2000, count: 0, totalAmount: 0 },
      { label: 'Substantial (₹2,000 – ₹10,000)', min: 2000.01, max: 10000, count: 0, totalAmount: 0 },
      { label: 'Big Ticket (> ₹10,000)', min: 10000.01, max: Infinity, count: 0, totalAmount: 0 }
    ];

    let totalExpenseAmount = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'expense') {
        const amt = parseFloat(t.amount) || 0;
        totalExpenseAmount += amt;
        const bucket = buckets.find((b) => amt >= b.min && amt <= b.max);
        if (bucket) {
          bucket.count++;
          bucket.totalAmount += amt;
        }
      }
    });

    return buckets.map((b) => ({
      ...b,
      sharePct: totalExpenseAmount > 0 ? (b.totalAmount / totalExpenseAmount) * 100 : 0
    }));
  }, [filteredTransactions]);

  // Full Chronological Monthly P&L Ledger Matrix (Every YYYY-MM in dataset)
  const monthlyPnlList = useMemo(() => {
    const monthMap = {};

    filteredTransactions.forEach((t) => {
      if (!t.transactionDate) return;
      const d = new Date(t.transactionDate);
      if (isNaN(d.getTime())) return;

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${y}-${m}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      if (!monthMap[monthKey]) {
        const daysInMonth = new Date(y, d.getMonth() + 1, 0).getDate();
        monthMap[monthKey] = {
          monthKey,
          monthLabel,
          year: y,
          monthNum: d.getMonth() + 1,
          daysInMonth,
          income: 0,
          expense: 0,
          incomeCount: 0,
          expenseCount: 0,
          txCount: 0,
          transactions: []
        };
      }

      const amt = parseFloat(t.amount) || 0;
      monthMap[monthKey].transactions.push(t);
      monthMap[monthKey].txCount++;

      if (t.type === 'income') {
        monthMap[monthKey].income += amt;
        monthMap[monthKey].incomeCount++;
      } else {
        monthMap[monthKey].expense += amt;
        monthMap[monthKey].expenseCount++;
      }
    });

    let list = Object.values(monthMap).map((m) => {
      const netPnl = m.income - m.expense;
      const savingsRate = m.income > 0 ? (netPnl / m.income) * 100 : m.expense > 0 ? -100 : 0;
      const expenseRatio = m.income > 0 ? (m.expense / m.income) * 100 : m.expense > 0 ? 100 : 0;
      const dailyBurn = m.daysInMonth > 0 ? m.expense / m.daysInMonth : 0;
      const isSurplus = netPnl >= 0;

      return {
        ...m,
        netPnl,
        savingsRate,
        expenseRatio,
        dailyBurn,
        isSurplus
      };
    });

    if (selectedPnlStatus === 'surplus') {
      list = list.filter((m) => m.netPnl >= 0);
    } else if (selectedPnlStatus === 'deficit') {
      list = list.filter((m) => m.netPnl < 0);
    }

    list.sort((a, b) => {
      if (monthlySortKey === 'date_asc') return a.monthKey.localeCompare(b.monthKey);
      if (monthlySortKey === 'date_desc') return b.monthKey.localeCompare(a.monthKey);
      if (monthlySortKey === 'pnl_desc') return b.netPnl - a.netPnl;
      if (monthlySortKey === 'pnl_asc') return a.netPnl - b.netPnl;
      if (monthlySortKey === 'income_desc') return b.income - a.income;
      if (monthlySortKey === 'expense_desc') return b.expense - a.expense;
      if (monthlySortKey === 'savings_desc') return b.savingsRate - a.savingsRate;
      return b.monthKey.localeCompare(a.monthKey);
    });

    return list;
  }, [filteredTransactions, selectedPnlStatus, monthlySortKey]);

  // Top 3 Best Inflows & Top 3 Largest Outflows
  const { topGainers, topLosers } = useMemo(() => {
    const expenses = [...filteredTransactions]
      .filter((t) => t.type === 'expense')
      .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));

    const incomes = [...filteredTransactions]
      .filter((t) => t.type === 'income')
      .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));

    return {
      topGainers: incomes.slice(0, 3),
      topLosers: expenses.slice(0, 3)
    };
  }, [filteredTransactions]);

  // Reset all analytical filters
  const handleResetFilters = () => {
    setTimeframeFilter('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedPaymentMode('all');
    setSelectedPnlStatus('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    timeframeFilter !== 'all' ||
    selectedYear !== 'all' ||
    selectedMonth !== 'all' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedPaymentMode !== 'all' ||
    selectedPnlStatus !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-sans selection:bg-rose-500 selection:text-white max-w-full overflow-hidden">
      
      {/* 1. Header Banner with Back Button & Timeframe Filter */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/25 to-slate-900 border border-slate-800 p-4 sm:p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 shadow-md transition active:scale-95 flex items-center justify-center shrink-0 group"
                title="Return to Cashflow Ledger"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                    <span>Cashflow &amp; Expense Analytics</span>
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-black font-mono tracking-wider">
                    MONTHLY REALIZED P&amp;L
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                  Monthly realized surplus/deficit grid, ticket size distribution, and category intelligence
                </p>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}

              <button
                onClick={onBack}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ledger View</span>
              </button>
            </div>
          </div>

          {/* Quick Rolling Timeframe Filter Pills */}
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                <Clock className="w-3 h-3 text-rose-400" />
                Timeframe:
              </span>
              {[
                { id: 'all', label: 'All Time' },
                { id: '30d', label: 'Last 30 Days' },
                { id: '3m', label: 'Last 3 Months' },
                { id: '6m', label: 'Last 6 Months' },
                { id: '1y', label: 'Last 1 Year' },
                { id: 'current_year', label: `Year ${new Date().getFullYear()}` }
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframeFilter(tf.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition',
                    timeframeFilter === tf.id
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Showing <span className="text-white font-bold">{filteredTransactions.length}</span> transactions
              across <span className="text-emerald-400 font-bold">{monthlyPnlList.length}</span> months
            </div>
          </div>
        </div>
      </div>

      {/* 2. Rolling Period KPI Quick Overview Cards (30D, 3M, 6M) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Last 30 Days', data: rollingStats.days30, sub: 'Recent Cashflow' },
          { label: 'Last 3 Months (Quarter)', data: rollingStats.months3, sub: 'Quarterly Velocity' },
          { label: 'Last 6 Months', data: rollingStats.months6, sub: 'Mid-Year Trajectory' }
        ].map((block) => {
          const isPos = block.data.netPnl >= 0;
          return (
            <div
              key={block.label}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">{block.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{block.sub}</span>
                </div>
                <span
                  className={clsx(
                    'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full',
                    isPos ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  )}
                >
                  {isPos ? 'Surplus' : 'Deficit'}
                </span>
              </div>

              <div className="text-base sm:text-lg font-black font-mono tracking-tight flex items-center gap-1">
                <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                  {isPos ? '+' : '-'}{formatCurrency(Math.abs(block.data.netPnl))}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">
                  ({block.data.savingsRate.toFixed(0)}% saved)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                <div>
                  Income: <span className="text-emerald-400 font-bold">{formatCurrency(block.data.income)}</span>
                </div>
                <div className="text-right">
                  Expense: <span className="text-rose-400 font-bold">{formatCurrency(block.data.expense)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Comprehensive Analytical Filter Bar (Collapsible on Mobile) */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2 sm:hidden mb-2">
          <button
            onClick={() => setIsFilterExpandedMobile(!isFilterExpandedMobile)}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            <span>Filter &amp; Search Matrix</span>
            {isFilterExpandedMobile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {hasActiveFilters && (
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
              Filters Active
            </span>
          )}
        </div>

        <div className={clsx('space-y-3', !isFilterExpandedMobile && 'hidden sm:block')}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            
            {/* Year Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500 transition"
              >
                <option value="all">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500 transition"
              >
                <option value="all">All Months</option>
                {[
                  { num: '1', name: 'January' },
                  { num: '2', name: 'February' },
                  { num: '3', name: 'March' },
                  { num: '4', name: 'April' },
                  { num: '5', name: 'May' },
                  { num: '6', name: 'June' },
                  { num: '7', name: 'July' },
                  { num: '8', name: 'August' },
                  { num: '9', name: 'September' },
                  { num: '10', name: 'October' },
                  { num: '11', name: 'November' },
                  { num: '12', name: 'December' }
                ].map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500 transition"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense Only</option>
                <option value="income">Income Only</option>
              </select>
            </div>

            {/* Realized P&L Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly P&amp;L</label>
              <select
                value={selectedPnlStatus}
                onChange={(e) => setSelectedPnlStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500 transition"
              >
                <option value="all">All P&amp;L Status</option>
                <option value="surplus">🟢 Net Surplus (Profit)</option>
                <option value="deficit">🔴 Net Deficit (Overspend)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500 transition"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Mode */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</label>
              <select
                value={selectedPaymentMode}
                onChange={(e) => setSelectedPaymentMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500 transition"
              >
                <option value="all">All Modes</option>
                {availablePaymentModes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search title, category, notes, or payment mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 font-medium placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Master KPI Realized Cashflow Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Total Realized Income */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3.5 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              Total Income
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold">
              {analytics.incomeCount} Credits
            </span>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {formatCurrency(analytics.totalIncome)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium border-t border-slate-800/60 pt-1.5">
            <span>Avg / Credit:</span>
            <span className="font-mono text-slate-300 font-bold">{formatCurrency(analytics.avgIncomePerTx)}</span>
          </div>
        </div>

        {/* Total Realized Expense */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3.5 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
              Total Expenses
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-mono font-bold">
              {analytics.expenseCount} Debits
            </span>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-black text-rose-400 font-mono tracking-tight">
            {formatCurrency(analytics.totalExpense)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium border-t border-slate-800/60 pt-1.5">
            <span>Avg / Debit:</span>
            <span className="font-mono text-slate-300 font-bold">{formatCurrency(analytics.avgExpensePerTx)}</span>
          </div>
        </div>

        {/* Realized Net P&L (Monthly / Period Realized Net Surplus or Deficit) */}
        <div className={clsx(
          'relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl',
          analytics.netPnl >= 0
            ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30'
            : 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/30'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className={clsx('w-3.5 h-3.5', analytics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')} />
              Realized Net P&amp;L
            </span>
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full font-bold font-mono',
              analytics.netPnl >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            )}>
              {analytics.netPnl >= 0 ? 'Net Surplus' : 'Net Deficit'}
            </span>
          </div>
          <div className={clsx(
            'text-base sm:text-xl lg:text-2xl font-black font-mono tracking-tight flex items-center gap-1',
            analytics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          )}>
            <span>{analytics.netPnl >= 0 ? '+' : '-'}</span>
            <span>{formatCurrency(Math.abs(analytics.netPnl))}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium border-t border-slate-800/60 pt-1.5">
            <span>Savings Rate:</span>
            <span className={clsx(
              'font-mono font-bold',
              analytics.savingsRate >= 30 ? 'text-emerald-400' : analytics.savingsRate >= 0 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {analytics.savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Burn Rate & Velocity */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-3.5 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Daily Burn Velocity
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono font-bold">
              {analytics.daySpan} Days Span
            </span>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-black text-amber-400 font-mono tracking-tight">
            {formatCurrency(analytics.dailyBurnRate)}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">/day</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium border-t border-slate-800/60 pt-1.5">
            <span>Spend / Income:</span>
            <span className="font-mono text-slate-300 font-bold">{analytics.expenseToIncomeRatio.toFixed(1)}%</span>
          </div>
        </div>

      </div>

      {/* 5. Category Cashflow Performance Table (Similar to Strategy/Decision Matrix) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-rose-400" />
              <span>Category Outflow &amp; Realized Cashflow Matrix</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Spending volume, transaction frequency, and realized net outflow by category
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 self-start sm:self-auto">
            {categoryMatrix.length} Categories Active
          </span>
        </div>

        {/* Responsive Mobile / Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3 text-center">Transactions</th>
                <th className="py-2.5 px-3 text-right">Total Expense</th>
                <th className="py-2.5 px-3 text-right">Expense Share</th>
                <th className="py-2.5 px-3 text-right">Total Income</th>
                <th className="py-2.5 px-3.5 text-right font-bold">Net Realized P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {categoryMatrix.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                    No transactions match the current filter criteria.
                  </td>
                </tr>
              ) : (
                categoryMatrix.map((item, idx) => {
                  const isPositive = item.netPnl > 0;
                  const isNegative = item.netPnl < 0;

                  return (
                    <tr key={item.category} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3.5 font-sans font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="tracking-tight">{item.category}</span>
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-300">
                        {item.totalCount} ({item.expenseCount}D / {item.incomeCount}C)
                      </td>

                      <td className="py-2.5 px-3 text-right text-rose-400 font-medium">
                        {formatCurrency(item.totalExpense)}
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {item.expensePercentage.toFixed(1)}%
                      </td>

                      <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                        {item.totalIncome > 0 ? formatCurrency(item.totalIncome) : '—'}
                      </td>

                      <td
                        className={clsx(
                          'py-2.5 px-3.5 font-bold text-right text-xs',
                          isPositive && 'text-emerald-400',
                          isNegative && 'text-rose-400',
                          !isPositive && !isNegative && 'text-slate-400'
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(item.netPnl)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Two Column Analytical Grid: Monthly Performance + Outflow Ticket Size Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        
        {/* Left Column: Monthly Realized P&L (Jan - Dec 12 Month Grid) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Monthly Realized P&amp;L</h3>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Jan - Dec Breakdown</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {monthlyJanDecMatrix.map((m) => {
              const isProfit = m.totalPnl > 0;
              const isLoss = m.totalPnl < 0;

              return (
                <div
                  key={m.name}
                  className={clsx(
                    'p-2 sm:p-2.5 rounded-xl border text-center font-mono space-y-0.5 transition',
                    m.totalCount === 0
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
                    {m.totalCount} transactions
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Outflow Ticket Size & Horizon Buckets */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Expense Ticket Size Distribution</h3>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Outflow Size</span>
          </div>

          <div className="space-y-2">
            {expenseTicketBuckets.map((b) => (
              <div
                key={b.label}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-slate-200 block text-[11px] sm:text-xs truncate">{b.label}</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                    {b.count} debits • {b.sharePct.toFixed(1)}% of expenses
                  </span>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className="font-bold text-[11px] sm:text-xs text-rose-400 block">
                    {formatCurrency(b.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 7. Full Chronological Monthly Realized P&L Ledger Matrix Table */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Chronological Monthly Realized P&amp;L Matrix</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Month-by-month realized income, expense, net cashflow surplus/deficit, and savings rate
            </p>
          </div>

          {/* Table Sorting Control */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-bold">Sort By:</span>
            <select
              value={monthlySortKey}
              onChange={(e) => setMonthlySortKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-rose-500"
            >
              <option value="date_desc">Latest Month</option>
              <option value="date_asc">Oldest Month</option>
              <option value="pnl_desc">Highest Surplus (Profit)</option>
              <option value="pnl_asc">Highest Deficit (Loss)</option>
              <option value="income_desc">Highest Income</option>
              <option value="expense_desc">Highest Expense</option>
              <option value="savings_desc">Highest Savings Rate %</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Month / Period</th>
                <th className="py-2.5 px-3 text-right">Realized Income</th>
                <th className="py-2.5 px-3 text-right">Realized Expense</th>
                <th className="py-2.5 px-3 text-right">Monthly Realized Net P&amp;L</th>
                <th className="py-2.5 px-3 text-center">Savings Rate</th>
                <th className="py-2.5 px-3 text-right">Daily Burn</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {monthlyPnlList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 text-xs">
                    No records match active filters.
                  </td>
                </tr>
              ) : (
                monthlyPnlList.map((m) => (
                  <Fragment key={m.monthKey}>
                    <tr className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-sans font-bold text-white whitespace-nowrap">
                        {m.monthLabel}
                        <span className="text-[10px] text-slate-500 font-mono block font-normal">
                          {m.txCount} transactions
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                        {formatCurrency(m.income)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-400 font-bold whitespace-nowrap">
                        {formatCurrency(m.expense)}
                      </td>
                      <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                        <span className={m.isSurplus ? 'text-emerald-400' : 'text-rose-400'}>
                          {m.isSurplus ? '+' : '-'}{formatCurrency(Math.abs(m.netPnl))}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-md font-bold text-[11px]',
                          m.savingsRate >= 40
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : m.savingsRate >= 10
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        )}>
                          {m.savingsRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 whitespace-nowrap">
                        {formatCurrency(m.dailyBurn)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-sans">
                        {m.isSurplus ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Surplus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            Deficit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedMonthKey(expandedMonthKey === m.monthKey ? null : m.monthKey)}
                          className={clsx(
                            'px-2 py-1 rounded text-[11px] font-sans font-bold transition flex items-center gap-1 mx-auto',
                            expandedMonthKey === m.monthKey
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          )}
                        >
                          <span>{expandedMonthKey === m.monthKey ? 'Hide' : 'View'}</span>
                          {expandedMonthKey === m.monthKey ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Month Ledger Drawer */}
                    {expandedMonthKey === m.monthKey && (
                      <tr>
                        <td colSpan="8" className="bg-slate-950/90 p-3 border-y border-slate-800">
                          <div className="space-y-2 animate-fadeIn font-sans">
                            <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                              <span>All Transactions in {m.monthLabel}:</span>
                              <span className="text-slate-400 text-[10px] font-mono">{m.transactions.length} items</span>
                            </div>
                            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                              {m.transactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={clsx(
                                      'p-1 rounded-md shrink-0',
                                      tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    )}>
                                      {tx.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-200 truncate">{tx.title}</div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap font-mono">
                                        <span>{formatDate(tx.transactionDate)}</span>
                                        <span>•</span>
                                        <span className="text-slate-300 font-medium font-sans">{tx.category}</span>
                                        <span>•</span>
                                        <span>{tx.paymentMode}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={clsx(
                                    'font-mono font-bold shrink-0 ml-2',
                                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                                  )}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Top Highlights: Highest Credits & Biggest Outflows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Top Incomes */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-xl space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold border-b border-slate-800 pb-2">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span>Top Performing Inflows (Highest Credits)</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {topGainers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No income credits recorded yet.</p>
            ) : (
              topGainers.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-2 sm:p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white font-mono text-[11px] sm:text-xs block truncate">
                      #{idx + 1} {t.title}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">
                      {t.category} • {formatDate(t.transactionDate)} • {t.paymentMode}
                    </span>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span className="text-emerald-400 font-bold block text-[11px] sm:text-xs">
                      +{formatCurrency(t.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Expenses */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-xl space-y-2">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold border-b border-slate-800 pb-2">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            <span>Highest Expense Outflows (Peak Debits)</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {topLosers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No expense debits recorded.</p>
            ) : (
              topLosers.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-2 sm:p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white font-mono text-[11px] sm:text-xs block truncate">
                      #{idx + 1} {t.title}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">
                      {t.category} • {formatDate(t.transactionDate)} • {t.paymentMode}
                    </span>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span className="text-rose-400 font-bold block text-[11px] sm:text-xs">
                      -{formatCurrency(t.amount)}
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
