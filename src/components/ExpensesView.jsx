import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

import {
  CreditCard,
  Plus,
  TrendingDown,
  TrendingUp,
  Calendar,
  Sparkles,
  CheckCircle2,
  DollarSign,
  PieChart,
  Wallet,
  ShoppingBag,
  Home,
  Zap,
  Coffee,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  ArrowRightLeft,
  Building,
  Briefcase,
  Gift,
  HelpCircle,
  Tag,
  AlertCircle,
  X,
  Download,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

import cacheManager from '../utils/cacheManager';
import ExpenseAnalysis from './ExpenseAnalysis';
import { exportExpensesToExcel } from '../utils/excelExporter';
import { ExpenseItemCard } from './expenses/ExpenseItemCard';

const API_BASE = '/api/expenses';

const PRESET_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Rent & Housing',
  'Groceries & Supplies',
  'Utilities & Bills',
  'Travel & Fuel',
  'Shopping & Gadgets',
  'Healthcare & Medical',
  'Entertainment & Leisure',
  'Investment & SIP',
  'EMI & Loans',
  'Personal Care',
  'Subscriptions & Software',
  'Custom / Other...'
];

const PRESET_INCOME_CATEGORIES = [
  'Salary / Payroll',
  'Freelance & Projects',
  'Business Revenue',
  'IPO Listing Gain',
  'Stock Dividends',
  'Rental Income',
  'Interest & Returns',
  'Bonus & Incentives',
  'Cashback & Rewards',
  'Gift & Transfer',
  'Custom / Other...'
];

const PAYMENT_MODES = [
  'UPI / GPay / PhonePe',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cash',
  'Demat / Broker Ledger',
  'Digital Wallet'
];

