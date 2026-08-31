import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import clsx from 'clsx';

import {
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Activity,
  BarChart2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Target,
  Zap,
  Tag,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LogOut,
  Receipt,
  Coins,
  DollarSign
} from 'lucide-react';

const API_BASE = '/api/trades';
const PAGE_SIZE = 10;

const DECISION_PRESETS = [
  'Eagle Eye',
  'Telegram',
  'Self',
  'Price Action Breakout',
  'Chart Pattern',
  'Volume Spike',
  'Algo / Quant Alert',
  'News / Earnings Catalyst',
  'Custom / Other...'
];

export default function TradingView() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'stock' | 'intraday'

  // Pagination State (Max 10 entries per page)
  const [stockPage, setStockPage] = useState(1);
  const [intradayPage, setIntradayPage] = useState(1);

  // Mobile Collapsible / Expandable Sections State
  const [isStockExpanded, setIsStockExpanded] = useState(true);
  const [isIntradayExpanded, setIsIntradayExpanded] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  // Exit Trade (Quick Square-off) Modal State
  const [exitModalTarget, setExitModalTarget] = useState(null);
  const [exitSellDate, setExitSellDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [exitSellPrice, setExitSellPrice] = useState('');

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form Fields State
  const [formTradeType, setFormTradeType] = useState('stock'); // 'stock' | 'intraday'
  const [formAssetName, setFormAssetName] = useState('');
  const [formBuyDate, setFormBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formCharges, setFormCharges] = useState('20');
  const [formTradeDecision, setFormTradeDecision] = useState('Self');
  const [formCustomDecision, setFormCustomDecision] = useState('');
  const [formIsExited, setFormIsExited] = useState(false);
  const [formSellDate, setFormSellDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSellPrice, setFormSellPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setExitModalTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Trades from Backend API
  const fetchTrades = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = {};
      if (selectedMonth !== 'all') params.month = selectedMonth;
      if (selectedQuarter !== 'all') params.quarter = selectedQuarter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get(API_BASE, { params });
      if (Array.isArray(res.data)) {
        setTrades(res.data);
        localStorage.setItem('antaryudh_trading_data', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Backend /api/trades unreachable, loading offline cache:', err);
      try {
        const cached = JSON.parse(localStorage.getItem('antaryudh_trading_data') || '[]');
        setTrades(cached);
      } catch {
        setTrades([]);
      }
      setErrorMsg('Operating in offline local mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    // Reset pagination to page 1 on filter changes
    setStockPage(1);
    setIntradayPage(1);
  }, [selectedMonth, selectedQuarter, searchQuery]);

  // Format Currency in INR (₹)
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
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

  // Helper calculations for a single trade row
  const calculateTradeMetrics = (trade) => {
    const buyPrice = parseFloat(trade.buyPrice) || 0;
    const qty = parseInt(trade.quantity, 10) || 0;
    const charges = parseFloat(trade.charges) || 0;
    const invested = buyPrice * qty;

    const isClosed =
      trade.sellPrice !== null &&
      trade.sellPrice !== undefined &&
      trade.sellPrice !== '' &&
      !isNaN(parseFloat(trade.sellPrice));

    const sellPrice = isClosed ? parseFloat(trade.sellPrice) : null;
    const sellValue = isClosed ? sellPrice * qty : null;

    let returnsInr = null;
    let returnsPercent = null;

    if (isClosed) {
      returnsInr = sellValue - invested - charges;
      returnsPercent = invested > 0 ? (returnsInr / invested) * 100 : 0;
    }

    return {
      invested,
      isClosed,
      sellPrice,
      sellValue,
      returnsInr,
      returnsPercent,
      charges
    };
  };

  const stockTrades = useMemo(() => {
    return trades.filter((t) => t.tradeType === 'stock');
  }, [trades]);

  const intradayTrades = useMemo(() => {
    return trades.filter((t) => t.tradeType === 'intraday');
  }, [trades]);

  // Master Dashboard Calculations (Including Total Charges Paid)
  const masterStats = useMemo(() => {
    let stockTotalPl = 0;
    let stockInvested = 0;
    let stockClosedCount = 0;
    let stockWinCount = 0;
    let stockCharges = 0;

    let intradayTotalPl = 0;
    let intradayInvested = 0;
    let intradayClosedCount = 0;
    let intradayWinCount = 0;
    let intradayCharges = 0;

    trades.forEach((t) => {
      const { invested, isClosed, returnsInr, charges } = calculateTradeMetrics(t);
      if (t.tradeType === 'stock') {
        stockInvested += invested;
        stockCharges += charges;
        if (isClosed && returnsInr !== null) {
          stockTotalPl += returnsInr;
          stockClosedCount += 1;
          if (returnsInr > 0) stockWinCount += 1;
        }
      } else {
        intradayInvested += invested;
        intradayCharges += charges;
        if (isClosed && returnsInr !== null) {
          intradayTotalPl += returnsInr;
          intradayClosedCount += 1;
          if (returnsInr > 0) intradayWinCount += 1;
        }
      }
    });

    const netOverallPl = stockTotalPl + intradayTotalPl;
    const totalChargesPaid = stockCharges + intradayCharges;
    const totalClosed = stockClosedCount + intradayClosedCount;
    const totalWins = stockWinCount + intradayWinCount;
    const overallWinRate =
      totalClosed > 0 ? ((totalWins / totalClosed) * 100).toFixed(1) : null;

    const totalInvested = stockInvested + intradayInvested;

    return {
      stockTotalPl,
      stockInvested,
      stockClosedCount,
      stockCharges,
      intradayTotalPl,
      intradayInvested,
      intradayClosedCount,
      intradayCharges,
      totalChargesPaid,
      netOverallPl,
      totalClosed,
      overallWinRate,
      totalInvested
    };
  }, [trades]);

  // Open Modal to Add Trade
  const handleOpenAddModal = (defaultType = 'stock') => {
    setEditingTrade(null);
    setFormTradeType(defaultType);
    setFormAssetName('');
    setFormBuyDate(new Date().toISOString().split('T')[0]);
    setFormBuyPrice('');
    setFormQuantity('1');
    setFormCharges(defaultType === 'intraday' ? '40' : '20');
    setFormTradeDecision('Self');
    setFormCustomDecision('');
    setFormIsExited(false);
    setFormSellDate(new Date().toISOString().split('T')[0]);
    setFormSellPrice('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Modal to Edit Trade
  const handleOpenEditModal = (t) => {
    setEditingTrade(t);
    setFormTradeType(t.tradeType || 'stock');
    setFormAssetName(t.assetName || '');
    setFormBuyDate(t.buyDate ? t.buyDate.slice(0, 10) : new Date().toISOString().split('T')[0]);
    setFormBuyPrice(t.buyPrice !== undefined ? String(t.buyPrice) : '');
    setFormQuantity(t.quantity !== undefined ? String(t.quantity) : '1');
    setFormCharges(t.charges !== undefined ? String(t.charges) : '0');

    if (DECISION_PRESETS.includes(t.tradeDecision)) {
      setFormTradeDecision(t.tradeDecision);
      setFormCustomDecision('');
    } else {
      setFormTradeDecision('Custom / Other...');
      setFormCustomDecision(t.tradeDecision || '');
    }

    const hasSell = t.sellPrice !== null && t.sellPrice !== undefined && t.sellPrice !== '';
    setFormIsExited(Boolean(hasSell));
    setFormSellDate(t.sellDate ? t.sellDate.slice(0, 10) : new Date().toISOString().split('T')[0]);
    setFormSellPrice(hasSell ? String(t.sellPrice) : '');
    setFormNotes(t.notes || '');
    setIsModalOpen(true);
  };

  // Open Quick Exit / Square Off Modal
  const handleOpenExitModal = (trade) => {
    setExitModalTarget(trade);
    setExitSellDate(new Date().toISOString().split('T')[0]);
    setExitSellPrice('');
  };

  // Submit Quick Exit
  const handleSubmitExitModal = async (e) => {
    e.preventDefault();
    if (!exitModalTarget) return;

    const payload = {
      sellDate: exitSellDate,
      sellPrice: parseFloat(exitSellPrice) || 0
    };

    try {
      const res = await axios.put(`${API_BASE}/${exitModalTarget.id}`, payload);
      const updated = res.data || { ...exitModalTarget, ...payload };
      setTrades((prev) => prev.map((t) => (t.id === exitModalTarget.id ? updated : t)));
    } catch (err) {
      console.warn('Backend exit update failed, applying locally:', err);
      setTrades((prev) =>
        prev.map((t) => (t.id === exitModalTarget.id ? { ...exitModalTarget, ...payload } : t))
      );
    } finally {
      setExitModalTarget(null);
    }
  };

  // Submit Add / Edit Trade
  const handleSaveTrade = async (e) => {
    e.preventDefault();
    if (!formAssetName.trim()) return;

    let finalDecision = formTradeDecision;
    if (formTradeDecision === 'Custom / Other...') {
      finalDecision = formCustomDecision.trim() || 'Self';
    }

    const payload = {
      tradeType: formTradeType,
      assetName: formAssetName.trim().toUpperCase(),
      buyDate: formBuyDate,
      buyPrice: parseFloat(formBuyPrice) || 0,
      quantity: parseInt(formQuantity, 10) || 1,
      charges: parseFloat(formCharges) || 0,
      tradeDecision: finalDecision,
      sellDate: formIsExited ? formSellDate : null,
      sellPrice: formIsExited && formSellPrice ? parseFloat(formSellPrice) : null,
      notes: formNotes.trim()
    };

    try {
      if (editingTrade) {
        const res = await axios.put(`${API_BASE}/${editingTrade.id}`, payload);
        const updated = res.data || { ...editingTrade, ...payload };
        setTrades((prev) => prev.map((t) => (t.id === editingTrade.id ? updated : t)));
      } else {
        const res = await axios.post(API_BASE, payload);
        const created = res.data || { id: Date.now(), ...payload };
        setTrades((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving trade to backend:', err);
      if (editingTrade) {
        setTrades((prev) =>
          prev.map((t) => (t.id === editingTrade.id ? { ...editingTrade, ...payload } : t))
        );
      } else {
        const localCreated = { id: Date.now(), ...payload };
        setTrades((prev) => [localCreated, ...prev]);
      }
      setIsModalOpen(false);
    }
  };

  // Confirm Delete Trade
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/${deleteTarget.id}`);
      setTrades((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err);
      setTrades((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } finally {
      setDeleteTarget(null);
    }
  };

  // Render Notion-style Table Component + Mobile Card View + Pagination + Collapse
  const renderNotionTradeGrid = ({
    tradeList,
    title,
    typeBadgeColor,
    iconComponent,
    isExpanded,
    onToggleExpand,
    currentPage,
    onPageChange
  }) => {
    const Icon = iconComponent;
    const isStockType = title.includes('Stock');

    // Pagination calculations (Max 10 per page)
    const totalItems = tradeList.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const paginatedItems = tradeList.slice(startIndex, startIndex + PAGE_SIZE);

    // Sum P/L for this category
    let categoryPl = 0;
    tradeList.forEach((t) => {
      const { returnsInr } = calculateTradeMetrics(t);
      if (returnsInr !== null) categoryPl += returnsInr;
    });

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-300">
        
        {/* Collapsible Table Header Section */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 select-none">
          
          <div
            onClick={onToggleExpand}
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer group flex-1"
          >
            <div className={clsx('p-1.5 sm:p-2 rounded-xl text-white shadow-md shrink-0 transition-transform group-hover:scale-105', typeBadgeColor)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-base font-bold text-white tracking-tight truncate group-hover:text-cyan-300 transition">
                {title}
              </h3>
              
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold shrink-0">
                {totalItems} trades
              </span>

              {/* Collapsed summary pill */}
              <span className={clsx(
                'text-[9px] sm:text-[10px] font-mono px-2 py-0.2 rounded-full font-bold border shrink-0',
                categoryPl > 0 && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                categoryPl < 0 && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                categoryPl === 0 && 'bg-slate-800 text-slate-400 border-slate-700'
              )}>
                P/L: {categoryPl > 0 ? '+' : ''}{formatCurrency(categoryPl)}
              </span>
            </div>

            {/* Collapse/Expand Chevron Indicator */}
            <div className="p-1 rounded-lg bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition ml-1">
              <ChevronDown className={clsx('w-4 h-4 transition-transform duration-300', isExpanded && 'rotate-180')} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleOpenAddModal(isStockType ? 'stock' : 'intraday')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold border border-slate-700 transition active:scale-95 flex items-center gap-1 shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trade</span>
            </button>
          </div>
        </div>

        {/* Collapsible Content Area */}
        {isExpanded && (
          <div className="animate-fadeIn">
            
            {/* 1. Mobile Cards View (Optimized for screens < 768px) */}
            <div className="block md:hidden divide-y divide-slate-800/80 p-2 space-y-2">
              {loading && trades.length === 0 ? (
                [1, 2].map((n) => (
                  <div key={n} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="h-4 w-32 rounded animate-shimmer" />
                    <div className="h-3 w-48 rounded animate-shimmer opacity-60" />
                  </div>
                ))
              ) : paginatedItems.length === 0 ? (
                <div className="py-8 text-center text-slate-500 font-medium text-xs space-y-1">
                  <FileSpreadsheet className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                  <p>No {title.toLowerCase()} recorded.</p>
                  <button
                    onClick={() => handleOpenAddModal(isStockType ? 'stock' : 'intraday')}
                    className="text-cyan-400 hover:underline font-bold text-xs"
                  >
                    + Log trade
                  </button>
                </div>
              ) : (
                paginatedItems.map((trade) => {
                  const {
                    invested,
                    isClosed,
                    sellPrice,
                    sellValue,
                    returnsInr,
                    returnsPercent,
                    charges
                  } = calculateTradeMetrics(trade);

                  const isProfit = isClosed && returnsInr > 0;
                  const isLoss = isClosed && returnsInr < 0;

                  return (
                    <div
                      key={trade.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5 shadow-sm"
                    >
                      {/* Top Line: Asset + Decision + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-white text-xs sm:text-sm font-mono tracking-tight truncate">
                            {trade.assetName}
                          </span>
                          <span className={clsx(
                            'text-[9px] font-semibold px-1.5 py-0.2 rounded border shrink-0',
                            trade.tradeDecision === 'Eagle Eye' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                            trade.tradeDecision === 'Telegram' && 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                            trade.tradeDecision === 'Self' && 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
                            !['Eagle Eye', 'Telegram', 'Self'].includes(trade.tradeDecision) && 'bg-slate-800 text-slate-300 border-slate-700'
                          )}>
                            {trade.tradeDecision}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isClosed ? (
                            <span className={clsx(
                              'text-[10px] font-bold px-2 py-0.5 rounded font-mono',
                              isProfit && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                              isLoss && 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                              !isProfit && !isLoss && 'bg-slate-800 text-slate-300'
                            )}>
                              {returnsInr > 0 ? '+' : ''}{formatCurrency(returnsInr)} ({returnsPercent > 0 ? '+' : ''}{returnsPercent.toFixed(1)}%)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenExitModal(trade)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 active:scale-95"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Exit Now</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle Line: Buy & Sell Key Metrics (2-column compact grid) */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Entry / Buy:</span>
                          <span className="font-mono font-medium text-slate-200">
                            {trade.quantity} @ {formatCurrency(trade.buyPrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Inv: {formatCurrency(invested)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px]">Exit / Sell:</span>
                          {isClosed ? (
                            <>
                              <span className="font-mono font-medium text-slate-200">
                                {trade.quantity} @ {formatCurrency(sellPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Val: {formatCurrency(sellValue)}
                              </span>
                            </>
                          ) : (
                            <span className="text-cyan-400 font-medium italic text-[11px]">Position Open</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Line: Charges & Dates & Actions */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/20">
                            Fee: {formatCurrency(charges)}
                          </span>
                          <span>Buy: {formatDate(trade.buyDate)}</span>
                          {isClosed && <span>• Sell: {formatDate(trade.sellDate)}</span>}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(trade)}
                            className="p-1 rounded text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                            title="Edit trade"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(trade)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800"
                            title="Delete trade"
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

            {/* 2. Desktop Notion Data Grid (Visible on md+ screens) */}
            <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
              <table className="w-full text-left border-collapse text-xs min-w-[980px]">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <th className="py-3 px-3.5 sticky left-0 z-20 bg-slate-950 min-w-[170px] border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      Asset Name
                    </th>
                    <th className="py-3 px-3 min-w-[100px] border-r border-slate-800/60">Buy Date</th>
                    <th className="py-3 px-3 min-w-[95px] text-right border-r border-slate-800/60">Buy Price</th>
                    <th className="py-3 px-2.5 min-w-[60px] text-center border-r border-slate-800/60">Qty</th>
                    <th className="py-3 px-3 min-w-[110px] text-right border-r border-slate-800/60">Invested</th>
                    <th className="py-3 px-2.5 min-w-[75px] text-right border-r border-slate-800/60">Charges</th>
                    <th className="py-3 px-3 min-w-[120px] border-r border-slate-800/60 text-center">Trade Decision</th>
                    <th className="py-3 px-3 min-w-[100px] border-r border-slate-800/60">Sell Date</th>
                    <th className="py-3 px-3 min-w-[95px] text-right border-r border-slate-800/60">Sell Price</th>
                    <th className="py-3 px-3 min-w-[110px] text-right border-r border-slate-800/60">Sell Value</th>
                    <th className="py-3 px-3.5 min-w-[115px] text-right border-r border-slate-800/60">Returns (₹)</th>
                    <th className="py-3 px-3 min-w-[95px] text-right border-r border-slate-800/60">Returns (%)</th>
                    <th className="py-3 px-2 w-16 text-center sticky right-0 bg-slate-950 z-20 border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {loading && trades.length === 0 ? (
                    [1, 2, 3].map((n) => (
                      <tr key={n}>
                        <td className="py-3.5 px-3.5 sticky left-0 bg-slate-900 border-r border-slate-800">
                          <div className="h-4 w-28 rounded animate-shimmer" />
                        </td>
                        <td colSpan={11} className="py-3.5 px-3">
                          <div className="h-4 w-full rounded animate-shimmer" />
                        </td>
                        <td className="py-3.5 px-2 sticky right-0 bg-slate-900 border-l border-slate-800">
                          <div className="h-4 w-8 mx-auto rounded animate-shimmer" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-10 text-center text-slate-500 font-normal">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <FileSpreadsheet className="w-7 h-7 text-slate-600 mb-1" />
                          <p className="text-xs">No {title.toLowerCase()} recorded in this period.</p>
                          <button
                            onClick={() => handleOpenAddModal(isStockType ? 'stock' : 'intraday')}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline mt-0.5"
                          >
                            + Log new trade entry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((trade) => {
                      const {
                        invested,
                        isClosed,
                        sellPrice,
                        sellValue,
                        returnsInr,
                        returnsPercent,
                        charges
                      } = calculateTradeMetrics(trade);

                      const isProfit = isClosed && returnsInr > 0;
                      const isLoss = isClosed && returnsInr < 0;

                      return (
                        <tr
                          key={trade.id}
                          className="hover:bg-slate-800/40 transition-colors group text-slate-200"
                        >
                          {/* Asset Name */}
                          <td className="py-2.5 px-3.5 font-bold text-white sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-1.5">
                              <span className="tracking-tight text-white">{trade.assetName}</span>
                              {!isClosed && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                                  Open
                                </span>
                              )}
                            </div>
                            {trade.notes && (
                              <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px] mt-0.5" title={trade.notes}>
                                {trade.notes}
                              </div>
                            )}
                          </td>

                          {/* Buy Date */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300 border-r border-slate-800/60">
                            {formatDate(trade.buyDate)}
                          </td>

                          {/* Buy Price */}
                          <td className="py-2.5 px-3 font-mono text-right text-slate-200 border-r border-slate-800/60">
                            {formatCurrency(trade.buyPrice)}
                          </td>

                          {/* Quantity */}
                          <td className="py-2.5 px-2.5 font-mono text-center text-slate-300 border-r border-slate-800/60">
                            {trade.quantity}
                          </td>

                          {/* Invested Value */}
                          <td className="py-2.5 px-3 font-mono text-right font-medium text-slate-200 border-r border-slate-800/60">
                            {formatCurrency(invested)}
                          </td>

                          {/* Charges */}
                          <td className="py-2.5 px-2.5 font-mono text-right text-amber-400/90 border-r border-slate-800/60">
                            {charges > 0 ? formatCurrency(charges) : '₹0'}
                          </td>

                          {/* Trade Decision */}
                          <td className="py-2.5 px-3 border-r border-slate-800/60 text-center">
                            <span className={clsx(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                              trade.tradeDecision === 'Eagle Eye' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                              trade.tradeDecision === 'Telegram' && 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                              trade.tradeDecision === 'Self' && 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
                              !['Eagle Eye', 'Telegram', 'Self'].includes(trade.tradeDecision) && 'bg-slate-800 text-slate-300 border-slate-700'
                            )}>
                              {trade.tradeDecision}
                            </span>
                          </td>

                          {/* Sell Date */}
                          <td className="py-2.5 px-3 font-mono text-[11px] border-r border-slate-800/60">
                            {isClosed ? (
                              formatDate(trade.sellDate)
                            ) : (
                              <button
                                onClick={() => handleOpenExitModal(trade)}
                                className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"
                                title="Click to square off / record exit"
                              >
                                <LogOut className="w-3 h-3" />
                                <span>Exit Now</span>
                              </button>
                            )}
                          </td>

                          {/* Sell Price */}
                          <td className="py-2.5 px-3 font-mono text-right border-r border-slate-800/60">
                            {isClosed ? (
                              formatCurrency(sellPrice)
                            ) : (
                              <span className="text-slate-500 italic">Open</span>
                            )}
                          </td>

                          {/* Sell Value */}
                          <td className="py-2.5 px-3 font-mono text-right border-r border-slate-800/60">
                            {isClosed ? (
                              formatCurrency(sellValue)
                            ) : (
                              <span className="text-slate-500 italic">Open</span>
                            )}
                          </td>

                          {/* Returns (₹) - clsx dynamic styling */}
                          <td className={clsx(
                            'py-2.5 px-3.5 font-mono font-bold text-right border-r border-slate-800/60',
                            isProfit && 'text-emerald-400 bg-emerald-500/5',
                            isLoss && 'text-rose-400 bg-rose-500/5',
                            !isClosed && 'text-slate-400'
                          )}>
                            {isClosed ? (
                              <>
                                {returnsInr > 0 ? '+' : ''}
                                {formatCurrency(returnsInr)}
                              </>
                            ) : (
                              <span className="text-slate-500 font-normal italic">Open Pos</span>
                            )}
                          </td>

                          {/* Returns (%) - clsx dynamic styling */}
                          <td className={clsx(
                            'py-2.5 px-3 font-mono font-bold text-right border-r border-slate-800/60',
                            isProfit && 'text-emerald-400',
                            isLoss && 'text-rose-400',
                            !isClosed && 'text-slate-500 font-normal'
                          )}>
                            {isClosed ? (
                              <span className={clsx(
                                'text-[10px] px-1.5 py-0.5 rounded font-mono',
                                isProfit && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                                isLoss && 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              )}>
                                {returnsPercent > 0 ? '+' : ''}
                                {returnsPercent.toFixed(2)}%
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-center sticky right-0 bg-slate-900 group-hover:bg-slate-850 border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(trade)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Edit trade details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(trade)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                                title="Delete trade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Max 10 Entries per Page) */}
            {totalItems > PAGE_SIZE && (
              <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 text-[11px] font-mono text-center sm:text-left">
                  Showing <span className="text-white font-semibold">{startIndex + 1}</span>–<span className="text-white font-semibold">{Math.min(startIndex + PAGE_SIZE, totalItems)}</span> of <span className="text-white font-semibold">{totalItems}</span> entries (Page {safePage} of {totalPages})
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="p-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition text-[11px] font-semibold flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={clsx(
                          'w-7 h-7 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center',
                          safePage === pageNum
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        )}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="p-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition text-[11px] font-semibold flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-sans selection:bg-cyan-500 selection:text-white max-w-full overflow-hidden">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-cyan-600/20 text-white shrink-0">
                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                    Trading Journal & Ledger
                  </h2>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold font-mono">
                    Live P&L
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                  Delivery stock trades and intraday momentum performance tracking
                </p>
              </div>
            </div>

            {/* Action Buttons (Touch Friendly Grid on Mobile) */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleOpenAddModal('stock')}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-blue-600/25 transition active:scale-95 flex items-center justify-center gap-1 truncate"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"> Stock Trade</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('intraday')}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-cyan-600/25 transition active:scale-95 flex items-center justify-center gap-1 truncate"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"> Intraday</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Master Dashboard - 4 Summary Cards (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Total Stock P/L */}
        <div className="bg-slate-900/90 border border-blue-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-blue-300">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Stock P/L</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-blue-400">
              {stockTrades.length} trades
            </span>
          </div>
          <div className={clsx(
            'text-lg sm:text-2xl font-black font-mono tracking-tight truncate',
            masterStats.stockTotalPl > 0 && 'text-emerald-400',
            masterStats.stockTotalPl < 0 && 'text-rose-400',
            masterStats.stockTotalPl === 0 && 'text-slate-200'
          )}>
            {masterStats.stockTotalPl > 0 ? '+' : ''}
            {formatCurrency(masterStats.stockTotalPl)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Inv: {formatCurrency(masterStats.stockInvested)}
          </p>
        </div>

        {/* Card 2: Total Intraday P/L */}
        <div className="bg-slate-900/90 border border-cyan-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-cyan-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Intraday P/L</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-cyan-400">
              {intradayTrades.length} setups
            </span>
          </div>
          <div className={clsx(
            'text-lg sm:text-2xl font-black font-mono tracking-tight truncate',
            masterStats.intradayTotalPl > 0 && 'text-emerald-400',
            masterStats.intradayTotalPl < 0 && 'text-rose-400',
            masterStats.intradayTotalPl === 0 && 'text-slate-200'
          )}>
            {masterStats.intradayTotalPl > 0 ? '+' : ''}
            {formatCurrency(masterStats.intradayTotalPl)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            {masterStats.intradayClosedCount} closed day setups
          </p>
        </div>

        {/* Card 3: Net Overall P/L */}
        <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Net Overall</span>
            </span>
            {masterStats.overallWinRate !== null && (
              <span className="text-[9px] font-mono font-bold text-emerald-400">
                {masterStats.overallWinRate}% Win
              </span>
            )}
          </div>
          <div className={clsx(
            'text-lg sm:text-2xl font-black font-mono tracking-tight truncate',
            masterStats.netOverallPl > 0 && 'text-emerald-400',
            masterStats.netOverallPl < 0 && 'text-rose-400',
            masterStats.netOverallPl === 0 && 'text-slate-200'
          )}>
            {masterStats.netOverallPl > 0 ? '+' : ''}
            {formatCurrency(masterStats.netOverallPl)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Combined net realized
          </p>
        </div>

        {/* Card 4: Total Charges & Brokerage Paid */}
        <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1 text-amber-300">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Charges</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-amber-400">
              Taxes & Fees
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-amber-400 truncate">
            {formatCurrency(masterStats.totalChargesPaid)}
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
            Stock: {formatCurrency(masterStats.stockCharges)} • Intra: {formatCurrency(masterStats.intradayCharges)}
          </p>
        </div>
      </div>

      {/* 3. Filter Bar (Month Dropdown, Quarter Dropdown, Search Input) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-slate-900/80 p-2.5 sm:p-3.5 rounded-2xl border border-slate-800">
        
        {/* Left: Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
          
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            {/* Month Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs text-white focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-slate-900">All</option>
                <option value="1" className="bg-slate-900">Jan</option>
                <option value="2" className="bg-slate-900">Feb</option>
                <option value="3" className="bg-slate-900">Mar</option>
                <option value="4" className="bg-slate-900">Apr</option>
                <option value="5" className="bg-slate-900">May</option>
                <option value="6" className="bg-slate-900">Jun</option>
                <option value="7" className="bg-slate-900">Jul</option>
                <option value="8" className="bg-slate-900">Aug</option>
                <option value="9" className="bg-slate-900">Sep</option>
                <option value="10" className="bg-slate-900">Oct</option>
                <option value="11" className="bg-slate-900">Nov</option>
                <option value="12" className="bg-slate-900">Dec</option>
              </select>
            </div>

            {/* Quarter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Quarter:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs text-white focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-slate-900">All</option>
                <option value="Q1" className="bg-slate-900">Q1</option>
                <option value="Q2" className="bg-slate-900">Q2</option>
                <option value="Q3" className="bg-slate-900">Q3</option>
                <option value="Q4" className="bg-slate-900">Q4</option>
              </select>
            </div>
          </div>

          {/* Asset Name Search Box */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-cyan-500 transition shadow-inner">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Asset (e.g. RELIANCE, NIFTY)..."
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher (Full width on Mobile) */}
        <div className="grid grid-cols-3 sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              'py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition text-center truncate',
              activeTab === 'all'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            )}
          >
            All ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={clsx(
              'py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 truncate',
              activeTab === 'stock'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-blue-300'
            )}
          >
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span className="truncate">Stocks ({stockTrades.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('intraday')}
            className={clsx(
              'py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 truncate',
              activeTab === 'intraday'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-cyan-300'
            )}
          >
            <Zap className="w-3 h-3 shrink-0" />
            <span className="truncate">Intraday ({intradayTrades.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Notion-style Data Grids + Mobile Cards with Collapsible Sections & Pagination */}
      <div className="space-y-4 sm:space-y-6">
        {/* Section 1: Stocks Table */}
        {(activeTab === 'all' || activeTab === 'stock') && (
          renderNotionTradeGrid({
            tradeList: stockTrades,
            title: 'Stocks Journal (Delivery / Positional)',
            typeBadgeColor: 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-600/30',
            iconComponent: TrendingUp,
            isExpanded: isStockExpanded,
            onToggleExpand: () => setIsStockExpanded((prev) => !prev),
            currentPage: stockPage,
            onPageChange: (p) => setStockPage(p)
          })
        )}

        {/* Section 2: Intraday Table */}
        {(activeTab === 'all' || activeTab === 'intraday') && (
          renderNotionTradeGrid({
            tradeList: intradayTrades,
            title: 'Intraday Journal (Momentum & Scalps)',
            typeBadgeColor: 'bg-gradient-to-tr from-cyan-600 to-teal-600 shadow-cyan-600/30',
            iconComponent: Zap,
            isExpanded: isIntradayExpanded,
            onToggleExpand: () => setIsIntradayExpanded((prev) => !prev),
            currentPage: intradayPage,
            onPageChange: (p) => setIntradayPage(p)
          })
        )}
      </div>

      {/* ================= ADD / EDIT TRADE MODAL (Rendered in Body Portal for True Viewport Centering) ================= */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col relative z-[100000] my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'p-1.5 sm:p-2 rounded-xl text-white shadow-md shrink-0',
                  formTradeType === 'intraday' ? 'bg-cyan-600 shadow-cyan-600/30' : 'bg-blue-600 shadow-blue-600/30'
                )}>
                  {formTradeType === 'intraday' ? <Zap className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-base font-bold text-white truncate">
                    {editingTrade ? 'Edit Trade Entry' : formTradeType === 'intraday' ? 'Log Intraday Trade' : 'Log Stock Trade'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    Record trade execution with brokerage tracking
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
            <form onSubmit={handleSaveTrade} className="space-y-3 flex-1 overflow-y-auto pr-1">
              
              {/* Trade Type Selector */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormTradeType('stock')}
                  className={clsx(
                    'py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1',
                    formTradeType === 'stock'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Stock (Delivery)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormTradeType('intraday')}
                  className={clsx(
                    'py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1',
                    formTradeType === 'intraday'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Intraday Trade</span>
                </button>
              </div>

              {/* Asset Name */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Asset Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RELIANCE, TATASTEEL, NIFTY 24500 CE"
                  value={formAssetName}
                  onChange={(e) => setFormAssetName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 uppercase transition"
                  autoFocus
                />
              </div>

              {/* Buy Date & Buy Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>Buy Date <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formBuyDate}
                    onChange={(e) => setFormBuyDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Buy Price (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              {/* Quantity & Charges */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-amber-400" />
                    <span>Charges (₹)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="20"
                    value={formCharges}
                    onChange={(e) => setFormCharges(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              {/* Trade Decision */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Trade Decision
                  </label>
                  <select
                    value={formTradeDecision}
                    onChange={(e) => setFormTradeDecision(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                  >
                    {DECISION_PRESETS.map((d) => (
                      <option key={d} value={d} className="bg-slate-900">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    {formTradeDecision === 'Custom / Other...' ? 'Type Custom Decision *' : 'Custom Tag (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Breakout, Scalp"
                    value={formCustomDecision}
                    onChange={(e) => setFormCustomDecision(e.target.value)}
                    className={clsx(
                      'w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border rounded-xl text-xs text-white focus:outline-none transition',
                      formTradeDecision === 'Custom / Other...'
                        ? 'border-cyan-500 ring-1 ring-cyan-500/20'
                        : 'border-slate-800 focus:border-cyan-500'
                    )}
                  />
                </div>
              </div>

              {/* Exit Details Toggle */}
              <div className="p-2.5 sm:p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsExited}
                      onChange={(e) => setFormIsExited(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700 accent-cyan-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Trade is Exited / Closed
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {formIsExited ? 'Realized P&L calculated' : 'Position open'}
                  </span>
                </div>

                {formIsExited && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 mb-1">
                        Sell Date
                      </label>
                      <input
                        type="date"
                        value={formSellDate}
                        onChange={(e) => setFormSellDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 mb-1">
                        Sell Price (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={formSellPrice}
                        onChange={(e) => setFormSellPrice(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Strategy Notes */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Strategy Notes / Trade Rationale (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. 15min chart breakout above resistance..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={clsx(
                    'px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-lg active:scale-95',
                    formTradeType === 'intraday'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-600/30'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                  )}
                >
                  {editingTrade ? 'Save Changes' : 'Record Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= QUICK EXIT / SQUARE-OFF MODAL (Rendered in Body Portal) ================= */}
      {exitModalTarget && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setExitModalTarget(null);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto relative z-[100000]"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white">Exit Position</h4>
                <p className="text-xs text-slate-400 truncate">
                  {exitModalTarget.assetName} (Bought @ {formatCurrency(exitModalTarget.buyPrice)})
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitExitModal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exit / Sell Date
                </label>
                <input
                  type="date"
                  required
                  value={exitSellDate}
                  onChange={(e) => setExitSellDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sell Price (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={exitSellPrice}
                  onChange={(e) => setExitSellPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExitModalTarget(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition active:scale-95"
                >
                  Confirm Exit
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
                <h4 className="text-sm font-bold text-white">Delete Trade?</h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Are you sure you want to remove "{deleteTarget.assetName}"?
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

