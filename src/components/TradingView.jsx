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
  ArrowUpDown,
  LogOut,
  Receipt,
  Coins,
  DollarSign,
  History,
  PieChart,
  Scale,
  Split,
  PlusCircle,
  MinusCircle,
  Hourglass,
  Sparkles,
  Download
} from 'lucide-react';
import TradingAnalysis from './TradingAnalysis';
import cacheManager from '../utils/cacheManager';
import { exportTradesToExcel } from '../utils/excelExporter';

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

/**
 * Standard Equity Charges Auto-Calculator (Brokerage, STT, Exchange, SEBI, GST, Stamp Duty, DP)
 */
export const calculateTradeCharges = (quantity, price, tradeType = 'stock', isBuy = true) => {
  const qty = parseFloat(quantity) || 0;
  const prc = parseFloat(price) || 0;
  const tradeValue = qty * prc;
  if (tradeValue <= 0) return 0;

  const isStock = tradeType !== 'intraday';

  const brokerage = Math.min(20, tradeValue * 0.0005);
  const exchangeCharge = tradeValue * 0.0000325;
  const sebiCharge = tradeValue * 0.000001;
  const gst = 0.18 * (brokerage + exchangeCharge + sebiCharge);

  let stampDuty = 0;
  let stt = 0;

  if (!isStock) {
    // Intraday
    stampDuty = isBuy ? (tradeValue * 0.00003) : 0;
    stt = isBuy ? 0 : (tradeValue * 0.00025);
  } else {
    // Delivery (stock)
    stampDuty = isBuy ? (tradeValue * 0.00015) : 0;
    stt = tradeValue * 0.001;
  }

  const dpCharge = (!isBuy && isStock) ? 21.50 : 0;

  const totalCharges = brokerage + exchangeCharge + sebiCharge + gst + stampDuty + stt + dpCharge;
  return Math.round(totalCharges * 100) / 100;
};

