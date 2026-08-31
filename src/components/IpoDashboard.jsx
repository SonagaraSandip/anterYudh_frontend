import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Plus,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Edit2,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Smartphone,
  Calendar,
  Users
} from 'lucide-react';

const API_BASE = '/api/ipos';

// Helper for case-insensitive and whitespace-safe person comparison
const isSamePerson = (p1, p2) =>
  String(p1 || '').trim().toLowerCase() === String(p2 || '').trim().toLowerCase();

export default function IpoDashboard({ isEmbedded = false }) {
  const [ipos, setIpos] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'spreadsheet' or 'cards'
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 4; // Mobile default max 4 entries
    }
    return 10; // Web default max 10 entries
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Mobile accordion / collapsible dropdown state for IPO cards
  const [expandedIpoIds, setExpandedIpoIds] = useState(new Set());

  const toggleIpoExpand = (id) => {
    setExpandedIpoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllIpos = () => {
    setExpandedIpoIds(new Set(paginatedIpos.map((i) => i.id)));
  };

  const collapseAllIpos = () => {
    setExpandedIpoIds(new Set());
  };

  // Modals & form state
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  
  // Confirmation modal state before unchecking Allotted
  const [unallotConfirmModal, setUnallotConfirmModal] = useState(null);

  // Inline editing state
  const [editingProfitLossId, setEditingProfitLossId] = useState(null);
  const [profitLossInput, setProfitLossInput] = useState('');
  const [editingLotCostId, setEditingLotCostId] = useState(null);
  const [lotCostInput, setLotCostInput] = useState('');

  const [newIpoData, setNewIpoData] = useState({
    ipoName: '',
    lotCost: '',
    notes: '',
    profitLoss: '',
    status: 'applied',
    createdAt: new Date().toISOString().split('T')[0]
  });

  // Fetch IPOs from Backend via Axios
  const fetchIpos = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await axios.get(API_BASE);
      if (Array.isArray(response.data)) {
        // Map applications to ensure clean boolean applied / allotted flags
        const cleanIpos = response.data.map((ipo) => ({
          ...ipo,
          applications: (ipo.applications || []).map((app) => ({
            ...app,
            applied: Boolean(app.applied),
            allotted: Boolean(app.allotted)
          }))
        }));
        setIpos(cleanIpos);

        // Extract and combine unique person names (case-insensitive deduplication)
        let savedPersons = [];
        try {
          savedPersons = JSON.parse(localStorage.getItem('antaryudh_demat_persons') || '[]');
        } catch {
          savedPersons = [];
        }

        const personMap = new Map();
        const addPersonToMap = (name) => {
          if (name && typeof name === 'string' && name.trim()) {
            const key = name.trim().toLowerCase();
            if (!personMap.has(key)) {
              personMap.set(key, name.trim());
            }
          }
        };

        if (Array.isArray(savedPersons)) {
          savedPersons.forEach(addPersonToMap);
        }
        cleanIpos.forEach((ipo) => {
          (ipo.applications || []).forEach((app) => {
            addPersonToMap(app.personName);
          });
        });

        const combinedList = Array.from(personMap.values());
        setPersons(combinedList);
        localStorage.setItem('antaryudh_demat_persons', JSON.stringify(combinedList));
      } else {
        setIpos([]);
      }
    } catch (err) {
      console.warn('Backend /api/ipos not reachable:', err.message);
      setErrorMsg('Cannot connect to backend server. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load initial cached persons if available
    try {
      const cached = JSON.parse(localStorage.getItem('antaryudh_demat_persons') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        setPersons(cached);
      }
    } catch {}
    fetchIpos();
  }, []);

  // Reset to page 1 whenever filter, search query, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, pageSize]);

  // Handle Escape key to close open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddIpoOpen(false);
        setIsAddPersonOpen(false);
        setUnallotConfirmModal(null);
      }
    };
    if (isAddIpoOpen || isAddPersonOpen || unallotConfirmModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddIpoOpen, isAddPersonOpen, unallotConfirmModal]);

  // Sync Person List across all local IPOs
  const ensurePersonAcrossIpos = (personName) => {
    setIpos((prevIpos) =>
      prevIpos.map((ipo) => {
        const hasPerson = (ipo.applications || []).some((a) => isSamePerson(a.personName, personName));
        if (!hasPerson) {
          return {
            ...ipo,
            applications: [
              ...(ipo.applications || []),
              { ipoId: ipo.id, personName, applied: false, allotted: false, notes: '' }
            ]
          };
        }
        return ipo;
      })
    );
  };

  // Add a new dynamic Person Column
  const handleAddPerson = (e) => {
    e.preventDefault();
    const trimmed = newPersonName.trim();
    if (!trimmed) return;

    if (!persons.some((p) => isSamePerson(p, trimmed))) {
      const updatedPersons = [...persons, trimmed];
      setPersons(updatedPersons);
      localStorage.setItem('antaryudh_demat_persons', JSON.stringify(updatedPersons));
      ensurePersonAcrossIpos(trimmed);
    }
    setNewPersonName('');
    setIsAddPersonOpen(false);
  };

  // Toggle Applied or Allotted status with optimistic UI update and Backend Sync
  const handleToggleApplication = async (ipoId, personName, field) => {
    // 1. Calculate the next application state synchronously from current state
    const targetIpo = ipos.find((i) => i.id === ipoId);
    const currentApps = targetIpo?.applications || [];
    const existingApp = currentApps.find((a) => isSamePerson(a.personName, personName));

    const curVal = Boolean(existingApp ? existingApp[field] : false);
    const newVal = !curVal;

    let nextApplied = Boolean(existingApp?.applied);
    let nextAllotted = Boolean(existingApp?.allotted);

    if (field === 'applied') {
      nextApplied = newVal;
      if (!newVal) nextAllotted = false;
    } else if (field === 'allotted') {
      nextAllotted = newVal;
      if (newVal) nextApplied = true;
    }

    const payloadApp = {
      ipoId,
      personName: existingApp?.personName || personName,
      applied: nextApplied,
      allotted: nextAllotted,
      notes: existingApp?.notes || ''
    };

    // 2. Optimistic UI update
    setIpos((prevIpos) =>
      prevIpos.map((ipo) => {
        if (ipo.id !== ipoId) return ipo;

        const apps = [...(ipo.applications || [])];
        const appIdx = apps.findIndex((a) => isSamePerson(a.personName, personName));

        if (appIdx >= 0) {
          apps[appIdx] = {
            ...apps[appIdx],
            applied: nextApplied,
            allotted: nextAllotted
          };
        } else {
          apps.push(payloadApp);
        }

        return { ...ipo, applications: apps };
      })
    );

    // 3. Guaranteed backend database sync
    try {
      const res = await axios.post(`${API_BASE}/${ipoId}/application`, {
        personName: payloadApp.personName,
        applied: payloadApp.applied,
        allotted: payloadApp.allotted,
        notes: payloadApp.notes
      });

      if (res.data) {
        setIpos((prevIpos) =>
          prevIpos.map((ipo) => {
            if (ipo.id !== ipoId) return ipo;
            const apps = (ipo.applications || []).map((a) =>
              isSamePerson(a.personName, personName)
                ? {
                    ...a,
                    applied: Boolean(res.data.applied),
                    allotted: Boolean(res.data.allotted),
                    notes: res.data.notes !== undefined ? res.data.notes : a.notes
                  }
                : a
            );
            return { ...ipo, applications: apps };
          })
        );
      }
    } catch (err) {
      console.error('Failed to update application on backend:', err);
      // Rollback on failure
      if (targetIpo) {
        setIpos((prevIpos) =>
          prevIpos.map((ipo) => (ipo.id === ipoId ? targetIpo : ipo))
        );
      }
    }
  };

  // Handle Allotted Toggle with Confirmation before Unmarking
  const handleToggleAllottedWithConfirm = (ipo, personName, currentAllotted) => {
    if (currentAllotted) {
      // Currently allotted -> prompt confirmation dialog before unmarking
      setUnallotConfirmModal({
        ipoId: ipo.id,
        ipoName: ipo.ipoName,
        personName,
        profitLoss: parseFloat(ipo.profitLoss) || 0,
        lotCost: parseFloat(ipo.lotCost) || 0
      });
    } else {
      // Currently not allotted -> check as allotted directly
      handleToggleApplication(ipo.id, personName, 'allotted');
    }
  };

  // Update Person application notes with backend sync
  const handleUpdatePersonNotes = async (ipoId, personName, notes) => {
    const targetIpo = ipos.find((i) => i.id === ipoId);
    const existingApp = (targetIpo?.applications || []).find((a) =>
      isSamePerson(a.personName, personName)
    );

    // 1. Optimistic update
    setIpos((prevIpos) =>
      prevIpos.map((ipo) => {
        if (ipo.id !== ipoId) return ipo;
        const apps = (ipo.applications || []).map((a) => {
          if (isSamePerson(a.personName, personName)) {
            return { ...a, notes };
          }
          return a;
        });
        return { ...ipo, applications: apps };
      })
    );

    // 2. Guaranteed backend sync
    try {
      await axios.post(`${API_BASE}/${ipoId}/application`, {
        personName: existingApp?.personName || personName,
        applied: Boolean(existingApp?.applied),
        allotted: Boolean(existingApp?.allotted),
        notes: notes
      });
    } catch (err) {
      console.error('Failed to sync application notes:', err);
    }
  };

  // Start editing Lot Cost (clears 0 so user types directly)
  const handleStartEditLotCost = (ipo) => {
    setEditingLotCostId(ipo.id);
    const cur = parseFloat(ipo.lotCost) || 0;
    setLotCostInput(cur === 0 ? '' : cur.toString());
  };

  // Save edited Lot Cost to backend
  const handleSaveLotCost = async (ipoId) => {
    const val = parseFloat(lotCostInput) || 0;
    setIpos((prev) =>
      prev.map((ipo) => (ipo.id === ipoId ? { ...ipo, lotCost: val } : ipo))
    );
    setEditingLotCostId(null);

    try {
      await axios.put(`${API_BASE}/${ipoId}`, { lotCost: val });
    } catch (err) {
      console.error('Failed to update lot cost on backend:', err);
      fetchIpos();
    }
  };

  // Start editing Profit / Loss (clears 0 so user types directly)
  const handleStartEditProfitLoss = (ipo) => {
    setEditingProfitLossId(ipo.id);
    const cur = parseFloat(ipo.profitLoss) || 0;
    setProfitLossInput(cur === 0 ? '' : cur.toString());
  };

  // Save edited Profit / Loss to backend
  const handleSaveProfitLoss = async (ipoId) => {
    const val = parseFloat(profitLossInput) || 0;
    setIpos((prev) =>
      prev.map((ipo) => (ipo.id === ipoId ? { ...ipo, profitLoss: val } : ipo))
    );
    setEditingProfitLossId(null);

    try {
      await axios.put(`${API_BASE}/${ipoId}`, { profitLoss: val });
    } catch (err) {
      console.error('Failed to update profit/loss on backend:', err);
      fetchIpos();
    }
  };

  // Create a new IPO row
  const handleCreateIpo = async (e) => {
    e.preventDefault();
    if (!newIpoData.ipoName.trim()) return;

    try {
      const payload = {
        ipoName: newIpoData.ipoName.trim(),
        lotCost: parseFloat(newIpoData.lotCost) || 0,
        notes: newIpoData.notes || '',
        profitLoss: parseFloat(newIpoData.profitLoss) || 0,
        status: newIpoData.status || 'applied',
        createdAt: newIpoData.createdAt || new Date().toISOString().split('T')[0],
        applications: persons.map((p) => ({
          personName: p,
          applied: false,
          allotted: false,
          notes: ''
        }))
      };

      const response = await axios.post(API_BASE, payload);
      if (response.data) {
        setIpos([response.data, ...ipos]);
      } else {
        await fetchIpos();
      }

      setNewIpoData({
        ipoName: '',
        lotCost: '',
        notes: '',
        profitLoss: '',
        status: 'applied',
        createdAt: new Date().toISOString().split('T')[0]
      });
      setIsAddIpoOpen(false);
    } catch (err) {
      console.error('Failed to create IPO entry:', err);
      setErrorMsg('Failed to create IPO on backend server.');
    }
  };

  // Delete an IPO row
  const handleDeleteIpo = async (ipoId) => {
    if (!window.confirm('Are you sure you want to delete this IPO entry?')) return;

    const prevList = [...ipos];
    setIpos(ipos.filter((i) => i.id !== ipoId));

    try {
      await axios.delete(`${API_BASE}/${ipoId}`);
    } catch (err) {
      console.error('Failed to delete IPO:', err);
      setIpos(prevList);
    }
  };

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  };

  // Calculate individual IPO profit/loss percentage
  const calculateIpoPercentage = (ipo) => {
    const pl = parseFloat(ipo.profitLoss) || 0;
    const lotCost = parseFloat(ipo.lotCost) || 0;

    let allottedLots = 0;
    (ipo.applications || []).forEach((app) => {
      if (app.allotted) allottedLots += 1;
    });

    const totalCost = (allottedLots > 0 ? allottedLots : 1) * lotCost;

    if (totalCost <= 0) return null;
    return (pl / totalCost) * 100;
  };

  // Computed summary stats
  const stats = useMemo(() => {
    let totalProfitLoss = 0;
    let totalAppliedCount = 0;
    let totalAllottedCount = 0;
    let totalInvestedCost = 0;

    ipos.forEach((ipo) => {
      const pl = parseFloat(ipo.profitLoss) || 0;
      const lc = parseFloat(ipo.lotCost) || 0;
      totalProfitLoss += pl;

      let ipoAllottedLots = 0;
      (ipo.applications || []).forEach((app) => {
        if (app.applied) totalAppliedCount += 1;
        if (app.allotted) {
          totalAllottedCount += 1;
          ipoAllottedLots += 1;
        }
      });

      if (ipoAllottedLots > 0 && lc > 0) {
        totalInvestedCost += lc * ipoAllottedLots;
      } else if (pl !== 0 && lc > 0) {
        totalInvestedCost += lc;
      }
    });

    const allotmentRate =
      totalAppliedCount > 0
        ? ((totalAllottedCount / totalAppliedCount) * 100).toFixed(1)
        : '0.0';

    const overallProfitPercent =
      totalInvestedCost > 0
        ? ((totalProfitLoss / totalInvestedCost) * 100).toFixed(1)
        : null;

    return {
      totalProfitLoss,
      totalAppliedCount,
      totalAllottedCount,
      allotmentRate,
      totalInvestedCost,
      overallProfitPercent
    };
  }, [ipos]);

  // Filtered and Sorted IPO list (Latest added first)
  const filteredIpos = useMemo(() => {
    return ipos
      .filter((ipo) => {
        const matchesSearch =
          (ipo.ipoName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ipo.notes && ipo.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filterStatus === 'all') return matchesSearch;
        if (filterStatus === 'allotted') {
          const hasAllotment = (ipo.applications || []).some((a) => a.allotted);
          return matchesSearch && hasAllotment;
        }
        if (filterStatus === 'applied') {
          const hasApplied = (ipo.applications || []).some((a) => a.applied);
          return matchesSearch && hasApplied;
        }
        return matchesSearch && ipo.status === filterStatus;
      })
      .sort((a, b) => {
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
  }, [ipos, searchQuery, filterStatus]);

  // Pagination slicing (Max entries per page based on pageSize)
  const totalPages = Math.ceil(filteredIpos.length / pageSize) || 1;
  const paginatedIpos = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredIpos.slice(startIndex, startIndex + pageSize);
  }, [filteredIpos, currentPage, pageSize]);

  // Currency Formatter
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className={isEmbedded ? "space-y-4 sm:space-y-6 animate-fadeIn font-sans" : "min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans"}>
      {/* IPO Sub-Header & Controls with Vibrant Accents */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl shadow-lg shadow-cyan-500/20 text-white shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    IPO Demat Matrix
                  </h2>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-medium border border-cyan-500/20">
                    Live DB
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  Multi-Account Demat Application & Allotment Manager ({pageSize} items per page)
                </p>
              </div>
            </div>

            {/* Mobile View Toggle */}
            <div className="flex md:hidden items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode('spreadsheet')}
                className={`p-1.5 rounded ${viewMode === 'spreadsheet' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                title="Spreadsheet Grid View"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                title="Mobile Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsAddPersonOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <span> Add Person</span>
            </button>

            <button
              onClick={() => setIsAddIpoOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span> Add IPO</span>
            </button>

            <button
              onClick={fetchIpos}
              title="Refresh Data"
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all active:rotate-180 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 sm:space-y-6">
        {/* Alert / Offline message */}
        {errorMsg && (
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Top Summary Metrics Cards (Vibrant Color Coding or Loading Skeleton) */}
        {loading && ipos.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded animate-shimmer" />
                  <div className="w-7 h-7 rounded-lg animate-shimmer" />
                </div>
                <div className="h-7 w-28 rounded animate-shimmer" />
                <div className="h-2.5 w-16 rounded animate-shimmer opacity-70" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-medium mb-1">
                <span>Total Realized P&L</span>
                <div className={`p-1 sm:p-1.5 rounded-lg ${stats.totalProfitLoss >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {stats.totalProfitLoss >= 0 ? <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${stats.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.totalProfitLoss > 0 ? '+' : ''}
                {formatCurrency(stats.totalProfitLoss)}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {stats.overallProfitPercent !== null ? (
                  <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    parseFloat(stats.overallProfitPercent) >= 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {parseFloat(stats.overallProfitPercent) > 0 ? '+' : ''}{stats.overallProfitPercent}% Overall ROI
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] text-slate-500">Across all entries</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-medium mb-1">
                <span>Overall Profit % (ROI)</span>
                <div className={`p-1 sm:p-1.5 rounded-lg ${
                  stats.overallProfitPercent !== null && parseFloat(stats.overallProfitPercent) >= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : stats.overallProfitPercent !== null && parseFloat(stats.overallProfitPercent) < 0
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  {stats.overallProfitPercent !== null && parseFloat(stats.overallProfitPercent) >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                stats.overallProfitPercent !== null
                  ? parseFloat(stats.overallProfitPercent) >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : 'text-slate-300'
              }`}>
                {stats.overallProfitPercent !== null ? (
                  <>
                    {parseFloat(stats.overallProfitPercent) > 0 ? '+' : ''}
                    {stats.overallProfitPercent}%
                  </>
                ) : (
                  '0.0%'
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">
                {stats.totalInvestedCost > 0
                  ? `On ${formatCurrency(stats.totalInvestedCost)} capital`
                  : 'Based on Lot Cost'}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-medium mb-1">
                <span>Allotment Rate</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-violet-400">
                {stats.allotmentRate}%
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">
                {stats.totalAllottedCount} allotted / {stats.totalAppliedCount} applied
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-medium mb-1">
                <span>IPOs / Demats</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
                {ipos.length} <span className="text-xs sm:text-sm font-normal text-slate-400">IPOs / {persons.length} Demats</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">Synced to Database</span>
            </div>
          </div>
        )}


        {/* Toolbar: Search, Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-950 px-3 py-1.5 sm:py-2 rounded-lg border border-slate-800 focus-within:border-indigo-500 transition">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by IPO name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All</option>
                <option value="applied" className="bg-slate-900">Applied</option>
                <option value="allotted" className="bg-slate-900">Allotted</option>
                <option value="closed" className="bg-slate-900">Closed</option>
              </select>
            </div>

            {/* Page Size Filter (Default 10 on web, 4 on mobile, with 20, 30, 50 options) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value={4} className="bg-slate-900">4 / page (Mobile)</option>
                <option value={10} className="bg-slate-900">10 / page (Web)</option>
                <option value={20} className="bg-slate-900">20 / page</option>
                <option value={30} className="bg-slate-900">30 / page</option>
                <option value={50} className="bg-slate-900">50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Column Alert if no persons added yet */}
        {persons.length === 0 && (
          <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="text-indigo-200">
              <span className="font-semibold text-white">No person/account columns added yet.</span> Click <strong>+ Add Person</strong> to add your Demat accounts (e.g. Self, Family, HUF).
            </div>
            <button
              onClick={() => setIsAddPersonOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shrink-0 shadow-sm"
            >
              + Add Person Column
            </button>
          </div>
        )}

        {/* 1. Mobile Cards & Dropdown View (Toggleable on small screens) */}
        {viewMode === 'cards' && (
          <div className="block md:hidden space-y-3">
            {/* Mobile Header Bar with Expand/Collapse All */}
            {paginatedIpos.length > 0 && (
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>IPOs ({filteredIpos.length})</span>
                </span>
                <button
                  onClick={() => {
                    const allExpanded = paginatedIpos.every((i) => expandedIpoIds.has(i.id));
                    if (allExpanded) {
                      collapseAllIpos();
                    } else {
                      expandAllIpos();
                    }
                  }}
                  className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 transition active:scale-95 flex items-center gap-1"
                >
                  {paginatedIpos.every((i) => expandedIpoIds.has(i.id)) ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Collapse All</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand All</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {loading && ipos.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-40 rounded animate-shimmer" />
                        <div className="h-3 w-24 rounded animate-shimmer opacity-70" />
                      </div>
                      <div className="h-6 w-16 rounded-lg animate-shimmer" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      <div className="h-8 rounded-lg animate-shimmer" />
                      <div className="h-8 rounded-lg animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredIpos.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm">No IPO entries found.</p>
                <button
                  onClick={() => setIsAddIpoOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline mt-1"
                >
                  + Add New IPO
                </button>
              </div>
            ) : (

              paginatedIpos.map((ipo) => {
                const pl = parseFloat(ipo.profitLoss) || 0;
                const lc = parseFloat(ipo.lotCost) || 0;
                const ipoPercent = calculateIpoPercentage(ipo);
                const isExpanded = expandedIpoIds.has(ipo.id);

                const appliedCount = (ipo.applications || []).filter((a) => a.applied).length;
                const allottedCount = (ipo.applications || []).filter((a) => a.allotted).length;
                const totalDematCount = persons.length;

                return (
                  <div
                    key={ipo.id}
                    className={`bg-slate-900 border rounded-xl p-3.5 shadow-lg transition-all duration-200 ${
                      isExpanded ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row: IPO Name & P&L / Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => toggleIpoExpand(ipo.id)}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-100 text-sm tracking-tight hover:text-cyan-300 transition-colors">
                            {ipo.ipoName}
                          </h3>
                        </div>

                        {/* Lot Cost & Creation Date with Mobile Edit */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {editingLotCostId === ipo.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={lotCostInput}
                                onChange={(e) => setLotCostInput(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLotCost(ipo.id);
                                  if (e.key === 'Escape') setEditingLotCostId(null);
                                }}
                                placeholder="0"
                                autoFocus
                                className="w-20 px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-indigo-500 rounded text-white focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveLotCost(ipo.id)}
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditLotCost(ipo)}
                              className="text-[10px] text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-500/30 px-2 py-0.5 rounded font-mono flex items-center gap-1 transition"
                              title="Tap to edit Lot Cost"
                            >
                              <span>Lot: {lc > 0 ? formatCurrency(lc) : 'Set Cost'}</span>
                              <Edit2 className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          )}

                          {ipo.createdAt && (
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{formatDate(ipo.createdAt)}</span>
                            </span>
                          )}
                        </div>
                        {ipo.notes && <p className="text-xs text-slate-400 mt-1 truncate">{ipo.notes}</p>}
                      </div>

                      {/* Right Side: P&L Badge, Return %, Trash */}
                      <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {editingProfitLossId === ipo.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={profitLossInput}
                                onChange={(e) => setProfitLossInput(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveProfitLoss(ipo.id);
                                  if (e.key === 'Escape') setEditingProfitLossId(null);
                                }}
                                placeholder="0"
                                autoFocus
                                className="w-16 px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-indigo-500 rounded text-right text-white focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveProfitLoss(ipo.id)}
                                className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditProfitLoss(ipo)}
                              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border transition ${
                                pl > 0
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : pl < 0
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                              }`}
                              title="Tap to edit Profit/Loss"
                            >
                              {pl > 0 ? '+' : ''}
                              {formatCurrency(pl)}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteIpo(ipo.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition"
                            title="Delete IPO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {ipoPercent !== null && (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            ipoPercent >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {ipoPercent > 0 ? '+' : ''}{ipoPercent.toFixed(1)}% Return
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Dropdown Trigger Bar */}
                    <div
                      onClick={() => toggleIpoExpand(ipo.id)}
                      className={`mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between cursor-pointer group select-none transition-colors ${
                        isExpanded ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Applied Count Badge */}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                            appliedCount > 0
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-950 text-slate-500 border border-slate-800'
                          }`}
                        >
                          <Users className="w-3 h-3 text-cyan-400" />
                          <span>{appliedCount}/{totalDematCount} Applied</span>
                        </span>

                        {/* Allotted Badge if any */}
                        {allottedCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{allottedCount} Allotted</span>
                          </span>
                        )}
                      </div>

                      {/* Dropdown Toggle Button with animated chevron */}
                      <div className="flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                        <span>{isExpanded ? 'Hide Demats' : 'Show Demats'}</span>
                        <div
                          className={`p-1 rounded-md bg-slate-800/80 border border-slate-700/60 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 bg-cyan-950/60 text-cyan-400 border-cyan-500/30' : ''
                          }`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Person Applications Dropdown / Accordion Body */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2.5 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>Person Demat Accounts ({persons.length})</span>
                          </span>
                          <span className="text-[10px] font-normal text-slate-500 lowercase">
                            tap checkbox to toggle
                          </span>
                        </div>

                        {persons.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800">
                            No demat accounts registered yet.
                          </div>
                        ) : (
                          persons.map((person) => {
                            const app = (ipo.applications || []).find((a) => isSamePerson(a.personName, person)) || {
                              applied: false,
                              allotted: false,
                              notes: ''
                            };
                            return (
                              <div
                                key={person}
                                className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                                  app.allotted
                                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                                    : app.applied
                                    ? 'bg-cyan-950/20 border-cyan-500/40'
                                    : 'bg-slate-950/60 border-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-200">{person}</span>
                                    {app.allotted ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Allotted
                                      </span>
                                    ) : app.applied ? (
                                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Applied
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(app.applied)}
                                        onChange={() => handleToggleApplication(ipo.id, person, 'applied')}
                                        className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700 accent-cyan-500 cursor-pointer"
                                      />
                                      <span className={app.applied ? 'text-cyan-300 font-semibold text-xs' : 'text-slate-400 text-xs'}>
                                        Applied
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(app.allotted)}
                                        onChange={() => handleToggleAllottedWithConfirm(ipo, person, Boolean(app.allotted))}
                                        className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 accent-emerald-500 cursor-pointer"
                                      />
                                      <span className={app.allotted ? 'text-emerald-300 font-bold text-xs' : 'text-slate-400 text-xs'}>
                                        Allotted
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  placeholder="App # / UPI / Demat notes..."
                                  value={app.notes || ''}
                                  onChange={(e) => handleUpdatePersonNotes(ipo.id, person, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Pagination Controls for Mobile Cards */}
            {totalPages > 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 border border-slate-700 transition"
                >
                  Prev
                </button>
                <span className="font-mono">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 border border-slate-700 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Spreadsheet Table Container (Scrollable across all screens) */}
        {(viewMode === 'spreadsheet' || true) && (
          <div className={`${viewMode === 'cards' ? 'hidden md:flex' : 'flex'} bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex-col`}>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
              <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                {/* Table Header */}
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px] sm:text-[11px]">
                    {/* Left Column: IPO Details & Lot Cost (Spacious Width) */}
                    <th className="py-3 px-3 sm:px-4 sticky left-0 z-20 bg-slate-950 min-w-[220px] sm:min-w-[260px] border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      IPO Details & Lot Size
                    </th>

                    {/* Middle Dynamic Columns for Registered Persons */}
                    {persons.map((person) => (
                      <th
                        key={person}
                        className="py-2.5 px-2 min-w-[150px] max-w-[180px] border-r border-slate-800/80 bg-slate-950 text-center"
                      >
                        <div className="flex items-center justify-center mb-0.5">
                          <span className="text-slate-200 font-medium truncate max-w-[140px]" title={person}>
                            {person}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 font-normal border-t border-slate-800/60 pt-0.5">
                          <span className="text-indigo-300 font-medium">Applied</span>
                          <span className="text-emerald-300 font-medium">Allotted</span>
                        </div>
                      </th>
                    ))}

                    {/* Right Column: Profit / Loss & Percentage */}
                    <th className="py-3 px-3 sm:px-4 min-w-[140px] text-right bg-slate-950 sticky right-0 z-20 border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
                      P&L & Return
                    </th>
                    <th className="py-3 px-1.5 w-8 min-w-[32px] text-center bg-slate-950">
                      
                    </th>
                  </tr>
                </thead>

                {/* Table Body (Paginated: 5 per page) */}
                <tbody className="divide-y divide-slate-800/60">
                  {loading && ipos.length === 0 ? (
                    [1, 2, 3, 4, 5].map((n) => (
                      <tr key={n} className="hover:bg-slate-850/50">
                        <td className="py-3 px-3 sm:px-4 sticky left-0 bg-slate-900 z-10 border-r border-slate-800/80">
                          <div className="space-y-2">
                            <div className="h-4 w-36 rounded animate-shimmer" />
                            <div className="h-3 w-20 rounded animate-shimmer opacity-70" />
                          </div>
                        </td>
                        {persons.map((p) => (
                          <td key={p} className="py-3 px-2 border-r border-slate-800/80 text-center">
                            <div className="flex justify-center gap-3">
                              <div className="h-4 w-4 rounded animate-shimmer" />
                              <div className="h-4 w-4 rounded animate-shimmer" />
                            </div>
                          </td>
                        ))}
                        <td className="py-3 px-3 sm:px-4 text-right sticky right-0 bg-slate-900 border-l border-slate-800">
                          <div className="h-4 w-20 ml-auto rounded animate-shimmer" />
                        </td>
                        <td className="py-3 px-1.5 text-center">
                          <div className="h-4 w-4 mx-auto rounded animate-shimmer opacity-40" />
                        </td>
                      </tr>
                    ))
                  ) : filteredIpos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3 + persons.length}
                        className="py-12 text-center text-slate-500 font-normal"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileSpreadsheet className="w-8 h-8 text-slate-600" />
                          <p className="text-sm">No IPO entries in database.</p>
                          <button
                            onClick={() => setIsAddIpoOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
                          >
                            + Add New IPO
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (

                    paginatedIpos.map((ipo) => {
                      const pl = parseFloat(ipo.profitLoss) || 0;
                      const lc = parseFloat(ipo.lotCost) || 0;
                      const isPositive = pl > 0;
                      const isNegative = pl < 0;
                      const ipoPercent = calculateIpoPercentage(ipo);

                      return (
                        <tr
                          key={ipo.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. Left: IPO Name, Lot Cost & Notes */}
                          <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-200 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850 min-w-[220px] sm:min-w-[260px] border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                            <div className="font-semibold text-slate-100 text-xs sm:text-sm tracking-tight truncate max-w-[240px]" title={ipo.ipoName}>
                              {ipo.ipoName}
                            </div>

                            {/* Lot Cost & Date Added */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {editingLotCostId === ipo.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={lotCostInput}
                                    onChange={(e) => setLotCostInput(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveLotCost(ipo.id);
                                      if (e.key === 'Escape') setEditingLotCostId(null);
                                    }}
                                    placeholder="0"
                                    autoFocus
                                    className="w-20 px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-indigo-500 rounded text-white focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleSaveLotCost(ipo.id)}
                                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEditLotCost(ipo)}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 hover:border-indigo-500/50 transition flex items-center gap-1"
                                  title="Click to edit Lot Cost"
                                >
                                  <span>Lot: {lc > 0 ? formatCurrency(lc) : 'Set Cost'}</span>
                                  <Edit2 className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                </button>
                              )}

                              {ipo.createdAt && (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80" title={`Added on ${formatDate(ipo.createdAt)}`}>
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
                            const app = (ipo.applications || []).find(
                              (a) => isSamePerson(a.personName, person)
                            ) || { applied: false, allotted: false, notes: '' };

                            return (
                              <td
                                key={person}
                                className={`py-1.5 px-2 min-w-[150px] max-w-[180px] border-r border-slate-800/80 align-middle ${
                                  app.allotted
                                    ? 'bg-emerald-950/20'
                                    : app.applied
                                    ? 'bg-indigo-950/20'
                                    : ''
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  {/* Interactive Checkbox Pair */}
                                  <div className="grid grid-cols-2 gap-1">
                                    {/* Applied Checkbox */}
                                    <label className="flex items-center justify-center gap-1 p-0.5 rounded cursor-pointer bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition select-none">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(app.applied)}
                                        onChange={() =>
                                          handleToggleApplication(ipo.id, person, 'applied')
                                        }
                                        className="w-3 h-3 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                                      />
                                      <span
                                        className={`text-[9px] ${
                                          app.applied ? 'text-indigo-300 font-semibold' : 'text-slate-500'
                                        }`}
                                      >
                                        App
                                      </span>
                                    </label>

                                    {/* Allotted Checkbox */}
                                    <label
                                      className={`flex items-center justify-center gap-1 p-0.5 rounded cursor-pointer transition select-none border ${
                                        app.allotted
                                          ? 'bg-emerald-500/20 border-emerald-500/40'
                                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Boolean(app.allotted)}
                                        onChange={() =>
                                          handleToggleAllottedWithConfirm(ipo, person, Boolean(app.allotted))
                                        }
                                        className="w-3 h-3 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer accent-emerald-500"
                                      />
                                      <span
                                        className={`text-[9px] ${
                                          app.allotted ? 'text-emerald-300 font-bold' : 'text-slate-500'
                                        }`}
                                      >
                                        Allot
                                      </span>
                                    </label>
                                  </div>

                                  {/* Small Notes Input per person */}
                                  <input
                                    type="text"
                                    placeholder="Notes..."
                                    value={app.notes || ''}
                                    onChange={(e) =>
                                      handleUpdatePersonNotes(ipo.id, person, e.target.value)
                                    }
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
                                  onChange={(e) => setProfitLossInput(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveProfitLoss(ipo.id);
                                    if (e.key === 'Escape') setEditingProfitLossId(null);
                                  }}
                                  placeholder="0"
                                  autoFocus
                                  className="w-16 px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-indigo-500 rounded text-right text-white focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveProfitLoss(ipo.id)}
                                  className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleStartEditProfitLoss(ipo)}
                                className="flex flex-col items-end gap-0.5 cursor-pointer group/pl"
                                title="Click to edit Profit/Loss"
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

                                {/* Profit / Loss Percentage based on Lot Cost */}
                                {ipoPercent !== null ? (
                                  <span
                                    className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                                      ipoPercent >= 0
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-rose-500/10 text-rose-400'
                                    }`}
                                  >
                                    {ipoPercent > 0 ? '+' : ''}{ipoPercent.toFixed(1)}% Return
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-500">
                                    {lc <= 0 ? 'Set lot ₹' : '0.0%'}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 4. Delete Action Button */}
                          <td className="py-2 px-1 text-center w-8 min-w-[32px]">
                            <button
                              onClick={() => handleDeleteIpo(ipo.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition"
                              title="Delete IPO entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Pagination Controls */}
            <div className="bg-slate-950 px-3 sm:px-5 py-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
              <div>
                Showing <span className="font-semibold text-slate-200">
                  {filteredIpos.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span> to <span className="font-semibold text-slate-200">
                  {Math.min(currentPage * pageSize, filteredIpos.length)}
                </span> of <span className="font-semibold text-slate-200">
                  {filteredIpos.length}
                </span> IPOs
              </div>

              {/* Pagination Button Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-800 transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setCurrentPage(pg)}
                        className={`w-7 h-7 text-xs font-mono rounded font-medium transition ${
                          currentPage === pg
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-sm shadow-cyan-600/30'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-800 transition flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="font-mono text-xs flex items-center gap-3">
                {stats.overallProfitPercent !== null && (
                  <span className="text-slate-400">
                    Overall ROI:{' '}
                    <span className={`font-bold ${parseFloat(stats.overallProfitPercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {parseFloat(stats.overallProfitPercent) > 0 ? '+' : ''}{stats.overallProfitPercent}%
                    </span>
                  </span>
                )}
                <span>
                  Total Realized P&L:{' '}
                  <span
                    className={`font-bold ${
                      stats.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {stats.totalProfitLoss > 0 ? '+' : ''}
                    {formatCurrency(stats.totalProfitLoss)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add New Person Column (Rendered in Body Portal for True Viewport Centering) */}
      {isAddPersonOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setIsAddPersonOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Add New Person / Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPersonOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Person / Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Self, Account 2, Brother, etc."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Adds a dynamic column for tracking applications and allotment status.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPersonOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
                >
                  Add Person Column
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Add New IPO Entry (Rendered in Body Portal for True Viewport Centering) */}
      {isAddIpoOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setIsAddIpoOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown max-h-[90vh] overflow-y-auto scrollbar-none"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Add New IPO</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddIpoOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIpo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  IPO Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy Ltd. / NTPC Green"
                  value={newIpoData.ipoName}
                  onChange={(e) => setNewIpoData({ ...newIpoData, ipoName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lot Cost (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  value={newIpoData.lotCost}
                  onChange={(e) => setNewIpoData({ ...newIpoData, lotCost: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes & Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. GMP +45%, Mainboard, Demat notes..."
                  value={newIpoData.notes}
                  onChange={(e) => setNewIpoData({ ...newIpoData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Profit / Loss (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    value={newIpoData.profitLoss}
                    onChange={(e) => setNewIpoData({ ...newIpoData, profitLoss: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newIpoData.status}
                    onChange={(e) => setNewIpoData({ ...newIpoData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="applied">Applied</option>
                    <option value="allotted">Allotted</option>
                    <option value="closed">Closed</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Date Added
                </label>
                <input
                  type="date"
                  value={newIpoData.createdAt}
                  onChange={(e) => setNewIpoData({ ...newIpoData, createdAt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddIpoOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
                >
                  Create IPO Row
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Confirmation Dialog when unchecking an already Allotted application */}
      {unallotConfirmModal && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setUnallotConfirmModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Unmark Allotment?</h3>
                  <button
                    type="button"
                    onClick={() => setUnallotConfirmModal(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Are you sure you want to remove the Allotment check for <span className="font-semibold text-white px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">{unallotConfirmModal.personName}</span> on <span className="font-semibold text-indigo-300">{unallotConfirmModal.ipoName}</span>?
                </p>
              </div>
            </div>

            {unallotConfirmModal.profitLoss !== 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                <span className="text-slate-400">Recorded Profit/Loss:</span>
                <span className={`font-mono font-bold ${unallotConfirmModal.profitLoss > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {unallotConfirmModal.profitLoss > 0 ? '+' : ''}{formatCurrency(unallotConfirmModal.profitLoss)}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUnallotConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Keep Allotted
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleApplication(unallotConfirmModal.ipoId, unallotConfirmModal.personName, 'allotted');
                  setUnallotConfirmModal(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                <span>Yes, Unmark Allotment</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
