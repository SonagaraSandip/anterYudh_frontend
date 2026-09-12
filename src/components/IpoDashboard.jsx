import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import cacheManager from '../utils/cacheManager';
import {
  Plus,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Download,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Layers,
  Smartphone
} from 'lucide-react';
import { exportIposToExcel } from '../utils/excelExporter';
import { IpoDesktopRow } from './ipo/IpoDesktopRow';
import { IpoMobileCard } from './ipo/IpoMobileCard';
import { ReorderPersonsModal } from './ipo/ReorderPersonsModal';
import { IpoAllotmentModal } from './ipo/IpoAllotmentModal';
import { IpoQuickPartialSellModal } from './ipo/IpoQuickPartialSellModal';
import { calculateIpoMetrics } from '../utils/ipoCalculator';

const API_BASE = '/api/ipos';

const isSamePerson = (p1, p2) =>
  String(p1 || '').trim().toLowerCase() === String(p2 || '').trim().toLowerCase();

export default function IpoDashboard({ isEmbedded = false }) {
  const [ipos, setIpos] = useState(() => {
    const cached = cacheManager.get('ipos_list');
    if (Array.isArray(cached)) return cached;
    try {
      const stored = JSON.parse(localStorage.getItem('antaryudh_ipo_data') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  // Synchronized state updater that instantly updates React state, memory cache, and localStorage in 1 atomic step
  const updateIpos = (updater) => {
    setIpos((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (Array.isArray(next)) {
        cacheManager.set('ipos_list', next, 120000);
        try {
          localStorage.setItem('antaryudh_ipo_data', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };
  const [persons, setPersons] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('antaryudh_demat_persons') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 5; // Mobile default max 4 entries
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
  const [isReorderPersonsOpen, setIsReorderPersonsOpen] = useState(false);
  const [isSubmittingIpo, setIsSubmittingIpo] = useState(false);
  const [isSubmittingPerson, setIsSubmittingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  
  // Confirmation modal state before unchecking Allotted
  const [unallotConfirmModal, setUnallotConfirmModal] = useState(null);

  // Confirmation modal state before deleting a Person / Demat Account column
  const [deletePersonConfirmModal, setDeletePersonConfirmModal] = useState(null);

  // Allotment & Partial Sell Modal States
  const [allotmentModalTarget, setAllotmentModalTarget] = useState(null); // { ipo, personName, application }
  const [quickPartialSellTarget, setQuickPartialSellTarget] = useState(null); // { ipo, personName, application }


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

  // Fetch IPOs from Backend via Axios (with SWR caching)
  const fetchIpos = async () => {
    if (ipos.length === 0) {
      setLoading(true);
    }
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
        updateIpos(cleanIpos);

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
        updateIpos([]);
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

  // Handle Escape key and body scroll lock for open modals
  useEffect(() => {
    const isAnyModalOpen = isAddIpoOpen || isAddPersonOpen || unallotConfirmModal || deletePersonConfirmModal || allotmentModalTarget || quickPartialSellTarget;
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddIpoOpen(false);
        setIsAddPersonOpen(false);
        setUnallotConfirmModal(null);
        setDeletePersonConfirmModal(null);
        setAllotmentModalTarget(null);
        setQuickPartialSellTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddIpoOpen, isAddPersonOpen, unallotConfirmModal, deletePersonConfirmModal, allotmentModalTarget, quickPartialSellTarget]);

  // Save Custom Person Order and Lock
  const handleSavePersonsOrder = (newOrder) => {
    if (!Array.isArray(newOrder)) return;
    setPersons(newOrder);
    localStorage.setItem('antaryudh_demat_persons', JSON.stringify(newOrder));
  };

  // Sync Person List across all local IPOs
  const ensurePersonAcrossIpos = (personName) => {
    updateIpos((prevIpos) =>
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
  const handleAddPerson = async (e) => {
    e.preventDefault();
    const trimmed = newPersonName.trim();
    if (!trimmed || isSubmittingPerson) return;

    setIsSubmittingPerson(true);
    try {
      if (!persons.some((p) => isSamePerson(p, trimmed))) {
        const updatedPersons = [...persons, trimmed];
        setPersons(updatedPersons);
        localStorage.setItem('antaryudh_demat_persons', JSON.stringify(updatedPersons));
        ensurePersonAcrossIpos(trimmed);
      }
      setNewPersonName('');
      setIsAddPersonOpen(false);
    } finally {
      setIsSubmittingPerson(false);
    }
  };

  // Prompt confirmation dialog before deleting a Person / Demat Account column
  const handlePromptDeletePerson = (personName) => {
    let totalApps = 0;
    let allottedCount = 0;
    ipos.forEach((ipo) => {
      (ipo.applications || []).forEach((app) => {
        if (isSamePerson(app.personName, personName)) {
          if (app.applied) totalApps += 1;
          if (app.allotted) allottedCount += 1;
        }
      });
    });

    setDeletePersonConfirmModal({
      personName,
      totalApps,
      allottedCount
    });
  };

  // Confirm and execute Person / Demat Account deletion
  const handleConfirmDeletePerson = async () => {
    if (!deletePersonConfirmModal?.personName) return;
    const targetPerson = deletePersonConfirmModal.personName;
    const prevPersons = [...persons];
    const prevIpos = [...ipos];

    // 1. Optimistic removal from state & localStorage
    const updatedPersons = persons.filter((p) => !isSamePerson(p, targetPerson));
    setPersons(updatedPersons);
    try {
      localStorage.setItem('antaryudh_demat_persons', JSON.stringify(updatedPersons));
    } catch {}

    updateIpos((prev) =>
      prev.map((ipo) => ({
        ...ipo,
        applications: (ipo.applications || []).filter(
          (app) => !isSamePerson(app.personName, targetPerson)
        )
      }))
    );
    setDeletePersonConfirmModal(null);

    // 2. Guaranteed backend database delete
    try {
      await axios.delete(`${API_BASE}/person/${encodeURIComponent(targetPerson)}`);
    } catch (err) {
      console.error('Failed to delete person on backend:', err);
      // Rollback on failure
      setPersons(prevPersons);
      updateIpos(prevIpos);
      try {
        localStorage.setItem('antaryudh_demat_persons', JSON.stringify(prevPersons));
      } catch {}
      setErrorMsg(`Failed to delete person "${targetPerson}" from server.`);
    }
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

    let nextShares = existingApp?.allottedShares || 0;
    let nextPrice = existingApp?.allottedPrice || 0;

    if (field === 'allotted' && newVal && nextShares === 0 && (targetIpo?.lotCost || 0) > 0) {
      nextShares = 1;
      nextPrice = parseFloat(targetIpo.lotCost) || 0;
    }

    const payloadApp = {
      ipoId,
      personName: existingApp?.personName || personName,
      applied: nextApplied,
      allotted: nextAllotted,
      allottedShares: nextShares,
      allottedPrice: nextPrice,
      sellPrice: existingApp?.sellPrice || null,
      sellDate: existingApp?.sellDate || null,
      charges: existingApp?.charges || 0,
      transactions: existingApp?.transactions || null,
      notes: existingApp?.notes || ''
    };

    // 2. Optimistic UI update
    updateIpos((prevIpos) =>
      prevIpos.map((ipo) => {
        if (ipo.id !== ipoId) return ipo;

        const apps = [...(ipo.applications || [])];
        const appIdx = apps.findIndex((a) => isSamePerson(a.personName, personName));

        if (appIdx >= 0) {
          apps[appIdx] = {
            ...apps[appIdx],
            applied: nextApplied,
            allotted: nextAllotted,
            allottedShares: nextShares,
            allottedPrice: nextPrice
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
        updateIpos((prevIpos) =>
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
        updateIpos((prevIpos) =>
          prevIpos.map((ipo) => (ipo.id === ipoId ? targetIpo : ipo))
        );
      }
    }
  };

  // Open Allotment Position Manager Modal
  const handleOpenAllotmentModal = (ipo, personName, application) => {
    setAllotmentModalTarget({ ipo, personName, application });
  };

  // Open Quick Partial Sell Modal
  const handleOpenQuickPartialSellModal = (ipo, personName, application) => {
    setQuickPartialSellTarget({ ipo, personName, application });
  };

  // Save full Allotment & Trades from AllotmentManagerModal
  const handleSaveAllotment = async (allotmentData) => {
    if (!allotmentModalTarget) return;
    const { ipo, personName } = allotmentModalTarget;
    const ipoId = ipo.id;

    const shares = parseInt(allotmentData.allottedShares, 10) || 0;
    const price = parseFloat(allotmentData.allottedPrice) || 0;
    const computedLotCost = shares > 0 && price > 0 ? Math.round(shares * price * 100) / 100 : 0;

    // 1. Optimistic Update
    updateIpos((prev) =>
      prev.map((i) => {
        if (i.id !== ipoId) return i;
        const apps = [...(i.applications || [])];
        const idx = apps.findIndex((a) => isSamePerson(a.personName, personName));
        const updatedApp = {
          ...(idx >= 0 ? apps[idx] : {}),
          ipoId,
          personName,
          applied: true,
          allotted: true,
          allottedShares: allotmentData.allottedShares,
          allottedPrice: allotmentData.allottedPrice,
          sellPrice: allotmentData.sellPrice,
          sellDate: allotmentData.sellDate,
          charges: allotmentData.charges,
          transactions: allotmentData.transactions,
          notes: allotmentData.notes !== undefined ? allotmentData.notes : (idx >= 0 ? apps[idx].notes : '')
        };
        if (idx >= 0) {
          apps[idx] = updatedApp;
        } else {
          apps.push(updatedApp);
        }

        const nextLotCost = (parseFloat(i.lotCost) || 0) > 0 ? i.lotCost : (computedLotCost > 0 ? computedLotCost : i.lotCost);
        const nextLotSize = (parseInt(i.lotSize, 10) || 0) > 0 ? i.lotSize : (shares > 0 ? shares : i.lotSize);
        const nextIssuePrice = (parseFloat(i.issuePrice) || 0) > 0 ? i.issuePrice : (price > 0 ? price : i.issuePrice);

        return {
          ...i,
          lotCost: nextLotCost,
          lotSize: nextLotSize,
          issuePrice: nextIssuePrice,
          applications: apps
        };
      })
    );

    // 2. Guaranteed Backend Update
    try {
      const res = await axios.put(
        `${API_BASE}/${ipoId}/application/${encodeURIComponent(personName)}`,
        allotmentData
      );

      // Auto-sync calculated lot cost and lot size to the IPO record if not set
      if (computedLotCost > 0 && ((parseFloat(ipo.lotCost) || 0) === 0 || (parseInt(ipo.lotSize, 10) || 0) === 0)) {
        try {
          await axios.put(`${API_BASE}/${ipoId}`, {
            lotCost: (parseFloat(ipo.lotCost) || 0) > 0 ? ipo.lotCost : computedLotCost,
            lotSize: (parseInt(ipo.lotSize, 10) || 0) > 0 ? ipo.lotSize : shares,
            issuePrice: (parseFloat(ipo.issuePrice) || 0) > 0 ? ipo.issuePrice : price
          });
        } catch (e) {
          console.warn('Could not sync lot cost to IPO record:', e);
        }
      }

      if (res.data) {
        updateIpos((prev) =>
          prev.map((i) => {
            if (i.id !== ipoId) return i;
            const apps = (i.applications || []).map((a) =>
              isSamePerson(a.personName, personName) ? res.data : a
            );
            return {
              ...i,
              lotCost: (parseFloat(i.lotCost) || 0) > 0 ? i.lotCost : (computedLotCost || i.lotCost),
              lotSize: (parseInt(i.lotSize, 10) || 0) > 0 ? i.lotSize : (shares || i.lotSize),
              issuePrice: (parseFloat(i.issuePrice) || 0) > 0 ? i.issuePrice : (price || i.issuePrice),
              applications: apps
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to update allotment on server:', err);
      fetchIpos();
    }
  };

  // Submit Quick Partial Sell
  const handleSubmitPartialSell = async (partialSellData) => {
    if (!quickPartialSellTarget) return;
    const { ipo, personName } = quickPartialSellTarget;
    const ipoId = ipo.id;

    try {
      const res = await axios.post(
        `${API_BASE}/${ipoId}/application/${encodeURIComponent(personName)}/partial-sell`,
        partialSellData
      );
      if (res.data) {
        updateIpos((prev) =>
          prev.map((i) => {
            if (i.id !== ipoId) return i;
            const apps = (i.applications || []).map((a) =>
              isSamePerson(a.personName, personName) ? res.data : a
            );
            return { ...i, applications: apps };
          })
        );
      }
    } catch (err) {
      console.error('Failed to record partial sell on server:', err);
      fetchIpos();
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
    updateIpos((prevIpos) =>
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
    updateIpos((prev) =>
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
    updateIpos((prev) =>
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
    if (!newIpoData.ipoName.trim() || isSubmittingIpo) return;

    setIsSubmittingIpo(true);
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
        updateIpos((prev) => [response.data, ...prev]);
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
    } finally {
      setIsSubmittingIpo(false);
    }
  };

  // Delete an IPO row
  const handleDeleteIpo = async (ipoId) => {
    if (!window.confirm('Are you sure you want to delete this IPO entry?')) return;

    const prevList = [...ipos];
    updateIpos((prev) => prev.filter((i) => i.id !== ipoId));

    try {
      await axios.delete(`${API_BASE}/${ipoId}`);
    } catch (err) {
      console.error('Failed to delete IPO:', err);
      updateIpos(prevList);
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

  // Computed summary stats using robust calculation engine
  const stats = useMemo(() => {
    let totalProfitLoss = 0;
    let totalAppliedCount = 0;
    let totalAllottedCount = 0;
    let totalInvestedCost = 0;
    let totalCharges = 0;

    ipos.forEach((ipo) => {
      const m = calculateIpoMetrics(ipo);
      totalProfitLoss += m.profitLoss;
      totalInvestedCost += m.totalInvested;
      totalCharges += m.charges;

      (ipo.applications || []).forEach((app) => {
        if (app.applied) totalAppliedCount += 1;
        if (app.allotted) totalAllottedCount += 1;
      });
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
      overallProfitPercent,
      totalCharges
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
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full md:w-auto">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto flex-1">
              <button
                onClick={() => exportIposToExcel(ipos)}
                title="Download IPO applied & allotted details in Excel (.xlsx)"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 transition-all shadow-sm active:scale-95 truncate"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Export</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReorderPersonsOpen(true)}
                title="Re-arrange Demat applicant names & lock order"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 transition-all shadow-sm active:scale-95 truncate"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Reorder</span>
              </button>

              <button
                onClick={() => setIsAddPersonOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 truncate"
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Person</span>
              </button>

              <button
                onClick={() => setIsAddIpoOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all active:scale-95 truncate"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">IPO</span>
              </button>
            </div>

            <button
              onClick={fetchIpos}
              title="Refresh Data"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all active:rotate-180 shrink-0"
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
                <option value={5} className="bg-slate-900">5 / page (Mobile)</option>
                <option value={10} className="bg-slate-900">10 / page (Web)</option>
                <option value={20} className="bg-slate-900">20 / page</option>
                <option value={30} className="bg-slate-900">30 / page</option>
                <option value={50} className="bg-slate-900">50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Registered Demat Accounts Pills Bar (Quick View & Delete) */}
        {/* {persons.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 text-xs scrollbar-none flex-wrap bg-slate-900/40 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Demat Accounts ({persons.length}):</span>
            </span>
            {persons.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium hover:border-slate-700 transition group/tag shadow-sm"
              >
                <span className="truncate max-w-[120px]">{p}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePromptDeletePerson(p);
                  }}
                  className="text-slate-500 hover:text-rose-400 transition p-0.5 rounded hover:bg-rose-500/10 active:scale-90"
                  title={`Remove ${p} account`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setIsAddPersonOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 rounded-lg transition"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
        )} */}

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


        {/* 1. Mobile Cards & Dropdown View (Default & dedicated for Mobile) */}
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
              paginatedIpos.map((ipo) => (
                <IpoMobileCard
                  key={ipo.id}
                  ipo={ipo}
                  persons={persons}
                  isExpanded={expandedIpoIds.has(ipo.id)}
                  onToggleExpand={toggleIpoExpand}
                  editingLotCostId={editingLotCostId}
                  lotCostInput={lotCostInput}
                  onLotCostInputChange={setLotCostInput}
                  onSaveLotCost={handleSaveLotCost}
                  onCancelEditLotCost={() => setEditingLotCostId(null)}
                  onStartEditLotCost={handleStartEditLotCost}
                  editingProfitLossId={editingProfitLossId}
                  profitLossInput={profitLossInput}
                  onProfitLossInputChange={setProfitLossInput}
                  onSaveProfitLoss={handleSaveProfitLoss}
                  onCancelEditProfitLoss={() => setEditingProfitLossId(null)}
                  onStartEditProfitLoss={handleStartEditProfitLoss}
                  onToggleApplication={handleToggleApplication}
                  onToggleAllottedWithConfirm={handleToggleAllottedWithConfirm}
                  onUpdatePersonNotes={handleUpdatePersonNotes}
                  onOpenAllotmentModal={handleOpenAllotmentModal}
                  onOpenQuickPartialSellModal={handleOpenQuickPartialSellModal}
                  onDeleteIpo={handleDeleteIpo}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  calculateIpoPercentage={calculateIpoPercentage}
                />
              ))
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

        {/* 2. Spreadsheet Table Container (Dedicated Web / Desktop View) */}
        <div className="hidden md:flex bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex-col">
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
                        className="py-2.5 px-2 min-w-[150px] max-w-[180px] border-r border-slate-800/80 bg-slate-950 text-center relative group/th"
                      >
                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                          <span className="text-slate-200 font-medium truncate max-w-[110px]" title={person}>
                            {person}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptDeletePerson(person);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-60 group-hover/th:opacity-100 active:scale-90"
                            title={`Remove person / account "${person}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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
                    paginatedIpos.map((ipo) => (
                      <IpoDesktopRow
                        key={ipo.id}
                        ipo={ipo}
                        persons={persons}
                        editingLotCostId={editingLotCostId}
                        lotCostInput={lotCostInput}
                        onLotCostInputChange={setLotCostInput}
                        onSaveLotCost={handleSaveLotCost}
                        onCancelEditLotCost={() => setEditingLotCostId(null)}
                        onStartEditLotCost={handleStartEditLotCost}
                        editingProfitLossId={editingProfitLossId}
                        profitLossInput={profitLossInput}
                        onProfitLossInputChange={setProfitLossInput}
                        onSaveProfitLoss={handleSaveProfitLoss}
                        onCancelEditProfitLoss={() => setEditingProfitLossId(null)}
                        onStartEditProfitLoss={handleStartEditProfitLoss}
                        onToggleApplication={handleToggleApplication}
                        onToggleAllottedWithConfirm={handleToggleAllottedWithConfirm}
                        onUpdatePersonNotes={handleUpdatePersonNotes}
                        onOpenAllotmentModal={handleOpenAllotmentModal}
                        onOpenQuickPartialSellModal={handleOpenQuickPartialSellModal}
                        onDeleteIpo={handleDeleteIpo}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        calculateIpoPercentage={calculateIpoPercentage}
                      />
                    ))
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
      </div>

      {/* Modal: Add New Person Column (Rendered in Body Portal for True Viewport Centering) */}
      {isAddPersonOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddPersonOpen(false);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown max-h-[90vh] overflow-y-auto my-auto relative z-[100000]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Manage Demat Accounts</h3>
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
                  New Person / Account Name *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Self, Account 2, Brother, etc."
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingPerson}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/30 transition shrink-0 flex items-center gap-1.5"
                  >
                    {isSubmittingPerson && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingPerson ? 'Adding...' : 'Add'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Adds a dynamic column for tracking applications and allotment status.
                </p>
              </div>
            </form>

            {/* Existing Accounts List */}
            {persons.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Registered Accounts ({persons.length})
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {persons.map((p) => {
                    const appCount = ipos.reduce((count, ipo) => {
                      const app = (ipo.applications || []).find((a) => isSamePerson(a.personName, p));
                      return app?.applied ? count + 1 : count;
                    }, 0);

                    return (
                      <div
                        key={p}
                        className="flex items-center justify-between px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-semibold text-slate-200 truncate">{p}</span>
                          <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                            ({appCount} applied)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAddPersonOpen(false);
                            handlePromptDeletePerson(p);
                          }}
                          className="text-slate-500 hover:text-rose-400 transition p-1 rounded hover:bg-rose-500/10 active:scale-90 flex items-center gap-1 text-[11px]"
                          title={`Delete account "${p}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddPersonOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* Modal: Add New IPO Entry (Rendered in Body Portal for True Viewport Centering) */}
      {isAddIpoOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingIpo) setIsAddIpoOpen(false);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown max-h-[90vh] overflow-y-auto scrollbar-none my-auto relative z-[100000]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Add New IPO</h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingIpo}
                onClick={() => setIsAddIpoOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-40"
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
                  disabled={isSubmittingIpo}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                  disabled={isSubmittingIpo}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                  disabled={isSubmittingIpo}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                    disabled={isSubmittingIpo}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newIpoData.status}
                    onChange={(e) => setNewIpoData({ ...newIpoData, status: e.target.value })}
                    disabled={isSubmittingIpo}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                  disabled={isSubmittingIpo}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingIpo}
                  onClick={() => setIsAddIpoOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIpo}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  {isSubmittingIpo && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingIpo ? 'Saving IPO...' : 'Create IPO Row'}</span>
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setUnallotConfirmModal(null);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown my-auto relative z-[100000]"
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

      {/* Modal: Confirmation Dialog when Deleting a Person / Demat Account Column */}
      {deletePersonConfirmModal && typeof document !== 'undefined' && createPortal(

        <div 
          onClick={() => setDeletePersonConfirmModal(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-slideDown my-auto relative z-[100000]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Remove Person / Account?</h3>
                  <button
                    type="button"
                    onClick={() => setDeletePersonConfirmModal(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Are you sure you want to remove <span className="font-semibold text-rose-300 px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/30">{deletePersonConfirmModal.personName}</span>?
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This will remove the column from all tables and delete its application history ({deletePersonConfirmModal.totalApps} applied, {deletePersonConfirmModal.allottedCount} allotted).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletePersonConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePerson}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Person</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Reorder Demat Accounts & Lock Order */}
      <ReorderPersonsModal
        isOpen={isReorderPersonsOpen}
        persons={persons}
        onSaveOrder={handleSavePersonsOrder}
        onClose={() => setIsReorderPersonsOpen(false)}
      />

      {/* Modal: Allotment & Trade / Selling Manager */}
      {allotmentModalTarget && (
        <IpoAllotmentModal
          isOpen={Boolean(allotmentModalTarget)}
          onClose={() => setAllotmentModalTarget(null)}
          ipo={allotmentModalTarget.ipo}
          personName={allotmentModalTarget.personName}
          application={allotmentModalTarget.application}
          onSaveAllotment={handleSaveAllotment}
        />
      )}

      {/* Modal: Quick Partial Sell */}
      {quickPartialSellTarget && (
        <IpoQuickPartialSellModal
          isOpen={Boolean(quickPartialSellTarget)}
          onClose={() => setQuickPartialSellTarget(null)}
          ipo={quickPartialSellTarget.ipo}
          personName={quickPartialSellTarget.personName}
          application={quickPartialSellTarget.application}
          onSubmitPartialSell={handleSubmitPartialSell}
        />
      )}
    </div>
  );
}