export default function TradingView() {
  const [trades, setTrades] = useState(() => {
    const cached = cacheManager.get('trades_list');
    if (Array.isArray(cached)) return cached;
    try {
      const stored = JSON.parse(localStorage.getItem('antaryudh_trading_data') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // View Mode: 'journal' (default spreadsheet/cards) | 'analysis' (deep analytics page)
  const [viewMode, setViewMode] = useState('journal');

  // Filters State (Sort filter + Search + Category Tabs)
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'profit_desc' | 'loss_desc' | 'returns_pct_desc' | 'holding_desc' | 'holding_asc'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'stock' | 'intraday'

  // Pagination State (Max 10 entries per page)
  const [stockPage, setStockPage] = useState(1);
  const [intradayPage, setIntradayPage] = useState(1);

  // Mobile Collapsible / Expandable Sections State
  const [isStockExpanded, setIsStockExpanded] = useState(true);
  const [isIntradayExpanded, setIsIntradayExpanded] = useState(true);

  // Add / Edit Full Trade Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [modalMode, setModalMode] = useState('simple'); // 'simple' | 'multileg'
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);
  const [isSubmittingPartialSell, setIsSubmittingPartialSell] = useState(false);
  const [isSubmittingPartialBuy, setIsSubmittingPartialBuy] = useState(false);

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
  const [formLegs, setFormLegs] = useState([]);

  // Quick Partial Sell Modal State
  const [partialSellTarget, setPartialSellTarget] = useState(null);
  const [partialSellDate, setPartialSellDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [partialSellQty, setPartialSellQty] = useState('');
  const [partialSellPrice, setPartialSellPrice] = useState('');
  const [partialSellCharges, setPartialSellCharges] = useState('20');
  const [partialSellNotes, setPartialSellNotes] = useState('');

  // Quick Partial Buy (Accumulate) Modal State
  const [partialBuyTarget, setPartialBuyTarget] = useState(null);
  const [partialBuyDate, setPartialBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [partialBuyQty, setPartialBuyQty] = useState('');
  const [partialBuyPrice, setPartialBuyPrice] = useState('');
  const [partialBuyCharges, setPartialBuyCharges] = useState('20');
  const [partialBuyNotes, setPartialBuyNotes] = useState('');

  // Trade Execution History / Breakdown Modal State
  const [legsHistoryTarget, setLegsHistoryTarget] = useState(null);

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setPartialSellTarget(null);
        setPartialBuyTarget(null);
        setLegsHistoryTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Trades from Backend API (with SWR caching)
  const fetchTrades = async () => {
    if (trades.length === 0) {
      setLoading(true);
    }
    setErrorMsg(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get(API_BASE, { params });
      if (Array.isArray(res.data)) {
        setTrades(res.data);
        cacheManager.set('trades_list', res.data, 120000);
        localStorage.setItem('antaryudh_trading_data', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Backend /api/trades unreachable, loading cache:', err);
      const cached = cacheManager.get('trades_list', () => {
        try {
          return JSON.parse(localStorage.getItem('antaryudh_trading_data') || '[]');
        } catch {
          return [];
        }
      });
      setTrades(cached || []);
      setErrorMsg('Operating in offline local cache mode.');
    } finally {
      setLoading(false);
    }
  };

  // Sync cache & localStorage whenever trades state updates
  useEffect(() => {
    if (trades && Array.isArray(trades)) {
      cacheManager.set('trades_list', trades, 120000);
      try {
        localStorage.setItem('antaryudh_trading_data', JSON.stringify(trades));
      } catch (e) {
        console.warn('Could not sync trades to localStorage:', e);
      }
    }
  }, [trades]);

  useEffect(() => {
    fetchTrades();
    setStockPage(1);
    setIntradayPage(1);
  }, [searchQuery]);

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

  // Calculate Holding Duration (in days, months, or years)
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

  // Comprehensive calculation engine for both single-leg and multi-leg partial trades
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
      const isOpen = totalSellQty === 0;

      // Realized cost basis for the sold portion
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
        isOpen,
        sellPrice: avgSellPrice,
        sellValue: hasSells ? totalSellRevenue : null,
        returnsInr,
        returnsPercent,
        charges: totalCharges,
        hasMultiLegs: buyLegs.length > 1 || sellLegs.length > 1 || (buyLegs.length + sellLegs.length > 2),
        buyLegsCount: buyLegs.length,
        sellLegsCount: sellLegs.length,
        legs: rawTx,
        holdingDays,
        holdingDurationText
      };
    }

    // Classic single entry fallback
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
      sellPrice,
      sellValue,
      returnsInr,
      returnsPercent,
      charges,
      hasMultiLegs: false,
      buyLegsCount: 1,
      sellLegsCount: isClosed ? 1 : 0,
      legs: [
        {
          id: 'initial-buy',
          type: 'BUY',
          date: trade.buyDate,
          price: buyPrice,
          quantity: qty,
          charges,
          notes: trade.notes || 'Initial Entry'
        },
        ...(isClosed
          ? [
              {
                id: 'full-exit',
                type: 'SELL',
                date: trade.sellDate,
                price: sellPrice,
                quantity: qty,
                charges: 0,
                notes: 'Full Exit'
              }
            ]
          : [])
      ],
      holdingDays,
      holdingDurationText
    };
  };

  // Sort and process trade list based on user's sort filter
  const processAndSortTrades = (tradeList) => {
    return [...tradeList].sort((a, b) => {
      const mA = calculateTradeMetrics(a);
      const mB = calculateTradeMetrics(b);

      if (sortBy === 'profit_desc') {
        // Highest profit first (Descending order: e.g. +50000 -> +5000 -> 0 -> -2000)
        const pnlA = mA.returnsInr !== null ? mA.returnsInr : -999999999;
        const pnlB = mB.returnsInr !== null ? mB.returnsInr : -999999999;
        return pnlB - pnlA;
      }
      if (sortBy === 'loss_desc') {
        // Highest loss first (Ascending profit order: e.g. -25000 -> -5000 -> +1000)
        const pnlA = mA.returnsInr !== null ? mA.returnsInr : 999999999;
        const pnlB = mB.returnsInr !== null ? mB.returnsInr : 999999999;
        return pnlA - pnlB;
      }
      if (sortBy === 'returns_pct_desc') {
        const pctA = mA.returnsPercent !== null ? mA.returnsPercent : -999999999;
        const pctB = mB.returnsPercent !== null ? mB.returnsPercent : -999999999;
        return pctB - pctA;
      }
      if (sortBy === 'holding_desc') {
        return mB.holdingDays - mA.holdingDays;
      }
      if (sortBy === 'holding_asc') {
        return mA.holdingDays - mB.holdingDays;
      }

      // Default: Latest buy date / ID
      const dateA = new Date(a.buyDate || 0).getTime();
      const dateB = new Date(b.buyDate || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });
  };

  const stockTrades = useMemo(() => {
    const list = trades.filter((t) => t.tradeType === 'stock');
    return processAndSortTrades(list);
  }, [trades, sortBy]);

  const intradayTrades = useMemo(() => {
    const list = trades.filter((t) => t.tradeType === 'intraday');
    return processAndSortTrades(list);
  }, [trades, sortBy]);

  // Master Dashboard Calculations (Including Realized P&L on all partial & full closes)
  const masterStats = useMemo(() => {
    let stockTotalPl = 0;
    let stockInvested = 0;
    let stockCurrentInvested = 0;
    let stockClosedCount = 0;
    let stockOpenCount = 0;
    let stockWinCount = 0;
    let stockCharges = 0;

    let intradayTotalPl = 0;
    let intradayInvested = 0;
    let intradayCurrentInvested = 0;
    let intradayClosedCount = 0;
    let intradayOpenCount = 0;
    let intradayWinCount = 0;
    let intradayCharges = 0;

    trades.forEach((t) => {
      const { invested, currentInvested, hasSells, returnsInr, charges, isOpen, isPartial } = calculateTradeMetrics(t);
      if (t.tradeType === 'stock') {
        stockInvested += invested;
        stockCurrentInvested += currentInvested;
        stockCharges += charges;
        if (isOpen || isPartial) stockOpenCount += 1;
        if (hasSells && returnsInr !== null) {
          stockTotalPl += returnsInr;
          stockClosedCount += 1;
          if (returnsInr > 0) stockWinCount += 1;
        }
      } else {
        intradayInvested += invested;
        intradayCurrentInvested += currentInvested;
        intradayCharges += charges;
        if (isOpen || isPartial) intradayOpenCount += 1;
        if (hasSells && returnsInr !== null) {
          intradayTotalPl += returnsInr;
          intradayClosedCount += 1;
          if (returnsInr > 0) intradayWinCount += 1;
        }
      }
    });

    const netOverallPl = stockTotalPl + intradayTotalPl;
    const totalChargesPaid = stockCharges + intradayCharges;
    const totalClosed = stockClosedCount + intradayClosedCount;
    const totalOpen = stockOpenCount + intradayOpenCount;
    const totalWins = stockWinCount + intradayWinCount;
    const overallWinRate = totalClosed > 0 ? ((totalWins / totalClosed) * 100).toFixed(1) : null;
    const totalInvested = stockInvested + intradayInvested;
    const totalCurrentInvested = stockCurrentInvested + intradayCurrentInvested;

    return {
      stockTotalPl,
      stockInvested,
      stockCurrentInvested,
      stockClosedCount,
      stockOpenCount,
      stockCharges,
      intradayTotalPl,
      intradayInvested,
      intradayCurrentInvested,
      intradayClosedCount,
      intradayOpenCount,
      intradayCharges,
      totalChargesPaid,
      netOverallPl,
      totalClosed,
      totalOpen,
      overallWinRate,
      totalInvested,
      totalCurrentInvested
    };
  }, [trades]);

  // Reactive Auto-Calculate Charges for Simple Modal
  useEffect(() => {
    if (modalMode === 'simple' && isModalOpen) {
      const bPrice = parseFloat(formBuyPrice) || 0;
      const bQty = parseInt(formQuantity, 10) || 0;
      if (bPrice > 0 && bQty > 0) {
        const buyChg = calculateTradeCharges(bQty, bPrice, formTradeType, true);
        const sPrice = formIsExited && formSellPrice ? parseFloat(formSellPrice) || 0 : 0;
        const sellChg = formIsExited && sPrice > 0 ? calculateTradeCharges(bQty, sPrice, formTradeType, false) : 0;
        const total = buyChg + sellChg;
        setFormCharges(total > 0 ? String(total) : '0');
      }
    }
  }, [formQuantity, formBuyPrice, formTradeType, formIsExited, formSellPrice, modalMode, isModalOpen]);

  // Reactive Auto-Calculate Charges for Partial Sell Modal
  useEffect(() => {
    if (partialSellTarget && partialSellQty && partialSellPrice) {
      const q = parseInt(partialSellQty, 10) || 0;
      const p = parseFloat(partialSellPrice) || 0;
      if (q > 0 && p > 0) {
        const chg = calculateTradeCharges(q, p, partialSellTarget.tradeType, false);
        setPartialSellCharges(String(chg));
      }
    }
  }, [partialSellQty, partialSellPrice, partialSellTarget]);

  // Reactive Auto-Calculate Charges for Partial Buy Modal
  useEffect(() => {
    if (partialBuyTarget && partialBuyQty && partialBuyPrice) {
      const q = parseInt(partialBuyQty, 10) || 0;
      const p = parseFloat(partialBuyPrice) || 0;
      if (q > 0 && p > 0) {
        const chg = calculateTradeCharges(q, p, partialBuyTarget.tradeType, true);
        setPartialBuyCharges(String(chg));
      }
    }
  }, [partialBuyQty, partialBuyPrice, partialBuyTarget]);

  // Open Full Add Trade Modal
  const handleOpenAddModal = (defaultType = 'stock') => {
    setEditingTrade(null);
    setModalMode('simple');
    setFormTradeType(defaultType);
    setFormAssetName('');
    const today = new Date().toISOString().split('T')[0];
    setFormBuyDate(today);
    setFormBuyPrice('');
    setFormQuantity('1');
    setFormCharges('0');
    setFormTradeDecision('Self');
    setFormCustomDecision('');
    setFormIsExited(false);
    setFormSellDate(today);
    setFormSellPrice('');
    setFormNotes('');
    setFormLegs([
      {
        id: `leg-buy-${Date.now()}`,
        type: 'BUY',
        date: today,
        price: '',
        quantity: '1',
        charges: '0',
        notes: 'Initial Entry'
      }
    ]);
    setIsModalOpen(true);
  };

  // Open Full Edit Trade Modal
  const handleOpenEditModal = (t) => {
    setEditingTrade(t);
    setFormTradeType(t.tradeType || 'stock');
    setFormAssetName(t.assetName || '');
    const today = new Date().toISOString().split('T')[0];
    setFormBuyDate(t.buyDate ? t.buyDate.slice(0, 10) : today);
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
    setFormSellDate(t.sellDate ? t.sellDate.slice(0, 10) : today);
    setFormSellPrice(hasSell ? String(t.sellPrice) : '');
    setFormNotes(t.notes || '');

    const metrics = calculateTradeMetrics(t);
    if (metrics.hasMultiLegs || (Array.isArray(t.transactions) && t.transactions.length > 1)) {
      setModalMode('multileg');
      setFormLegs(
        metrics.legs.map((l) => ({
          id: l.id || `leg-${Math.random()}`,
          type: l.type,
          date: l.date ? l.date.slice(0, 10) : today,
          price: String(l.price ?? ''),
          quantity: String(l.quantity ?? '1'),
          charges: String(l.charges ?? '0'),
          notes: l.notes || ''
        }))
      );
    } else {
      setModalMode('simple');
      setFormLegs(
        metrics.legs.map((l) => ({
          id: l.id || `leg-${Math.random()}`,
          type: l.type,
          date: l.date ? l.date.slice(0, 10) : today,
          price: String(l.price ?? ''),
          quantity: String(l.quantity ?? '1'),
          charges: String(l.charges ?? '0'),
          notes: l.notes || ''
        }))
      );
    }

    setIsModalOpen(true);
  };

  // Open Quick Partial Sell Modal
  const handleOpenPartialSellModal = (trade) => {
    const metrics = calculateTradeMetrics(trade);
    const remQty = metrics.remainingQty || 1;
    const estPrice = metrics.avgBuyPrice || 0;
    const autoChg = calculateTradeCharges(remQty, estPrice, trade.tradeType, false);

    setPartialSellTarget(trade);
    setPartialSellDate(new Date().toISOString().split('T')[0]);
    setPartialSellQty(String(remQty));
    setPartialSellPrice(metrics.avgBuyPrice ? String(metrics.avgBuyPrice) : '');
    setPartialSellCharges(String(autoChg));
    setPartialSellNotes(remQty > 1 ? 'Partial Exit' : 'Full Exit');
  };

  // Open Quick Partial Buy (Accumulate) Modal
  const handleOpenPartialBuyModal = (trade) => {
    const metrics = calculateTradeMetrics(trade);
    const estPrice = metrics.avgBuyPrice || 0;
    const autoChg = calculateTradeCharges(1, estPrice, trade.tradeType, true);

    setPartialBuyTarget(trade);
    setPartialBuyDate(new Date().toISOString().split('T')[0]);
    setPartialBuyQty('1');
    setPartialBuyPrice(metrics.avgBuyPrice ? String(metrics.avgBuyPrice) : '');
    setPartialBuyCharges(String(autoChg));
    setPartialBuyNotes('Add Quantity (Averaging)');
  };

  // Submit Quick Partial Sell
  const handleSubmitPartialSell = async (e) => {
    e.preventDefault();
    if (!partialSellTarget || isSubmittingPartialSell) return;

    setIsSubmittingPartialSell(true);
    const payload = {
      date: partialSellDate,
      quantity: parseInt(partialSellQty, 10) || 1,
      price: parseFloat(partialSellPrice) || 0,
      charges: parseFloat(partialSellCharges) || 0,
      notes: partialSellNotes.trim()
    };

    try {
      const res = await axios.post(`${API_BASE}/${partialSellTarget.id}/partial-sell`, payload);
      const updated = res.data;
      setTrades((prev) => prev.map((t) => (t.id === partialSellTarget.id ? updated : t)));
    } catch (err) {
      console.warn('Backend partial-sell failed, applying locally:', err);
      const trade = partialSellTarget;
      const metrics = calculateTradeMetrics(trade);
      const newLeg = {
        id: `leg-sell-${Date.now()}`,
        type: 'SELL',
        date: payload.date,
        price: payload.price,
        quantity: payload.quantity,
        charges: payload.charges,
        notes: payload.notes
      };
      const newTransactions = [...metrics.legs, newLeg];
      const updated = {
        ...trade,
        transactions: newTransactions
      };
      setTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
    } finally {
      setIsSubmittingPartialSell(false);
      setPartialSellTarget(null);
    }
  };

  // Submit Quick Partial Buy (Accumulate)
  const handleSubmitPartialBuy = async (e) => {
    e.preventDefault();
    if (!partialBuyTarget || isSubmittingPartialBuy) return;

    setIsSubmittingPartialBuy(true);
    const payload = {
      date: partialBuyDate,
      quantity: parseInt(partialBuyQty, 10) || 1,
      price: parseFloat(partialBuyPrice) || 0,
      charges: parseFloat(partialBuyCharges) || 0,
      notes: partialBuyNotes.trim()
    };

    try {
      const res = await axios.post(`${API_BASE}/${partialBuyTarget.id}/partial-buy`, payload);
      const updated = res.data;
      setTrades((prev) => prev.map((t) => (t.id === partialBuyTarget.id ? updated : t)));
    } catch (err) {
      console.warn('Backend partial-buy failed, applying locally:', err);
      const trade = partialBuyTarget;
      const metrics = calculateTradeMetrics(trade);
      const newLeg = {
        id: `leg-buy-${Date.now()}`,
        type: 'BUY',
        date: payload.date,
        price: payload.price,
        quantity: payload.quantity,
        charges: payload.charges,
        notes: payload.notes
      };
      const newTransactions = [...metrics.legs, newLeg];
      const updated = {
        ...trade,
        transactions: newTransactions
      };
      setTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
    } finally {
      setIsSubmittingPartialBuy(false);
      setPartialBuyTarget(null);
    }
  };

  // Multi-Leg Dynamic Form Helpers
  const handleAddFormLeg = (type = 'BUY') => {
    setFormLegs((prev) => [
      ...prev,
      {
        id: `leg-${type.toLowerCase()}-${Date.now()}`,
        type,
        date: new Date().toISOString().split('T')[0],
        price: '',
        quantity: '1',
        charges: '0',
        notes: type === 'BUY' ? 'Buy Entry' : 'Partial Exit'
      }
    ]);
  };

  const handleRemoveFormLeg = (id) => {
    setFormLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateFormLeg = (id, field, value) => {
    setFormLegs((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'price' || field === 'quantity' || field === 'type') {
          const isBuy = (field === 'type' ? value : updated.type) !== 'SELL';
          const qty = field === 'quantity' ? value : updated.quantity;
          const prc = field === 'price' ? value : updated.price;
          const autoChg = calculateTradeCharges(qty, prc, formTradeType, isBuy);
          if (autoChg > 0) {
            updated.charges = String(autoChg);
          }
        }
        return updated;
      })
    );
  };

  // Preview metrics calculated live for multi-leg modal
  const formPreviewMetrics = useMemo(() => {
    if (modalMode !== 'multileg') {
      const buyP = parseFloat(formBuyPrice) || 0;
      const qty = parseInt(formQuantity, 10) || 0;
      const chg = parseFloat(formCharges) || 0;
      const sellP = formIsExited && formSellPrice ? parseFloat(formSellPrice) : null;
      const inv = buyP * qty;
      const rev = sellP !== null ? sellP * qty : 0;
      const pnl = sellP !== null ? rev - inv - chg : null;
      return {
        totalBuyQty: qty,
        avgBuyPrice: buyP,
        totalSellQty: sellP !== null ? qty : 0,
        avgSellPrice: sellP,
        remainingQty: sellP !== null ? 0 : qty,
        totalCharges: chg,
        realizedPnl: pnl
      };
    }

    const buyLegs = formLegs.filter((l) => l.type === 'BUY');
    const sellLegs = formLegs.filter((l) => l.type === 'SELL');

    const totalBuyQty = buyLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
    const totalBuyCost = buyLegs.reduce(
      (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
      0
    );
    const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

    const totalSellQty = sellLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
    const totalSellRevenue = sellLegs.reduce(
      (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
      0
    );
    const avgSellPrice = totalSellQty > 0 ? totalSellRevenue / totalSellQty : null;

    const remainingQty = Math.max(0, totalBuyQty - totalSellQty);
    const totalCharges = formLegs.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);

    const costBasisOfSold = totalSellQty * avgBuyPrice;
    const realizedPnl = totalSellQty > 0 ? totalSellRevenue - costBasisOfSold - totalCharges : null;

    return {
      totalBuyQty,
      avgBuyPrice,
      totalSellQty,
      avgSellPrice,
      remainingQty,
      totalCharges,
      realizedPnl
    };
  }, [modalMode, formBuyPrice, formQuantity, formCharges, formIsExited, formSellPrice, formLegs]);

  // Submit Full Add / Edit Trade
  const handleSaveTrade = async (e) => {
    e.preventDefault();
    if (!formAssetName.trim()) return;

    let finalDecision = formTradeDecision;
    if (formTradeDecision === 'Custom / Other...') {
      finalDecision = formCustomDecision.trim() || 'Self';
    }

    let payload;
    if (modalMode === 'multileg' && formLegs.length > 0) {
      const cleanLegs = formLegs.map((l) => ({
        id: l.id,
        type: l.type,
        date: l.date,
        price: parseFloat(l.price) || 0,
        quantity: parseInt(l.quantity, 10) || 1,
        charges: parseFloat(l.charges) || 0,
        notes: (l.notes || '').trim()
      }));

      const buyLegs = cleanLegs.filter((l) => l.type === 'BUY');
      const sellLegs = cleanLegs.filter((l) => l.type === 'SELL');

      const totalBuyQty = buyLegs.reduce((a, b) => a + b.quantity, 0);
      const totalBuyCost = buyLegs.reduce((a, b) => a + b.price * b.quantity, 0);
      const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
      const earliestBuyDate = buyLegs[0]?.date || new Date().toISOString().split('T')[0];

      const totalSellQty = sellLegs.reduce((a, b) => a + b.quantity, 0);
      const totalSellRevenue = sellLegs.reduce((a, b) => a + b.price * b.quantity, 0);
      const avgSellPrice = totalSellQty > 0 ? totalSellRevenue / totalSellQty : null;
      const latestSellDate = sellLegs.length > 0 ? sellLegs[sellLegs.length - 1].date : null;

      const totalCharges = cleanLegs.reduce((a, b) => a + b.charges, 0);

      payload = {
        tradeType: formTradeType,
        assetName: formAssetName.trim().toUpperCase(),
        buyDate: earliestBuyDate,
        buyPrice: avgBuyPrice,
        quantity: totalBuyQty || 1,
        charges: totalCharges,
        tradeDecision: finalDecision,
        sellDate: latestSellDate,
        sellPrice: avgSellPrice,
        notes: formNotes.trim(),
        transactions: cleanLegs
      };
    } else {
      const bPrice = parseFloat(formBuyPrice) || 0;
      const bQty = parseInt(formQuantity, 10) || 1;
      const sPrice = formIsExited && formSellPrice ? parseFloat(formSellPrice) : null;
      const chg = parseFloat(formCharges) || 0;

      const defaultTransactions = [
        {
          id: `leg-buy-${Date.now()}`,
          type: 'BUY',
          date: formBuyDate,
          price: bPrice,
          quantity: bQty,
          charges: chg,
          notes: 'Initial Entry'
        },
        ...(sPrice !== null
          ? [
              {
                id: `leg-sell-${Date.now() + 1}`,
                type: 'SELL',
                date: formSellDate,
                price: sPrice,
                quantity: bQty,
                charges: 0,
                notes: 'Full Exit'
              }
            ]
          : [])
      ];

      payload = {
        tradeType: formTradeType,
        assetName: formAssetName.trim().toUpperCase(),
        buyDate: formBuyDate,
        buyPrice: bPrice,
        quantity: bQty,
        charges: chg,
        tradeDecision: finalDecision,
        sellDate: formIsExited ? formSellDate : null,
        sellPrice: sPrice,
        notes: formNotes.trim(),
        transactions: defaultTransactions
      };
    }

    setIsSubmittingTrade(true);
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
      console.error('Error saving trade:', err);
      if (editingTrade) {
        setTrades((prev) =>
          prev.map((t) => (t.id === editingTrade.id ? { ...editingTrade, ...payload } : t))
        );
      } else {
        setTrades((prev) => [{ id: Date.now(), ...payload }, ...prev]);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmittingTrade(false);
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

    const totalItems = tradeList.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const paginatedItems = tradeList.slice(startIndex, startIndex + PAGE_SIZE);

    let categoryPl = 0;
    tradeList.forEach((t) => {
      const { returnsInr } = calculateTradeMetrics(t);
      if (returnsInr !== null) categoryPl += returnsInr;
    });

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-300">
        {/* Collapsible Table Header Section */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 select-none">
          <div
            onClick={onToggleExpand}
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer group flex-1"
          >
            <div
              className={clsx(
                'p-1.5 sm:p-2 rounded-xl text-white shadow-md shrink-0 transition-transform group-hover:scale-105',
                typeBadgeColor
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1">
              <h3 className="text-xs sm:text-base font-bold text-white tracking-tight truncate group-hover:text-cyan-300 transition">
                {title}
              </h3>

              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold shrink-0">
                {totalItems}
              </span>

              {/* Category Realized P/L Pill */}
              <span
                className={clsx(
                  'text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.2 rounded-full font-bold border shrink-0 truncate',
                  categoryPl > 0 && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  categoryPl < 0 && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  categoryPl === 0 && 'bg-slate-800 text-slate-400 border-slate-700'
                )}
              >
                P/L: {categoryPl > 0 ? '+' : ''}
                {formatCurrency(categoryPl)}
              </span>
            </div>

            <div className="p-1 rounded-lg bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition shrink-0 ml-auto sm:ml-1">
              <ChevronDown
                className={clsx(
                  'w-4 h-4 transition-transform duration-300',
                  isExpanded && 'rotate-180'
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportTradesToExcel(tradeList);
              }}
              title={`Download ${title} in Excel (.xlsx)`}
              className="py-1.5 px-2.5 rounded-xl bg-slate-800/90 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 text-[11px] sm:text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition active:scale-95 flex items-center justify-center gap-1 shadow-sm truncate"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Export</span>
            </button>

            <button
              onClick={() => handleOpenAddModal(isStockType ? 'stock' : 'intraday')}
              className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] sm:text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-cyan-600/20 truncate"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Trade</span>
            </button>
          </div>
        </div>

        {/* Collapsible Content Area */}
        {isExpanded && (
          <div className="animate-fadeIn">
            {/* 1. Mobile Cards View (< 768px) */}
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
                     Log trade
                  </button>
                </div>
              ) : (
                paginatedItems.map((trade) => {
                  const {
                    invested,
                    totalBuyQty,
                    avgBuyPrice,
                    totalSellQty,
                    avgSellPrice,
                    remainingQty,
                    hasSells,
                    isFullyClosed,
                    isPartial,
                    isOpen,
                    returnsInr,
                    returnsPercent,
                    charges,
                    hasMultiLegs,
                    legs,
                    holdingDurationText
                  } = calculateTradeMetrics(trade);

                  const isProfit = hasSells && returnsInr > 0;
                  const isLoss = hasSells && returnsInr < 0;

                  return (
                    <div
                      key={trade.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5 shadow-sm"
                    >
                      {/* Top Line: Asset + Status + P/L */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm font-mono tracking-tight truncate">
                            {trade.assetName}
                          </span>

                          {/* Status Badge */}
                          {isFullyClosed ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Closed
                            </span>
                          ) : isPartial ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Partial ({totalSellQty}/{totalBuyQty})
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Open ({totalBuyQty} Qty)
                            </span>
                          )}

                          {/* Multi-leg pill */}
                          {hasMultiLegs && (
                            <button
                              onClick={() => setLegsHistoryTarget(trade)}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5 hover:bg-indigo-500/30 transition"
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>{legs.length} Legs</span>
                            </button>
                          )}
                        </div>

                        {/* P&L badge if any portion sold */}
                        <div className="shrink-0">
                          {hasSells ? (
                            <span
                              className={clsx(
                                'text-[10px] font-bold px-2 py-0.5 rounded font-mono',
                                isProfit && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                                isLoss && 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                                !isProfit && !isLoss && 'bg-slate-800 text-slate-300'
                              )}
                            >
                              {returnsInr > 0 ? '+' : ''}
                              {formatCurrency(returnsInr)} ({returnsPercent > 0 ? '+' : ''}
                              {returnsPercent.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                              Active Position
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Line: Entry vs Exit Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Buy (Avg):
                          </span>
                          <span className="font-mono font-medium text-slate-200">
                            {totalBuyQty} @ {formatCurrency(avgBuyPrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Inv: {formatCurrency(invested)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Exit / Realized:
                          </span>
                          {hasSells ? (
                            <>
                              <span className="font-mono font-medium text-slate-200">
                                {totalSellQty} @ {formatCurrency(avgSellPrice)}
                              </span>
                              <span className="text-[10px] text-amber-300/90 block font-mono">
                                {remainingQty > 0 ? `${remainingQty} Open Qty` : 'Fully Sold'}
                              </span>
                            </>
                          ) : (
                            <span className="text-cyan-400 font-medium italic text-[11px]">
                              0 Sold • {remainingQty} Open
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Line: Hold Duration & Actions */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Hold Duration Badge */}
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                            <span>Hold: {holdingDurationText}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/20">
                            Fee: {formatCurrency(charges)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Partial Sell Button */}
                          {remainingQty > 0 && (
                            <button
                              onClick={() => handleOpenPartialSellModal(trade)}
                              className="px-2 py-1 rounded-lg bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 active:scale-95 shadow-sm"
                              title="Sell / Exit Partial or Full Quantity"
                            >
                              <MinusCircle className="w-3 h-3 text-cyan-400" />
                              <span>Sell</span>
                            </button>
                          )}

                          {/* Add Buy (Accumulate) Button */}
                          {remainingQty > 0 && (
                            <button
                              onClick={() => handleOpenPartialBuyModal(trade)}
                              className="p-1 rounded-lg text-blue-300 hover:text-white bg-blue-950/60 border border-blue-500/30 active:scale-95"
                              title="Add Buy / Accumulate Position"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View Legs History */}
                          <button
                            onClick={() => setLegsHistoryTarget(trade)}
                            className="p-1 rounded-lg text-indigo-300 hover:text-white bg-indigo-950/60 border border-indigo-500/30 active:scale-95"
                            title="View Buy/Sell Legs Timeline"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(trade)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                            title="Edit trade details"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(trade)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800"
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
              <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <th className="py-3 px-3.5 sticky left-0 z-20 bg-slate-950 min-w-[170px] border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      Asset & Status
                    </th>
                    <th className="py-3 px-2.5 min-w-[90px] border-r border-slate-800/60">Buy Date</th>
                    <th className="py-3 px-2.5 min-w-[95px] text-right border-r border-slate-800/60">Avg Buy Price</th>
                    <th className="py-3 px-2 min-w-[80px] text-center border-r border-slate-800/60">Qty (B/S/Rem)</th>
                    <th className="py-3 px-2.5 min-w-[100px] text-right border-r border-slate-800/60">Total Invested</th>
                    <th className="py-3 px-2 min-w-[70px] text-right border-r border-slate-800/60">Charges</th>
                    <th className="py-3 px-2.5 min-w-[105px] border-r border-slate-800/60 text-center">Trade Decision</th>
                    <th className="py-3 px-2.5 min-w-[90px] border-r border-slate-800/60">Exit Date</th>
                    <th className="py-3 px-2.5 min-w-[95px] text-center border-r border-slate-800/60 bg-slate-950/70">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Hold Duration</span>
                      </div>
                    </th>
                    <th className="py-3 px-2.5 min-w-[95px] text-right border-r border-slate-800/60">Avg Sell Price</th>
                    <th className="py-3 px-2.5 min-w-[100px] text-right border-r border-slate-800/60">Realized Val</th>
                    <th className="py-3 px-3 min-w-[110px] text-right border-r border-slate-800/60">Realized P&L (₹)</th>
                    <th className="py-3 px-2.5 min-w-[90px] text-right border-r border-slate-800/60">Returns (%)</th>
                    <th className="py-3 px-2 min-w-[110px] text-center sticky right-0 bg-slate-950 z-20 border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
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
                        <td colSpan={12} className="py-3.5 px-3">
                          <div className="h-4 w-full rounded animate-shimmer" />
                        </td>
                        <td className="py-3.5 px-2 sticky right-0 bg-slate-900 border-l border-slate-800">
                          <div className="h-4 w-8 mx-auto rounded animate-shimmer" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-10 text-center text-slate-500 font-normal">
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
                        totalBuyQty,
                        avgBuyPrice,
                        totalSellQty,
                        avgSellPrice,
                        remainingQty,
                        hasSells,
                        isFullyClosed,
                        isPartial,
                        isOpen,
                        sellValue,
                        returnsInr,
                        returnsPercent,
                        charges,
                        hasMultiLegs,
                        legs,
                        holdingDurationText
                      } = calculateTradeMetrics(trade);

                      const isProfit = hasSells && returnsInr > 0;
                      const isLoss = hasSells && returnsInr < 0;

                      return (
                        <tr
                          key={trade.id}
                          className="hover:bg-slate-800/40 transition-colors group text-slate-200"
                        >
                          {/* Asset Name + Status Pill + Legs */}
                          <td className="py-2.5 px-3.5 font-bold text-white sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="tracking-tight text-white">{trade.assetName}</span>

                              {isFullyClosed ? (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/30">
                                  Closed
                                </span>
                              ) : isPartial ? (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-500/30">
                                  Partial
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                                  Open
                                </span>
                              )}

                              {hasMultiLegs && (
                                <button
                                  onClick={() => setLegsHistoryTarget(trade)}
                                  className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/40 transition"
                                  title="View execution legs"
                                >
                                  {legs.length} Legs
                                </button>
                              )}
                            </div>
                            {trade.notes && (
                              <div
                                className="text-[10px] text-slate-400 font-normal truncate max-w-[160px] mt-0.5"
                                title={trade.notes}
                              >
                                {trade.notes}
                              </div>
                            )}
                          </td>

                          {/* Buy Date */}
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-300 border-r border-slate-800/60">
                            {formatDate(trade.buyDate)}
                          </td>

                          {/* Avg Buy Price */}
                          <td className="py-2.5 px-2.5 font-mono text-right text-slate-200 border-r border-slate-800/60">
                            <span>{formatCurrency(avgBuyPrice)}</span>
                          </td>

                          {/* Quantity (Bought / Sold / Open) */}
                          <td className="py-2.5 px-2 font-mono text-center text-slate-300 border-r border-slate-800/60">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-white">{totalBuyQty} Buy</span>
                              {hasSells && (
                                <span className="text-[10px] text-slate-400">
                                  {totalSellQty} Sold {remainingQty > 0 ? `• ${remainingQty} Open` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total Invested Cost */}
                          <td className="py-2.5 px-2.5 font-mono text-right font-medium text-slate-200 border-r border-slate-800/60">
                            {formatCurrency(invested)}
                          </td>

                          {/* Total Charges */}
                          <td className="py-2.5 px-2 font-mono text-right text-amber-400/90 border-r border-slate-800/60">
                            {charges > 0 ? formatCurrency(charges) : '₹0'}
                          </td>

                          {/* Trade Decision */}
                          <td className="py-2.5 px-2.5 border-r border-slate-800/60 text-center">
                            <span
                              className={clsx(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[100px] inline-block',
                                trade.tradeDecision === 'Eagle Eye' &&
                                  'bg-amber-500/10 text-amber-300 border-amber-500/30',
                                trade.tradeDecision === 'Telegram' &&
                                  'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                                trade.tradeDecision === 'Self' &&
                                  'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
                                !['Eagle Eye', 'Telegram', 'Self'].includes(trade.tradeDecision) &&
                                  'bg-slate-800 text-slate-300 border-slate-700'
                              )}
                            >
                              {trade.tradeDecision}
                            </span>
                          </td>

                          {/* Exit Date */}
                          <td className="py-2.5 px-2.5 font-mono text-[11px] border-r border-slate-800/60">
                            {trade.sellDate ? (
                              formatDate(trade.sellDate)
                            ) : (
                              <button
                                onClick={() => handleOpenPartialSellModal(trade)}
                                className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"
                                title="Click to sell / exit position"
                              >
                                <MinusCircle className="w-3 h-3" />
                                <span>Partial Sell</span>
                              </button>
                            )}
                          </td>

                          {/* Holding Duration Column */}
                          <td className="py-2.5 px-2.5 text-center font-mono text-[11px] border-r border-slate-800/60">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-md font-semibold text-[10px] inline-flex items-center gap-1 border',
                                isFullyClosed
                                  ? 'bg-slate-950 text-slate-300 border-slate-800'
                                  : isPartial
                                  ? 'bg-amber-950/30 text-amber-300 border-amber-500/30'
                                  : 'bg-cyan-950/30 text-cyan-300 border-cyan-500/30'
                              )}
                              title={`Bought on ${formatDate(trade.buyDate)}${
                                trade.sellDate ? ` • Sold on ${formatDate(trade.sellDate)}` : ' • Position currently open'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              <span>{holdingDurationText}</span>
                            </span>
                          </td>

                          {/* Avg Sell Price */}
                          <td className="py-2.5 px-2.5 font-mono text-right border-r border-slate-800/60">
                            {hasSells ? (
                              formatCurrency(avgSellPrice)
                            ) : (
                              <span className="text-slate-500 italic">Open</span>
                            )}
                          </td>

                          {/* Realized Value */}
                          <td className="py-2.5 px-2.5 font-mono text-right border-r border-slate-800/60">
                            {hasSells ? (
                              formatCurrency(sellValue)
                            ) : (
                              <span className="text-slate-500 italic">Open</span>
                            )}
                          </td>

                          {/* Realized Returns (₹) */}
                          <td
                            className={clsx(
                              'py-2.5 px-3 font-mono font-bold text-right border-r border-slate-800/60',
                              isProfit && 'text-emerald-400 bg-emerald-500/5',
                              isLoss && 'text-rose-400 bg-rose-500/5',
                              !hasSells && 'text-slate-400'
                            )}
                          >
                            {hasSells ? (
                              <>
                                {returnsInr > 0 ? '+' : ''}
                                {formatCurrency(returnsInr)}
                              </>
                            ) : (
                              <span className="text-slate-500 font-normal italic">Open Pos</span>
                            )}
                          </td>

                          {/* Realized Returns (%) */}
                          <td
                            className={clsx(
                              'py-2.5 px-2.5 font-mono font-bold text-right border-r border-slate-800/60',
                              isProfit && 'text-emerald-400',
                              isLoss && 'text-rose-400',
                              !hasSells && 'text-slate-500 font-normal'
                            )}
                          >
                            {hasSells ? (
                              <span
                                className={clsx(
                                  'text-[10px] px-1.5 py-0.5 rounded font-mono',
                                  isProfit &&
                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                                  isLoss &&
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                )}
                              >
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
                              {/* Partial Sell Button */}
                              {remainingQty > 0 && (
                                <button
                                  onClick={() => handleOpenPartialSellModal(trade)}
                                  className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-900/50 transition"
                                  title="Record Partial / Full Sell"
                                >
                                  <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Partial Buy Button */}
                              {remainingQty > 0 && (
                                <button
                                  onClick={() => handleOpenPartialBuyModal(trade)}
                                  className="p-1 rounded text-blue-400 hover:text-white hover:bg-blue-900/50 transition"
                                  title="Add Buy (Accumulate)"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Legs History */}
                              <button
                                onClick={() => setLegsHistoryTarget(trade)}
                                className="p-1 rounded text-indigo-400 hover:text-white hover:bg-indigo-900/50 transition"
                                title="View Execution Legs"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

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

            {/* Pagination Controls */}
            {totalItems > PAGE_SIZE && (
              <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 text-[11px] font-mono text-center sm:text-left">
                  Showing <span className="text-white font-semibold">{startIndex + 1}</span>–
                  <span className="text-white font-semibold">
                    {Math.min(startIndex + PAGE_SIZE, totalItems)}
                  </span>{' '}
                  of <span className="text-white font-semibold">{totalItems}</span> entries (Page{' '}
                  {safePage} of {totalPages})
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

  // If in Deep Analysis View Mode, render TradingAnalysis (unconditionally placed after all hooks)
  if (viewMode === 'analysis') {
    return <TradingAnalysis trades={trades} onBack={() => setViewMode('journal')} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-sans selection:bg-cyan-500 selection:text-white max-w-full overflow-hidden">
      {/* 1. Header Banner with "Analyze >" Page Redirection */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    Live Analytics & Durations
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                    Current Active: {formatCurrency(masterStats.totalCurrentInvested)}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                  Holding period tracking, P&L sorting, active capital & multi-leg execution ledger
                </p>
              </div>
            </div>

            {/* Action Buttons: Export + Analyze > + Stock Trade + Intraday (Responsive 2x2 on Mobile, Flex on Desktop) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => exportTradesToExcel(trades)}
                title="Download entire Trading Journal & Ledger in Excel (.xlsx)"
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-[11px] sm:text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 truncate"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Export Excel</span>
              </button>

              <button
                onClick={() => setViewMode('analysis')}
                className="py-2 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-indigo-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 truncate"
                title="Open Comprehensive Trade Analytics & Strategy Matrix"
              >
                <PieChart className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Analyze &gt;</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('stock')}
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-blue-600/25 transition active:scale-95 flex items-center justify-center gap-1 truncate"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"> Stock</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('intraday')}
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-cyan-600/25 transition active:scale-95 flex items-center justify-center gap-1 truncate"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"> Intraday</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Master Dashboard - 4 Summary Cards */}
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
          <div
            className={clsx(
              'text-lg sm:text-2xl font-black font-mono tracking-tight truncate',
              masterStats.stockTotalPl > 0 && 'text-emerald-400',
              masterStats.stockTotalPl < 0 && 'text-rose-400',
              masterStats.stockTotalPl === 0 && 'text-slate-200'
            )}
          >
            {masterStats.stockTotalPl > 0 ? '+' : ''}
            {formatCurrency(masterStats.stockTotalPl)}
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 flex items-center justify-between gap-1 truncate font-mono">
            <span className="text-emerald-400 font-semibold" title="Currently deployed in open/unsold positions">
              Current: {formatCurrency(masterStats.stockCurrentInvested)}
            </span>
            <span className="text-slate-500" title="Total lifetime buy capital deployed">
              Total: {formatCurrency(masterStats.stockInvested)}
            </span>
          </div>
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
          <div
            className={clsx(
              'text-lg sm:text-2xl font-black font-mono tracking-tight truncate',
              masterStats.intradayTotalPl > 0 && 'text-emerald-400',
              masterStats.intradayTotalPl < 0 && 'text-rose-400',
              masterStats.intradayTotalPl === 0 && 'text-slate-200'
            )}
          >
            {masterStats.intradayTotalPl > 0 ? '+' : ''}
            {formatCurrency(masterStats.intradayTotalPl)}
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 flex items-center justify-between gap-1 truncate font-mono">
            <span className="text-cyan-400 font-semibold" title="Currently deployed in open intraday positions">
              Current: {formatCurrency(masterStats.intradayCurrentInvested)}
            </span>
            <span className="text-slate-500" title="Total lifetime intraday capital">
              Total: {formatCurrency(masterStats.intradayInvested)}
            </span>
          </div>
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
          <div
            className={clsx(
              'text-lg sm:text-2xl font-black font-mono tracking-tight truncate',
              masterStats.netOverallPl > 0 && 'text-emerald-400',
              masterStats.netOverallPl < 0 && 'text-rose-400',
              masterStats.netOverallPl === 0 && 'text-slate-200'
            )}
          >
            {masterStats.netOverallPl > 0 ? '+' : ''}
            {formatCurrency(masterStats.netOverallPl)}
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 flex items-center justify-between gap-1 truncate font-mono">
            <span className="text-emerald-400 font-semibold" title="Total active capital across all open positions">
              Active: {formatCurrency(masterStats.totalCurrentInvested)}
            </span>
            <span className="text-slate-500" title="Total cumulative capital deployed">
              Total: {formatCurrency(masterStats.totalInvested)}
            </span>
          </div>
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
          <p className="text-[9px] sm:text-[11px] text-slate-400 truncate font-mono">
            Stock: {formatCurrency(masterStats.stockCharges)} • Intra: {formatCurrency(masterStats.intradayCharges)}
          </p>
        </div>
      </div>

      {/* 3. Filter & Sort Bar (Cleaned Month filter, added Analyze shortcut) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-slate-900/80 p-2.5 sm:p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
          {/* Sort Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="latest" className="bg-slate-900">Date: Latest First</option>
              <option value="profit_desc" className="bg-slate-900 font-semibold text-emerald-400">
                🔥 Highest Profit (Descending)
              </option>
              <option value="loss_desc" className="bg-slate-900 font-semibold text-rose-400">
                ⚠️ Highest Loss First (Ascending)
              </option>
              <option value="returns_pct_desc" className="bg-slate-900">
                📈 Highest Return %
              </option>
              <option value="holding_desc" className="bg-slate-900">
                ⏳ Longest Holding Duration
              </option>
              <option value="holding_asc" className="bg-slate-900">
                ⚡ Shortest Holding Duration
              </option>
            </select>
          </div>

          {/* Search Box */}
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

        {/* Tab Switcher & Analysis Shortcut Link */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition text-center truncate',
                activeTab === 'all' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              All ({trades.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={clsx(
                'py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 truncate',
                activeTab === 'stock' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-300'
              )}
            >
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span className="truncate">Stocks ({stockTrades.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('intraday')}
              className={clsx(
                'py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 truncate',
                activeTab === 'intraday' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-cyan-300'
              )}
            >
              <Zap className="w-3 h-3 shrink-0" />
              <span className="truncate">Intraday ({intradayTrades.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Notion-style Data Grids + Mobile Cards */}
      <div className="space-y-4 sm:space-y-6">
        {(activeTab === 'all' || activeTab === 'stock') &&
          renderNotionTradeGrid({
            tradeList: stockTrades,
            title: 'Stocks Journal (Delivery / Positional)',
            typeBadgeColor: 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-600/30',
            iconComponent: TrendingUp,
            isExpanded: isStockExpanded,
            onToggleExpand: () => setIsStockExpanded((prev) => !prev),
            currentPage: stockPage,
            onPageChange: (p) => setStockPage(p)
          })}

        {(activeTab === 'all' || activeTab === 'intraday') &&
          renderNotionTradeGrid({
            tradeList: intradayTrades,
            title: 'Intraday Journal (Momentum & Scalps)',
            typeBadgeColor: 'bg-gradient-to-tr from-cyan-600 to-teal-600 shadow-cyan-600/30',
            iconComponent: Zap,
            isExpanded: isIntradayExpanded,
            onToggleExpand: () => setIsIntradayExpanded((prev) => !prev),
            currentPage: intradayPage,
            onPageChange: (p) => setIntradayPage(p)
          })}
      </div>

      {/* ================= ADD / EDIT FULL TRADE MODAL ================= */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full p-3.5 sm:p-6 shadow-2xl space-y-3.5 max-h-[92vh] flex flex-col relative z-[100000] my-auto overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0 gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <div
                    className={clsx(
                      'p-1.5 sm:p-2 rounded-xl text-white shadow-md shrink-0',
                      formTradeType === 'intraday'
                        ? 'bg-cyan-600 shadow-cyan-600/30'
                        : 'bg-blue-600 shadow-blue-600/30'
                    )}
                  >
                    {formTradeType === 'intraday' ? (
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-base font-bold text-white truncate">
                      {editingTrade
                        ? 'Edit Trade'
                        : formTradeType === 'intraday'
                        ? 'Log Intraday'
                        : 'Log Stock Trade'}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                      Support for partial buy averaging & scaling out
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle Simple vs Multi-Leg Mode */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalMode('simple')}
                      className={clsx(
                        'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] font-bold transition',
                        modalMode === 'simple' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode('multileg')}
                      className={clsx(
                        'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] font-bold transition flex items-center gap-0.5 sm:gap-1',
                        modalMode === 'multileg' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <Split className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>Multi-Leg</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveTrade} className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-slate-700">
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

                {/* MODE A: Simple Single Entry */}
                {modalMode === 'simple' && (
                  <div className="space-y-3">
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
                        <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Receipt className="w-3 h-3 text-amber-400" />
                            <span>Charges (₹)</span>
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold" title="Auto calculated from Brokerage, STT, Exchange, SEBI, GST, Stamp Duty & DP charges">
                            Auto ⚡
                          </span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={formCharges}
                          onChange={(e) => setFormCharges(e.target.value)}
                          className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                        />
                      </div>
                    </div>

                    {/* Simple Exit Toggle */}
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
                            Trade is Fully Closed / Exited
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
                  </div>
                )}

                {/* MODE B: Multi-Leg Partial Buy & Sell Builder */}
                {modalMode === 'multileg' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Split className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Execution Legs (Partial Buys & Sells)</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddFormLeg('BUY')}
                          className="px-2 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-500/40 text-[10px] font-bold hover:bg-blue-900 flex items-center gap-1 transition"
                        >
                          <PlusCircle className="w-3 h-3 text-blue-400" />
                          <span>+ Buy Leg</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddFormLeg('SELL')}
                          className="px-2 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold hover:bg-cyan-900 flex items-center gap-1 transition"
                        >
                          <MinusCircle className="w-3 h-3 text-cyan-400" />
                          <span>+ Sell Leg</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {formLegs.map((leg, idx) => (
                        <div
                          key={leg.id}
                          className={clsx(
                            'p-2.5 rounded-xl border space-y-2 text-xs transition',
                            leg.type === 'BUY'
                              ? 'bg-blue-950/25 border-blue-500/30'
                              : 'bg-cyan-950/25 border-cyan-500/30'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={clsx(
                                  'text-[9px] font-bold px-1.5 py-0.2 rounded font-mono',
                                  leg.type === 'BUY'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-cyan-500/20 text-cyan-300'
                                )}
                              >
                                #{idx + 1} {leg.type}
                              </span>
                              <input
                                type="date"
                                value={leg.date}
                                onChange={(e) => handleUpdateFormLeg(leg.id, 'date', e.target.value)}
                                className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono text-white focus:outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFormLeg(leg.id)}
                              className="text-slate-500 hover:text-rose-400 p-0.5"
                              title="Remove this leg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Price (₹)</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                required
                                value={leg.price}
                                onChange={(e) => handleUpdateFormLeg(leg.id, 'price', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono font-bold text-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block">Quantity</span>
                              <input
                                type="number"
                                min="1"
                                required
                                placeholder="1"
                                value={leg.quantity}
                                onChange={(e) => handleUpdateFormLeg(leg.id, 'quantity', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block">Charges (₹)</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="20"
                                value={leg.charges}
                                onChange={(e) => handleUpdateFormLeg(leg.id, 'charges', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Leg note (e.g. 50% target, dip buy)..."
                            value={leg.notes}
                            onChange={(e) => handleUpdateFormLeg(leg.id, 'notes', e.target.value)}
                            className="w-full px-2 py-0.5 bg-slate-950/80 border border-slate-800/80 rounded text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Calculation Summary Box */}
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Avg Buy</span>
                    <span className="font-bold text-blue-300">
                      {formatCurrency(formPreviewMetrics.avgBuyPrice)} ({formPreviewMetrics.totalBuyQty} Qty)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sold / Open</span>
                    <span className="font-bold text-amber-300">
                      {formPreviewMetrics.totalSellQty} Sold • {formPreviewMetrics.remainingQty} Open
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Realized P&L</span>
                    <span
                      className={clsx(
                        'font-bold',
                        formPreviewMetrics.realizedPnl > 0 && 'text-emerald-400',
                        formPreviewMetrics.realizedPnl < 0 && 'text-rose-400',
                        !formPreviewMetrics.realizedPnl && 'text-slate-400'
                      )}
                    >
                      {formPreviewMetrics.realizedPnl !== null
                        ? `${formPreviewMetrics.realizedPnl > 0 ? '+' : ''}${formatCurrency(
                            formPreviewMetrics.realizedPnl
                          )}`
                        : 'Open'}
                    </span>
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
                      {formTradeDecision === 'Custom / Other...'
                        ? 'Type Custom Decision *'
                        : 'Custom Tag (Optional)'}
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

                {/* Strategy Notes */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Strategy Notes / Trade Rationale (Optional)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Scaling in 50% on breakout, added 50% on pullback..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
                  <button
                    type="button"
                    disabled={isSubmittingTrade}
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTrade}
                    className={clsx(
                      'px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-lg active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
                      formTradeType === 'intraday'
                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-600/30'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                    )}
                  >
                    {isSubmittingTrade && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isSubmittingTrade
                        ? 'Saving...'
                        : editingTrade
                        ? 'Save Changes'
                        : 'Record Trade'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ================= QUICK PARTIAL SELL / EXIT MODAL ================= */}
      {partialSellTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setPartialSellTarget(null);
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
                  <MinusCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white">Record Partial / Full Sell</h4>
                  <p className="text-xs text-slate-400 truncate">
                    {partialSellTarget.assetName} (Avg Buy:{' '}
                    {formatCurrency(calculateTradeMetrics(partialSellTarget).avgBuyPrice)})
                  </p>
                </div>
              </div>

              {/* Remaining Shares Indicator */}
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Available to Sell:</span>
                <span className="font-bold text-cyan-300">
                  {calculateTradeMetrics(partialSellTarget).remainingQty} Shares
                </span>
              </div>

              <form onSubmit={handleSubmitPartialSell} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sell / Exit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={partialSellDate}
                    onChange={(e) => setPartialSellDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Quantity to Sell <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={calculateTradeMetrics(partialSellTarget).remainingQty || 1}
                      required
                      value={partialSellQty}
                      onChange={(e) => setPartialSellQty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                      autoFocus
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
                      value={partialSellPrice}
                      onChange={(e) => setPartialSellPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Charges (₹)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold" title="Auto calculated from Brokerage, STT, Exchange, SEBI, GST, Stamp Duty & DP charges">
                        Auto ⚡
                      </span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={partialSellCharges}
                      onChange={(e) => setPartialSellCharges(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Reason / Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Target 1"
                      value={partialSellNotes}
                      onChange={(e) => setPartialSellNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Partial Gain Preview */}
                {partialSellQty && partialSellPrice && (
                  <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-slate-400">Slice Gain:</span>
                    {(() => {
                      const qty = parseInt(partialSellQty, 10) || 0;
                      const p = parseFloat(partialSellPrice) || 0;
                      const avgB = calculateTradeMetrics(partialSellTarget).avgBuyPrice;
                      const chg = parseFloat(partialSellCharges) || 0;
                      const slicePnl = qty * p - qty * avgB - chg;
                      return (
                        <span
                          className={clsx(
                            'font-bold',
                            slicePnl > 0 ? 'text-emerald-400' : slicePnl < 0 ? 'text-rose-400' : 'text-slate-300'
                          )}
                        >
                          {slicePnl > 0 ? '+' : ''}
                          {formatCurrency(slicePnl)}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingPartialSell}
                    onClick={() => setPartialSellTarget(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPartialSell}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingPartialSell && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingPartialSell ? 'Executing Sell...' : 'Confirm Sell Leg'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ================= QUICK PARTIAL BUY (ACCUMULATE) MODAL ================= */}
      {partialBuyTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingPartialBuy) setPartialBuyTarget(null);
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-blue-500/30 rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto relative z-[100000]"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white">Add Buy Quantity (Averaging)</h4>
                  <p className="text-xs text-slate-400 truncate">
                    {partialBuyTarget.assetName} (Current Avg:{' '}
                    {formatCurrency(calculateTradeMetrics(partialBuyTarget).avgBuyPrice)})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitPartialBuy} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Buy Date
                  </label>
                  <input
                    type="date"
                    required
                    value={partialBuyDate}
                    onChange={(e) => setPartialBuyDate(e.target.value)}
                    disabled={isSubmittingPartialBuy}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Add Quantity <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="1"
                      value={partialBuyQty}
                      onChange={(e) => setPartialBuyQty(e.target.value)}
                      disabled={isSubmittingPartialBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Buy Price (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={partialBuyPrice}
                      onChange={(e) => setPartialBuyPrice(e.target.value)}
                      disabled={isSubmittingPartialBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Charges (₹)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold" title="Auto calculated from Brokerage, STT, Exchange, SEBI, GST, Stamp Duty & DP charges">
                        Auto ⚡
                      </span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={partialBuyCharges}
                      onChange={(e) => setPartialBuyCharges(e.target.value)}
                      disabled={isSubmittingPartialBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Reason / Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dip Buy"
                      value={partialBuyNotes}
                      onChange={(e) => setPartialBuyNotes(e.target.value)}
                      disabled={isSubmittingPartialBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* New Average Price Preview */}
                {partialBuyQty && partialBuyPrice && (
                  <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-slate-400">New Avg Price:</span>
                    {(() => {
                      const curMetrics = calculateTradeMetrics(partialBuyTarget);
                      const addQty = parseInt(partialBuyQty, 10) || 0;
                      const addPrice = parseFloat(partialBuyPrice) || 0;
                      const totalQ = curMetrics.totalBuyQty + addQty;
                      const totalC = curMetrics.invested + addQty * addPrice;
                      const newAvg = totalQ > 0 ? totalC / totalQ : 0;
                      return (
                        <span className="font-bold text-blue-300">
                          {formatCurrency(newAvg)} ({totalQ} Total Qty)
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingPartialBuy}
                    onClick={() => setPartialBuyTarget(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPartialBuy}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingPartialBuy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingPartialBuy ? 'Executing Buy...' : 'Confirm Buy Leg'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ================= TRADE EXECUTION LEGS BREAKDOWN MODAL ================= */}
      {legsHistoryTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setLegsHistoryTarget(null);
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col my-auto relative z-[100000]"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {legsHistoryTarget.assetName} • Execution Breakdown
                    </h3>
                    <p className="text-xs text-slate-400">
                      Timeline of all partial buy & sell execution slices
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setLegsHistoryTarget(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Header */}
              {(() => {
                const metrics = calculateTradeMetrics(legsHistoryTarget);
                return (
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Avg Buy Price</span>
                      <span className="font-bold text-blue-300">
                        {formatCurrency(metrics.avgBuyPrice)} ({metrics.totalBuyQty} Qty)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sold / Open</span>
                      <span className="font-bold text-amber-300">
                        {metrics.totalSellQty} Sold • {metrics.remainingQty} Open
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Realized P&L</span>
                      <span
                        className={clsx(
                          'font-bold',
                          metrics.returnsInr > 0 && 'text-emerald-400',
                          metrics.returnsInr < 0 && 'text-rose-400',
                          !metrics.returnsInr && 'text-slate-400'
                        )}
                      >
                        {metrics.returnsInr !== null
                          ? `${metrics.returnsInr > 0 ? '+' : ''}${formatCurrency(metrics.returnsInr)}`
                          : 'Open'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Timeline List of Legs */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {calculateTradeMetrics(legsHistoryTarget).legs.map((leg, i) => {
                  const isBuy = leg.type === 'BUY';
                  const p = parseFloat(leg.price) || 0;
                  const q = parseInt(leg.quantity, 10) || 0;
                  const val = p * q;
                  const chg = parseFloat(leg.charges) || 0;

                  return (
                    <div
                      key={leg.id || i}
                      className={clsx(
                        'p-3 rounded-xl border space-y-1.5 font-mono text-xs',
                        isBuy ? 'bg-blue-950/20 border-blue-500/30' : 'bg-cyan-950/20 border-cyan-500/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              'text-[9px] font-bold px-2 py-0.5 rounded',
                              isBuy ? 'bg-blue-500/20 text-blue-300' : 'bg-cyan-500/20 text-cyan-300'
                            )}
                          >
                            Leg #{i + 1} • {leg.type}
                          </span>
                          <span className="text-slate-400 text-[11px]">{formatDate(leg.date)}</span>
                        </div>

                        <span className="font-bold text-white">
                          {q} Qty @ {formatCurrency(p)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>Total: {formatCurrency(val)} {chg > 0 ? `(Fee: ${formatCurrency(chg)})` : ''}</span>
                        {leg.notes && <span className="text-slate-300 italic">{leg.notes}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const t = legsHistoryTarget;
                    setLegsHistoryTarget(null);
                    handleOpenEditModal(t);
                  }}
                  className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit in Full Form</span>
                </button>

                <button
                  onClick={() => setLegsHistoryTarget(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {deleteTarget &&
        typeof document !== 'undefined' &&
        createPortal(
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