export default function ExpensesView() {
  const [transactions, setTransactions] = useState(() => {
    const cached = cacheManager.get('cashflow_transactions');
    if (Array.isArray(cached)) return cached;
    try {
      const stored = JSON.parse(localStorage.getItem('antaryudh_cashflow_data') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // View Mode: 'journal' (default spreadsheet/ledger) | 'analysis' (deep monthly Realized P&L and analytics)
  const [viewMode, setViewMode] = useState('journal');

  // Month navigation: format 'YYYY-MM' (e.g. '2026-08') or 'all'
  const getCurrentMonthStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonthState] = useState(() => {
    try {
      const saved = localStorage.getItem('antaryudh_expense_selected_month');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return getCurrentMonthStr();
  });

  const setSelectedMonth = (monthVal) => {
    setSelectedMonthState(monthVal);
    try {
      localStorage.setItem('antaryudh_expense_selected_month', monthVal);
    } catch {
      // Ignore
    }
  };

  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [searchQuery, setSearchQuery] = useState('');

  // 3-Month Section Mobile Collapsible State (Closed by default on mobile to save screen space)
  const [isThreeMonthExpanded, setIsThreeMonthExpanded] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Form State
  const [formType, setFormType] = useState('expense'); // 'expense' | 'income'
  const [formTitle, setFormTitle] = useState('');
  const [formCategorySelect, setFormCategorySelect] = useState('Food & Dining');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('UPI / GPay / PhonePe');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formNotes, setFormNotes] = useState('');

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch Transactions from API (with SWR caching)
  const fetchTransactions = async () => {
    if (transactions.length === 0) {
      setLoading(true);
    }
    setErrorMsg(null);
    try {
      const res = await axios.get(API_BASE);
      if (Array.isArray(res.data)) {
        setTransactions(res.data);
        cacheManager.set('cashflow_transactions', res.data, 120000);
        localStorage.setItem('antaryudh_cashflow_data', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Could not fetch from backend, loading cache:', err);
      const cached = cacheManager.get('cashflow_transactions', () => {
        try {
          return JSON.parse(localStorage.getItem('antaryudh_cashflow_data') || '[]');
        } catch {
          return [];
        }
      });
      setTransactions(cached || []);
      setErrorMsg('Operating in local offline cache mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Lock background body scroll and listen for ESC key for any open modal
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || deleteTarget;
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setDeleteTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, deleteTarget]);

  // Format Currency (INR)
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Format Date and Time for Display (e.g. "31 Aug 2026, 09:15 AM")
  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: 'N/A', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: String(dateStr), time: '' };

      const formattedDate = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const formattedTime = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return { date: formattedDate, time: formattedTime };
    } catch {
      return { date: String(dateStr), time: '' };
    }
  };

  // Handle Month Stepping (< Previous Month, Next Month >)
  const handleStepMonth = (direction) => {
    if (selectedMonth === 'all') {
      setSelectedMonth(getCurrentMonthStr());
      return;
    }
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);

    if (direction === 'prev') {
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
    } else {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Helper to extract robust YYYY-MM key from any date representation
  const getTxMonthKey = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }
    } catch {}
    const match = String(dateVal).match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
    }
    return '';
  };

  // Available Months list from transaction history + current month
  const availableMonths = useMemo(() => {
    const set = new Set();
    set.add(getCurrentMonthStr());
    (Array.isArray(transactions) ? transactions : []).forEach((t) => {
      const mStr = getTxMonthKey(t.transactionDate);
      if (mStr) set.add(mStr);
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Format month string into readable title ("August 2026")
  const formatMonthTitle = (mStr) => {
    if (mStr === 'all') return 'All Time Records';
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  // Filtered Transactions based on Selected Month & Search Query
  const filteredTransactions = useMemo(() => {
    return (Array.isArray(transactions) ? transactions : []).filter((t) => {
      // Month Filter
      if (selectedMonth !== 'all') {
        const mStr = getTxMonthKey(t.transactionDate);
        if (mStr !== selectedMonth) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchCategory = (t.category || '').toLowerCase().includes(q);
        const matchPayment = (t.paymentMode || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchPayment && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedMonth, searchQuery]);

  // Separate Expenses and Incomes
  const expenseList = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'expense');
  }, [filteredTransactions]);

  const incomeList = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'income');
  }, [filteredTransactions]);

  // Monthly Overview Totals & Savings Rate
  const monthlyStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : null;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate
    };
  }, [filteredTransactions]);

  // Last 3 Months Calculation (Current Month M0, Previous Month M-1, 2 Months Ago M-2)
  const last3MonthsHistory = useMemo(() => {
    const list = [];
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth(); // 0-indexed

    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(baseYear, baseMonth - i, 1);
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const label = targetDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const fullLabel = targetDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const tag = i === 0 ? 'Current Month' : i === 1 ? 'Last Month' : '2 Months Ago';

      let totalExpense = 0;
      let totalIncome = 0;
      let count = 0;

      (Array.isArray(transactions) ? transactions : []).forEach((t) => {
        const txMonth = getTxMonthKey(t.transactionDate);
        if (txMonth === key) {
          const amt = parseFloat(t.amount) || 0;
          if (t.type === 'income') {
            totalIncome += amt;
          } else {
            totalExpense += amt;
            count += 1;
          }
        }
      });

      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : null;

      list.push({
        key,
        label,
        fullLabel,
        tag,
        index: i,
        totalExpense,
        totalIncome,
        netSavings,
        savingsRate,
        count
      });
    }

    const total3MExpense = list.reduce((acc, item) => acc + item.totalExpense, 0);
    const total3MIncome = list.reduce((acc, item) => acc + item.totalIncome, 0);
    const total3MNet = total3MIncome - total3MExpense;
    const avg3MExpense = total3MExpense / 3;

    return {
      months: list,
      total3MExpense,
      total3MIncome,
      total3MNet,
      avg3MExpense
    };
  }, [transactions]);

  // Open Modal for New Entry
  const handleOpenAddModal = (defaultType = 'expense') => {
    setEditingTransaction(null);
    setFormType(defaultType);
    setFormTitle('');
    setFormCategorySelect(
      defaultType === 'income' ? PRESET_INCOME_CATEGORIES[0] : PRESET_EXPENSE_CATEGORIES[0]
    );
    setFormCustomCategory('');
    setFormAmount('');
    setFormPaymentMode(PAYMENT_MODES[0]);

    const now = new Date();
    setFormDate(now.toISOString().split('T')[0]);
    setFormTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (t) => {
    setEditingTransaction(t);
    setFormType(t.type || 'expense');
    setFormTitle(t.title || '');

    const presetList =
      t.type === 'income' ? PRESET_INCOME_CATEGORIES : PRESET_EXPENSE_CATEGORIES;
    if (presetList.includes(t.category)) {
      setFormCategorySelect(t.category);
      setFormCustomCategory('');
    } else {
      setFormCategorySelect('Custom / Other...');
      setFormCustomCategory(t.category || '');
    }

    setFormAmount(t.amount !== undefined ? t.amount.toString() : '');
    setFormPaymentMode(t.paymentMode || PAYMENT_MODES[0]);

    if (t.transactionDate) {
      const d = new Date(t.transactionDate);
      if (!isNaN(d.getTime())) {
        setFormDate(d.toISOString().split('T')[0]);
        setFormTime(
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        );
      }
    }
    setFormNotes(t.notes || '');
    setIsModalOpen(true);
  };

  // Save Transaction (Create or Update)
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || isSubmittingExpense) return;
    const cleanAmount = parseFloat(formAmount) || 0;

    let finalCategory = formCategorySelect;
    if (formCategorySelect === 'Custom / Other...') {
      finalCategory = formCustomCategory.trim() || (formType === 'income' ? 'General Income' : 'General Expense');
    }

    // Combine date and time
    let combinedDateTime = new Date();
    if (formDate && formTime) {
      combinedDateTime = new Date(`${formDate}T${formTime}:00`);
    } else if (formDate) {
      combinedDateTime = new Date(`${formDate}T00:00:00`);
    }

    const payload = {
      type: formType,
      title: formTitle.trim(),
      category: finalCategory,
      amount: cleanAmount,
      paymentMode: formPaymentMode,
      transactionDate: combinedDateTime.toISOString(),
      notes: formNotes.trim()
    };

    setIsSubmittingExpense(true);
    try {
      if (editingTransaction) {
        // PUT update
        const res = await axios.put(`${API_BASE}/${editingTransaction.id}`, payload);
        const updatedItem = res.data || { ...editingTransaction, ...payload };
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingTransaction.id ? updatedItem : t))
        );
      } else {
        // POST create
        const res = await axios.post(API_BASE, payload);
        const newItem = res.data || { id: Date.now(), ...payload };
        setTransactions((prev) => [newItem, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving transaction to backend:', err);
      // Local fallback
      if (editingTransaction) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingTransaction.id ? { ...editingTransaction, ...payload } : t
          )
        );
      } else {
        const localNew = { id: Date.now(), ...payload };
        setTransactions((prev) => [localNew, ...prev]);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Delete Transaction
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/${deleteTarget.id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } finally {
      setDeleteTarget(null);
    }
  };

  // If in Deep Analysis View Mode, render ExpenseAnalysis
  if (viewMode === 'analysis') {
    return <ExpenseAnalysis transactions={transactions} onBack={() => setViewMode('journal')} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-sans selection:bg-rose-500 selection:text-white max-w-full overflow-hidden">
      
      {/* 1. Header Banner & Month Navigator */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          
          {/* Top Row: Title + Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 rounded-xl shadow-lg shadow-rose-600/20 text-white shrink-0">
                <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                    Cashflow Ledger
                  </h2>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold font-mono">
                    Live Sync
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                  Personal income & expense manager with timestamped logs
                </p>
              </div>
            </div>

            {/* Top Action Buttons (Responsive 2x2 on Mobile, Flex on Desktop) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => exportExpensesToExcel(filteredTransactions, selectedMonth)}
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] sm:text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm truncate"
                title="Export Filtered Expenses & Cashflow to Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Export Excel</span>
              </button>

              <button
                onClick={() => setViewMode('analysis')}
                className="py-2 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-rose-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate"
                title="Open Comprehensive Cashflow & Monthly Realized P&L Analytics"
              >
                <PieChart className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Analyze &gt;</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('expense')}
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-rose-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Expense</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('income')}
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-emerald-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate"
              >
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Income</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Month Selector & Realtime Period Summary */}
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
            
            {/* Period Navigator Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shadow-inner">
                <button
                  onClick={() => handleStepMonth('prev')}
                  disabled={selectedMonth === 'all'}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-bold text-slate-200 px-2 font-mono text-[11px] sm:text-xs select-none">
                  {formatMonthTitle(selectedMonth)}
                </span>

                <button
                  onClick={() => handleStepMonth('next')}
                  disabled={selectedMonth === 'all'}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Month Dropdown Picker */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-[11px] sm:text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="all">All Months</option>
                {availableMonths.map((mStr) => (
                  <option key={mStr} value={mStr} className="bg-slate-900">
                    {formatMonthTitle(mStr)}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchTransactions}
                title="Refresh Ledger"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition active:rotate-180 ml-auto sm:ml-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Quick Mini Badges (Responsive 3-col on Mobile) */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-center sm:text-left">
              <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30 truncate">
                Out: {formatCurrency(monthlyStats.totalExpense)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 truncate">
                In: {formatCurrency(monthlyStats.totalIncome)}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-bold border truncate ${
                monthlyStats.netSavings >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                Net: {monthlyStats.netSavings >= 0 ? '+' : ''}{formatCurrency(monthlyStats.netSavings)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LAST 3 MONTHS EXPENSE & CASHFLOW HISTORY LOGS (Collapsible to save mobile space) */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div
            onClick={() => setIsThreeMonthExpanded((prev) => !prev)}
            className="flex items-center gap-2 cursor-pointer select-none group/title min-w-0 flex-1"
          >
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover/title:text-indigo-300 transition">
                  3-Month Cashflow Log
                </h3>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                  Past 3 Months
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                Comparison of outflows, inflows, and net balances
              </p>
            </div>
          </div>

          {/* Show / Hide Button (Matching IPO style with down arrow border) */}
          <button
            type="button"
            onClick={() => setIsThreeMonthExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition active:scale-95 touch-manipulation group/btn shrink-0"
          >
            <span className="text-[11px] sm:text-xs">{isThreeMonthExpanded ? 'Hide' : 'Show 3-Month'}</span>
            <div className="p-1 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-400 group-hover/btn:bg-indigo-900/60 group-hover/btn:border-indigo-400/60 transition flex items-center justify-center shadow-sm">
              <ChevronDown
                className={clsx(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  isThreeMonthExpanded && 'rotate-180 text-indigo-300'
                )}
              />
            </div>
          </button>
        </div>

        {/* 3 Interactive Month History Cards (Visible when expanded) */}
        {isThreeMonthExpanded && (
          <div className="space-y-3 animate-fadeIn">
            <div className="grid grid-cols-3 gap-1.5 text-[10px] sm:text-xs font-mono text-slate-300 text-center sm:text-left">
              <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800/80 truncate">
                Spent: <strong className="text-rose-400">{formatCurrency(last3MonthsHistory.total3MExpense)}</strong>
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800/80 truncate">
                Income: <strong className="text-emerald-400">+{formatCurrency(last3MonthsHistory.total3MIncome)}</strong>
              </span>
              <span className={clsx(
                'px-2 py-1 rounded-lg font-bold border truncate',
                last3MonthsHistory.total3MNet >= 0
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
              )}>
                Net: {last3MonthsHistory.total3MNet >= 0 ? '+' : ''}{formatCurrency(last3MonthsHistory.total3MNet)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
              {last3MonthsHistory.months.map((mItem) => {
                const isCurrentFilter = selectedMonth === mItem.key;
                return (
                  <div
                    key={mItem.key}
                    onClick={() => setSelectedMonth(mItem.key)}
                    className={clsx(
                      'p-3 sm:p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 relative overflow-hidden group',
                      isCurrentFilter
                        ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/30 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    )}
                  >
                    {/* Top Badge and Month Name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white font-mono">
                          {mItem.label}
                        </span>
                        <span className={clsx(
                          'text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border',
                          mItem.index === 0
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        )}>
                          {mItem.tag}
                        </span>
                      </div>

                      {isCurrentFilter && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    {/* 2-Column Inflow vs Outflow Metric */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[10px] text-rose-300/80 uppercase font-semibold tracking-wide block">
                          Total Spent
                        </span>
                        <div className="text-xs sm:text-sm md:text-base font-black font-mono tracking-tight text-rose-400 truncate mt-0.5">
                          -{formatCurrency(mItem.totalExpense)}
                        </div>
                      </div>

                      <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[10px] text-emerald-300/80 uppercase font-semibold tracking-wide block">
                          Total Income
                        </span>
                        <div className="text-xs sm:text-sm md:text-base font-black font-mono tracking-tight text-emerald-400 truncate mt-0.5">
                          +{formatCurrency(mItem.totalIncome)}
                        </div>
                      </div>
                    </div>

                    {/* Prominent, Highly Readable Net Savings Banner */}
                    <div className={clsx(
                      'px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs font-mono font-bold',
                      mItem.netSavings >= 0
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    )}>
                      <span className="text-[10px] sm:text-[11px] font-medium opacity-90">
                        {mItem.netSavings >= 0 ? 'Net Surplus / Saved:' : 'Net Deficit:'}
                      </span>
                      <span className="text-xs sm:text-sm font-black tracking-tight">
                        {mItem.netSavings >= 0 ? '+' : ''}{formatCurrency(mItem.netSavings)}
                        {mItem.savingsRate !== null && mItem.totalIncome > 0 && (
                          <span className="text-[9px] sm:text-[10px] font-normal ml-1 opacity-80">({mItem.savingsRate}%)</span>
                        )}
                      </span>
                    </div>

                    {/* Bottom CTA info */}
                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono">{mItem.count} items</span>
                      <span className={clsx('font-semibold group-hover:underline', isCurrentFilter ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300')}>
                        {isCurrentFilter ? 'Selected Month ✓' : 'Click to View →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Responsive Summary KPI Cards (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Total Expenses */}
        <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-rose-300">
              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
              <span>Expense</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-rose-400">
              {expenseList.length} items
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-rose-400 truncate">
            {formatCurrency(monthlyStats.totalExpense)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Outflow this period
          </p>
        </div>

        {/* Card 2: Total Incomes */}
        <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Income</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              {incomeList.length} items
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-emerald-400 truncate">
            {formatCurrency(monthlyStats.totalIncome)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Earnings this period
          </p>
        </div>

        {/* Card 3: Net Cashflow Balance */}
        <div className="bg-slate-900/90 border border-indigo-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-indigo-300">
              <Wallet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Net Balance</span>
            </span>
            <span className={`text-[9px] font-mono font-bold ${
              monthlyStats.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {monthlyStats.netSavings >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight truncate ${
            monthlyStats.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {monthlyStats.netSavings >= 0 ? '+' : ''}{formatCurrency(monthlyStats.netSavings)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            {monthlyStats.netSavings >= 0 ? 'Retained savings' : 'Overspent'}
          </p>
        </div>

        {/* Card 4: Savings Rate Margin */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-slate-200">
              <PieChart className="w-3.5 h-3.5 text-violet-400" />
              <span>Savings Rate</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-violet-400">
              {monthlyStats.savingsRate !== null ? `${monthlyStats.savingsRate}%` : '0%'}
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-violet-300 truncate">
            {monthlyStats.savingsRate !== null ? `${monthlyStats.savingsRate}%` : '0.0%'}
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                monthlyStats.savingsRate && parseFloat(monthlyStats.savingsRate) >= 30
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-rose-500'
              }`}
              style={{
                width: `${Math.max(0, Math.min(parseFloat(monthlyStats.savingsRate) || 0, 100))}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Search & Mobile Segmented View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
        
        {/* Search Box */}
        <div className="flex items-center gap-2 flex-1 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 focus-within:border-indigo-500 transition shadow-inner min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, category, mode..."
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile App Style Segmented Switcher (Full Width Grid on Mobile) */}
        <div className="grid grid-cols-3 sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTabFilter('all')}
            className={`py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition text-center truncate ${
              activeTabFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Split View ({filteredTransactions.length})
          </button>
          <button
            onClick={() => setActiveTabFilter('expense')}
            className={`py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 truncate ${
              activeTabFilter === 'expense'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3 shrink-0" />
            <span className="truncate">Out ({expenseList.length})</span>
          </button>
          <button
            onClick={() => setActiveTabFilter('income')}
            className={`py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 truncate ${
              activeTabFilter === 'income'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            <ArrowUpRight className="w-3 h-3 shrink-0" />
            <span className="truncate">In ({incomeList.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Split-Screen Dual Column Payment Ledger */}
      <div className={`grid grid-cols-1 ${activeTabFilter === 'all' ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
        
        {/* ================= LEFT COLUMN: EXPENSES ================= */}
        {(activeTabFilter === 'all' || activeTabFilter === 'expense') && (
          <div className="bg-slate-900/90 border border-rose-500/20 rounded-2xl shadow-xl overflow-hidden flex flex-col min-w-0">
            
            {/* Expense Column Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-950 via-rose-950/40 to-slate-950 border-b border-rose-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                      Expenses (Outflow)
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                      {expenseList.length}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    Where your money went
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm sm:text-base font-black font-mono text-rose-400">
                  -{formatCurrency(monthlyStats.totalExpense)}
                </div>
                <button
                  onClick={() => handleOpenAddModal('expense')}
                  className="text-[10px] sm:text-[11px] text-rose-400 hover:text-rose-300 font-bold underline flex items-center gap-0.5 ml-auto"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>

            {/* Expense Transaction List */}
            <div className="p-2.5 sm:p-4 divide-y divide-slate-800/60 flex-1 overflow-y-auto max-h-[640px] scrollbar-thin scrollbar-thumb-slate-700">
              {loading && transactions.length === 0 ? (
                <div className="space-y-2.5 py-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-28 rounded animate-shimmer" />
                        <div className="h-4 w-16 rounded animate-shimmer" />
                      </div>
                      <div className="h-3 w-40 rounded animate-shimmer opacity-60" />
                    </div>
                  ))}
                </div>
              ) : expenseList.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <ShoppingBag className="w-7 h-7 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs font-medium">No expenses logged for this period.</p>
                  <button
                    onClick={() => handleOpenAddModal('expense')}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
                  >
                    + Log your first expense
                  </button>
                </div>
              ) : (
                expenseList.map((item) => (
                  <ExpenseItemCard
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    formatDateTime={formatDateTime}
                    onEdit={handleOpenEditModal}
                    onDelete={setDeleteTarget}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= RIGHT COLUMN: INCOMES ================= */}
        {(activeTabFilter === 'all' || activeTabFilter === 'income') && (
          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-2xl shadow-xl overflow-hidden flex flex-col min-w-0">
            
            {/* Income Column Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-950 via-emerald-950/40 to-slate-950 border-b border-emerald-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                      Income (Inflows)
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      {incomeList.length}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    Where your money came from
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm sm:text-base font-black font-mono text-emerald-400">
                  +{formatCurrency(monthlyStats.totalIncome)}
                </div>
                <button
                  onClick={() => handleOpenAddModal('income')}
                  className="text-[10px] sm:text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-0.5 ml-auto"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Income</span>
                </button>
              </div>
            </div>

            {/* Income Transaction List */}
            <div className="p-2.5 sm:p-4 divide-y divide-slate-800/60 flex-1 overflow-y-auto max-h-[640px] scrollbar-thin scrollbar-thumb-slate-700">
              {loading && transactions.length === 0 ? (
                <div className="space-y-2.5 py-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-28 rounded animate-shimmer" />
                        <div className="h-4 w-16 rounded animate-shimmer" />
                      </div>
                      <div className="h-3 w-40 rounded animate-shimmer opacity-60" />
                    </div>
                  ))}
                </div>
              ) : incomeList.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <Wallet className="w-7 h-7 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs font-medium">No income logged for this period.</p>
                  <button
                    onClick={() => handleOpenAddModal('income')}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    + Log your first income source
                  </button>
                </div>
              ) : (
                incomeList.map((item) => (
                  <ExpenseItemCard
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    formatDateTime={formatDateTime}
                    onEdit={handleOpenEditModal}
                    onDelete={setDeleteTarget}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= ADD / EDIT MODAL (Rendered in Body Portal for True Viewport Centering) ================= */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col relative z-[100000] my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 sm:p-2 rounded-xl text-white ${
                  formType === 'income' ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
                } shadow-md shrink-0`}>
                  {formType === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-base font-bold text-white truncate">
                    {editingTransaction ? 'Edit Cashflow Entry' : formType === 'income' ? 'Log Income Source' : 'Log Expense Spend'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    Timestamped entry with automatic ledger syncing
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveTransaction} className="space-y-3 flex-1 overflow-y-auto pr-1">
              
              {/* Type Selector Tab (Expense vs Income) */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('expense');
                    setFormCategorySelect(PRESET_EXPENSE_CATEGORIES[0]);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    formType === 'expense'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Expense (Out)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormType('income');
                    setFormCategorySelect(PRESET_INCOME_CATEGORIES[0]);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    formType === 'income'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Income (In)</span>
                </button>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Description / Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'income' ? 'e.g. TCS Salary, Freelance Client, IPO Gain' : 'e.g. Swiggy, House Rent, Electric Bill, Amazon'}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              {/* Amount (INR) with Quick Preset Chips */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Amount (₹ INR) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Preset Chips (Mobile Friendly Grid/Wrap) */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {[100, 500, 1000, 5000, 10000, 25000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(formAmount) || 0;
                        setFormAmount((cur + val).toString());
                      }}
                      className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Dropdown + Custom Category Option */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Category Preset
                  </label>
                  <select
                    value={formCategorySelect}
                    onChange={(e) => setFormCategorySelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    {(formType === 'income' ? PRESET_INCOME_CATEGORIES : PRESET_EXPENSE_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    {formCategorySelect === 'Custom / Other...' ? 'Type Custom Category *' : 'Custom Category (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pet Care, Gym, SIP"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className={`w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border rounded-xl text-xs text-white focus:outline-none transition ${
                      formCategorySelect === 'Custom / Other...'
                        ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                        : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Date AND Time Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>Time</span>
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Payment Mode / Account */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Payment Mode / Destination
                </label>
                <select
                  value={formPaymentMode}
                  onChange={(e) => setFormPaymentMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  {PAYMENT_MODES.map((pm) => (
                    <option key={pm} value={pm} className="bg-slate-900">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional context or notes..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingExpense}
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-lg active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    formType === 'income'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
                  }`}
                >
                  {isSubmittingExpense && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSubmittingExpense
                      ? 'Saving...'
                      : editingTransaction
                      ? 'Save Changes'
                      : formType === 'income'
                      ? 'Record Income (+)'
                      : 'Record Expense (-)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= DELETE CONFIRM MODAL (Rendered in Body Portal) ================= */}
      {deleteTarget && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-xs w-full p-4 sm:p-5 shadow-2xl space-y-3 my-auto relative z-[100000]"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white">Delete Entry?</h4>
                <p className="text-[11px] text-slate-400 truncate">
                  "{deleteTarget.title}" ({formatCurrency(deleteTarget.amount)})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shadow-md shadow-rose-600/30 transition active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

