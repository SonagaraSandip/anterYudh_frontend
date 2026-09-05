import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import clsx from 'clsx';
import {
  FileText,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Tag,
  Shield,
  KeyRound,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  ArrowUpRight,
  Filter,
  X,
  AlertCircle,
  Hash,
  FolderLock,
  Palette,
  CheckCheck,
  RefreshCw
} from 'lucide-react';

import cacheManager from '../utils/cacheManager';
import { NoteCard } from './notes/NoteCard';
import { BuyItemCard } from './notes/BuyItemCard';
import { PinVerificationModal } from './notes/PinVerificationModal';

const API_BASE = '/api';

const NOTE_CATEGORIES = [
  'All',
  'Passwords & PINs',
  'Important Numbers',
  'Credentials & Keys',
  'Finance & Demat',
  'Personal & Family',
  'General'
];

const NOTE_COLORS = [
  {
    id: 'purple',
    name: 'Plum / Wine',
    bg: 'bg-[#2b172b]/95',
    border: 'border-[#5a2a57]/60 hover:border-[#863e82]/90',
    divider: 'border-purple-300/15',
    badge: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    accent: 'text-purple-300'
  },
  {
    id: 'indigo',
    name: 'Midnight Indigo',
    bg: 'bg-[#181d33]/95',
    border: 'border-[#2d3a68]/60 hover:border-[#43579b]/90',
    divider: 'border-indigo-300/15',
    badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
    accent: 'text-indigo-300'
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    bg: 'bg-[#2a1e12]/95',
    border: 'border-[#583d1e]/60 hover:border-[#8a5f2e]/90',
    divider: 'border-amber-300/15',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    accent: 'text-amber-300'
  },
  {
    id: 'emerald',
    name: 'Forest Emerald',
    bg: 'bg-[#11261f]/95',
    border: 'border-[#225242]/60 hover:border-[#357c64]/90',
    divider: 'border-emerald-300/15',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    accent: 'text-emerald-300'
  },
  {
    id: 'rose',
    name: 'Deep Rose',
    bg: 'bg-[#2c141d]/95',
    border: 'border-[#5b2537]/60 hover:border-[#8d3652]/90',
    divider: 'border-rose-300/15',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
    accent: 'text-rose-300'
  },
  {
    id: 'cyan',
    name: 'Slate Cyan',
    bg: 'bg-[#12242e]/95',
    border: 'border-[#244c5f]/60 hover:border-[#387693]/90',
    divider: 'border-cyan-300/15',
    badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
    accent: 'text-cyan-300'
  }
];

export default function NotesView() {
  // Main Sub-Tab: 'notes' (Personal Notes & Vault) or 'buy' (Planned Purchases Wishlist)
  const [activeSubTab, setActiveSubTab] = useState('notes');

  // =================== NOTES STATE (100% Dynamic with SWR Cache) ===================
  const [notes, setNotes] = useState(() => {
    const cached = cacheManager.get('personal_notes_list');
    if (Array.isArray(cached)) return cached;
    try {
      const stored = JSON.parse(localStorage.getItem('antaryudh_cached_notes') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [selectedNoteCategory, setSelectedNoteCategory] = useState('All');
  const [onlySecrets, setOnlySecrets] = useState(false);
  const [onlyPinned, setOnlyPinned] = useState(false);

  // Unmasked secrets map (noteId -> boolean)
  const [revealedSecrets, setRevealedSecrets] = useState({});
  // PIN Verification Modal state
  const [pinModalState, setPinModalState] = useState({
    isOpen: false,
    noteId: null,
    noteTitle: ''
  });
  // Copied feedback map (noteId -> boolean)
  const [copiedNoteId, setCopiedNoteId] = useState(null);

  // Add/Edit Note Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteFormTitle, setNoteFormTitle] = useState('');
  const [noteFormContent, setNoteFormContent] = useState('');
  const [noteFormCategory, setNoteFormCategory] = useState('Passwords & PINs');
  const [noteFormIsSecret, setNoteFormIsSecret] = useState(false);
  const [noteFormIsPinned, setNoteFormIsPinned] = useState(false);
  const [noteFormColor, setNoteFormColor] = useState('indigo');
  const [noteDeleteTarget, setNoteDeleteTarget] = useState(null);

  // =================== BUY ITEMS STATE (100% Dynamic with SWR Cache) ===================
  const [buyItems, setBuyItems] = useState(() => {
    const cached = cacheManager.get('personal_buy_items_list');
    if (Array.isArray(cached)) return cached;
    try {
      const stored = JSON.parse(localStorage.getItem('antaryudh_cached_buy_items') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSubmittingBuy, setIsSubmittingBuy] = useState(false);
  const [editingBuyItem, setEditingBuyItem] = useState(null);
  const [newBuyItem, setNewBuyItem] = useState({
    title: '',
    category: 'Tech & Gear',
    estimatedCost: '',
    savedAmount: '',
    priority: 'High'
  });
  const [buyDeleteTarget, setBuyDeleteTarget] = useState(null);

  // Fetch Notes from Backend (with SWR Cache Sync)
  const fetchNotes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notes`);
      if (Array.isArray(res.data)) {
        setNotes(res.data);
        cacheManager.set('personal_notes_list', res.data, 120000);
        localStorage.setItem('antaryudh_cached_notes', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Backend notes fetch failed, using local cache:', err.message);
    }
  };

  // Fetch Buy Items from Backend (with SWR Cache Sync)
  const fetchBuyItems = async () => {
    try {
      const res = await axios.get(`${API_BASE}/buy`);
      if (Array.isArray(res.data)) {
        setBuyItems(res.data);
        cacheManager.set('personal_buy_items_list', res.data, 120000);
        localStorage.setItem('antaryudh_cached_buy_items', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Backend buy items fetch failed, using local fallback:', err.message);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchBuyItems();
  }, []);

  // Lock body scroll and handle Escape key for modals in NotesView
  useEffect(() => {
    const isAnyModalOpen = isNoteModalOpen || isBuyModalOpen || Boolean(noteDeleteTarget) || Boolean(buyDeleteTarget);
    if (isAnyModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsNoteModalOpen(false);
          setIsBuyModalOpen(false);
          setNoteDeleteTarget(null);
          setBuyDeleteTarget(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = original;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isNoteModalOpen, isBuyModalOpen, noteDeleteTarget, buyDeleteTarget]);

  // Format Currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(parseFloat(val) || 0);
  };

  // Format Date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Copy Note Content to Clipboard
  const handleCopyNote = (note) => {
    if (!note || !note.content) return;
    navigator.clipboard.writeText(note.content);
    setCopiedNoteId(note.id);
    setTimeout(() => {
      setCopiedNoteId(null);
    }, 2000);
  };

  // Toggle Secret Reveal with 5-Digit PIN Security (14110)
  const handleToggleReveal = (note) => {
    if (!note) return;
    const isCurrentlyRevealed = Boolean(revealedSecrets[note.id]);
    if (isCurrentlyRevealed) {
      // Direct hide without PIN
      setRevealedSecrets((prev) => ({
        ...prev,
        [note.id]: false
      }));
    } else {
      // Require 5-digit PIN (14110) to unmask
      setPinModalState({
        isOpen: true,
        noteId: note.id,
        noteTitle: note.title
      });
    }
  };

  // Toggle Note Pin
  const handleTogglePin = async (note) => {
    const newPinned = !note.isPinned;
    // Optimistic update
    const updatedNotes = notes.map((n) => (n.id === note.id ? { ...n, isPinned: newPinned } : n));
    setNotes(updatedNotes);
    localStorage.setItem('antaryudh_cached_notes', JSON.stringify(updatedNotes));

    try {
      await axios.patch(`${API_BASE}/notes/${note.id}/pin`);
    } catch (err) {
      console.warn('Failed to sync pin to server, maintained locally:', err.message);
    }
  };

  // Open Note Modal for Create or Edit
  const handleOpenNoteModal = (note = null) => {
    if (note) {
      setEditingNote(note);
      setNoteFormTitle(note.title);
      setNoteFormContent(note.content);
      setNoteFormCategory(note.category || 'General');
      setNoteFormIsSecret(!!note.isSecret);
      setNoteFormIsPinned(!!note.isPinned);
      setNoteFormColor(note.color || 'indigo');
    } else {
      setEditingNote(null);
      setNoteFormTitle('');
      setNoteFormContent('');
      setNoteFormCategory('Passwords & PINs');
      setNoteFormIsSecret(true); // Default to secret for passwords
      setNoteFormIsPinned(false);
      setNoteFormColor('indigo');
    }
    setIsNoteModalOpen(true);
  };

  // Save Note (Create or Update)
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteFormTitle.trim() || isSubmittingNote) return;

    const payload = {
      title: noteFormTitle.trim(),
      content: noteFormContent.trim(),
      category: noteFormCategory,
      isSecret: noteFormIsSecret,
      isPinned: noteFormIsPinned,
      color: noteFormColor
    };

    setIsSubmittingNote(true);
    try {
      if (editingNote) {
        // Update
        const updatedList = notes.map((n) =>
          n.id === editingNote.id ? { ...n, ...payload, updatedAt: new Date().toISOString() } : n
        );
        setNotes(updatedList);
        localStorage.setItem('antaryudh_cached_notes', JSON.stringify(updatedList));

        try {
          await axios.put(`${API_BASE}/notes/${editingNote.id}`, payload);
        } catch (err) {
          console.warn('Failed to update note on backend:', err.message);
        }
      } else {
        // Create
        const tempId = Date.now();
        const newNote = {
          id: tempId,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const updatedList = [newNote, ...notes];
        setNotes(updatedList);
        localStorage.setItem('antaryudh_cached_notes', JSON.stringify(updatedList));

        try {
          const res = await axios.post(`${API_BASE}/notes`, payload);
          if (res.data && res.data.id) {
            setNotes((prev) => prev.map((n) => (n.id === tempId ? res.data : n)));
          }
        } catch (err) {
          console.warn('Failed to save note to backend:', err.message);
        }
      }

      setIsNoteModalOpen(false);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (id) => {
    const updatedList = notes.filter((n) => n.id !== id);
    setNotes(updatedList);
    localStorage.setItem('antaryudh_cached_notes', JSON.stringify(updatedList));
    setNoteDeleteTarget(null);

    try {
      await axios.delete(`${API_BASE}/notes/${id}`);
    } catch (err) {
      console.warn('Failed to delete note from backend:', err.message);
    }
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (selectedNoteCategory !== 'All' && n.category !== selectedNoteCategory) return false;
        if (onlySecrets && !n.isSecret) return false;
        if (onlyPinned && !n.isPinned) return false;

        if (noteSearch.trim()) {
          const q = noteSearch.toLowerCase().trim();
          const titleMatch = (n.title || '').toLowerCase().includes(q);
          const catMatch = (n.category || '').toLowerCase().includes(q);
          const contentMatch = (n.content || '').toLowerCase().includes(q);
          if (!titleMatch && !catMatch && !contentMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (b.isPinned !== a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });
  }, [notes, selectedNoteCategory, onlySecrets, onlyPinned, noteSearch]);

  // =================== BUY ITEMS HANDLERS ===================
  const handleOpenBuyModal = (item = null) => {
    if (item) {
      setEditingBuyItem(item);
      setNewBuyItem({
        title: item.title,
        category: item.category,
        estimatedCost: String(item.estimatedCost || ''),
        savedAmount: String(item.savedAmount || ''),
        priority: item.priority || 'High'
      });
    } else {
      setEditingBuyItem(null);
      setNewBuyItem({
        title: '',
        category: 'Tech & Gear',
        estimatedCost: '',
        savedAmount: '',
        priority: 'High'
      });
    }
    setIsBuyModalOpen(true);
  };

  const handleSaveBuyItem = async (e) => {
    e.preventDefault();
    if (!newBuyItem.title.trim() || isSubmittingBuy) return;

    const payload = {
      title: newBuyItem.title.trim(),
      category: newBuyItem.category,
      estimatedCost: parseFloat(newBuyItem.estimatedCost) || 0,
      savedAmount: parseFloat(newBuyItem.savedAmount) || 0,
      priority: newBuyItem.priority,
      status: 'planning'
    };

    setIsSubmittingBuy(true);
    try {
      if (editingBuyItem) {
        const updated = buyItems.map((i) => (i.id === editingBuyItem.id ? { ...i, ...payload } : i));
        setBuyItems(updated);
        localStorage.setItem('antaryudh_cached_buy_items', JSON.stringify(updated));

        try {
          await axios.put(`${API_BASE}/buy/${editingBuyItem.id}`, payload);
        } catch (err) {
          console.warn('Failed to update buy item:', err.message);
        }
      } else {
        const tempId = Date.now();
        const item = { id: tempId, ...payload };
        const updated = [item, ...buyItems];
        setBuyItems(updated);
        localStorage.setItem('antaryudh_cached_buy_items', JSON.stringify(updated));

        try {
          const res = await axios.post(`${API_BASE}/buy`, payload);
          if (res.data && res.data.id) {
            setBuyItems((prev) => prev.map((i) => (i.id === tempId ? res.data : i)));
          }
        } catch (err) {
          console.warn('Failed to save buy item to backend:', err.message);
        }
      }

      setIsBuyModalOpen(false);
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  const handleDeleteBuyItem = async (id) => {
    const updated = buyItems.filter((i) => i.id !== id);
    setBuyItems(updated);
    localStorage.setItem('antaryudh_cached_buy_items', JSON.stringify(updated));
    setBuyDeleteTarget(null);

    try {
      await axios.delete(`${API_BASE}/buy/${id}`);
    } catch (err) {
      console.warn('Failed to delete buy item from backend:', err.message);
    }
  };

  const totalBuyCost = buyItems.reduce((sum, i) => sum + (parseFloat(i.estimatedCost) || 0), 0);
  const totalBuySaved = buyItems.reduce((sum, i) => sum + (parseFloat(i.savedAmount) || 0), 0);

  return (
    <div className="space-y-3.5 sm:space-y-6 animate-fadeIn font-sans selection:bg-indigo-500 selection:text-white max-w-full overflow-hidden">
      {/* 1. Header Banner with View Switcher (Responsive for all screen sizes) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-indigo-600/20 text-white shrink-0">
                {activeSubTab === 'notes' ? (
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight truncate">
                    {activeSubTab === 'notes' ? 'Personal Notes & Secret Vault' : 'Buy & Planned Purchases'}
                  </h2>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold font-mono shrink-0">
                    {activeSubTab === 'notes' ? `${notes.length} Notes` : `${buyItems.length} Items`}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate hidden sm:block">
                  {activeSubTab === 'notes'
                    ? 'Secure storage for passwords, PINs, important numbers, and personal notes with title identification'
                    : 'Plan capital purchases, evaluate priorities, and track earmarked funds for upcoming acquisitions'}
                </p>
              </div>
            </div>

            {/* Top Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              {activeSubTab === 'notes' ? (
                <button
                  type="button"
                  onClick={() => handleOpenNoteModal()}
                  className="w-full sm:w-auto px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/20 transition active:scale-95 touch-manipulation flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Note</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenBuyModal()}
                  className="w-full sm:w-auto px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-600/20 transition active:scale-95 touch-manipulation flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Planned Item</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-tab Navigation Pill Switcher */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800/80 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveSubTab('notes')}
              className={clsx(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation',
                activeSubTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              )}
            >
              <FolderLock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Notes & Vault</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white font-mono shrink-0">
                {notes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('buy')}
              className={clsx(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation',
                activeSubTab === 'buy'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Planned Buys</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white font-mono shrink-0">
                {buyItems.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: PERSONAL NOTES & SECRET VAULT                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'notes' && (
        <div className="space-y-3 sm:space-y-4 animate-fadeIn">
          {/* Notes Filter & Search Bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 sm:p-4 rounded-2xl shadow-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder="Search notes by title, number, content..."
                  className="w-full pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                {noteSearch && (
                  <button
                    type="button"
                    onClick={() => setNoteSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Toggle Filters */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOnlySecrets(!onlySecrets)}
                  className={clsx(
                    'px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation',
                    onlySecrets
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Secrets</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyPinned(!onlyPinned)}
                  className={clsx(
                    'px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation',
                    onlyPinned
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pinned</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs -mx-1 px-1 sm:mx-0 sm:px-0">
              {NOTE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedNoteCategory(cat)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 touch-manipulation shrink-0',
                    selectedNoteCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800/80'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="py-10 sm:py-14 px-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-white">No Notes Stored Yet</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                  {noteSearch || selectedNoteCategory !== 'All'
                    ? 'No notes match your search criteria.'
                    : 'Transfer your phone notes, passwords, PINs, and important numbers here safely with clear titles.'}
                </p>
              </div>
              <button
                onClick={() => handleOpenNoteModal()}
                className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                + Create Your First Note
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {filteredNotes.map((note) => {
                const colorConfig =
                  NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    colorConfig={colorConfig}
                    isRevealed={Boolean(revealedSecrets[note.id])}
                    isCopied={copiedNoteId === note.id}
                    onTogglePin={handleTogglePin}
                    onToggleReveal={handleToggleReveal}
                    onCopy={handleCopyNote}
                    onEdit={handleOpenNoteModal}
                    onDelete={setNoteDeleteTarget}
                    formatDate={formatDate}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: PLANNED BUYS & ASSET HUB                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'buy' && (
        <div className="space-y-3 sm:space-y-4 animate-fadeIn">
          {/* Buy Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Total Planned Value</span>
              <div className="text-lg sm:text-2xl font-bold font-mono text-amber-400 mt-0.5">
                {formatCurrency(totalBuyCost)}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Across {buyItems.length} planned items</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Earmarked Funds</span>
              <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                {formatCurrency(totalBuySaved)}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500">
                {totalBuyCost > 0 ? ((totalBuySaved / totalBuyCost) * 100).toFixed(0) : 0}% funded
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">High Priority Items</span>
              <div className="text-lg sm:text-2xl font-bold font-mono text-slate-200 mt-0.5">
                {buyItems.filter((i) => i.priority === 'High').length} Items
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Ready for purchase allocation</span>
            </div>
          </div>

          {/* Buy Items Grid */}
          {buyItems.length === 0 ? (
            <div className="py-10 sm:py-14 px-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-white">No Planned Purchases</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                  Add planned items, gadgets, or capital assets you want to buy and track allocated savings.
                </p>
              </div>
              <button
                onClick={() => handleOpenBuyModal()}
                className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-600/20 active:scale-95"
              >
                + Add Planned Item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
              {buyItems.map((item) => (
                <BuyItemCard
                  key={item.id}
                  item={item}
                  formatCurrency={formatCurrency}
                  onEdit={handleOpenBuyModal}
                  onDelete={setBuyDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT NOTE (Rendered in Body Portal for True Viewport Center) */}
      {/* ========================================================================= */}
      {isNoteModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingNote) setIsNoteModalOpen(false);
            }}
            className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md select-none"
            style={{ margin: 0, top: 0, left: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-3.5 my-auto max-h-[90vh] overflow-y-auto animate-fadeIn select-text"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      {editingNote ? 'Edit Note' : 'Create New Note'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Store with a clear title for quick reference & lookup
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingNote}
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-3">
                {/* Note Title */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Note Title * <span className="text-[10px] text-slate-500 font-normal">(e.g. Demat & TOTP, HDFC Debit PIN, WiFi Key)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Demat Account Passwords & Numbers"
                    value={noteFormTitle}
                    onChange={(e) => setNoteFormTitle(e.target.value)}
                    disabled={isSubmittingNote}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* Category & Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={noteFormCategory}
                      onChange={(e) => setNoteFormCategory(e.target.value)}
                      disabled={isSubmittingNote}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="Passwords & PINs">Passwords & PINs</option>
                      <option value="Important Numbers">Important Numbers</option>
                      <option value="Credentials & Keys">Credentials & Keys</option>
                      <option value="Finance & Demat">Finance & Demat</option>
                      <option value="Personal & Family">Personal & Family</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">Card Theme</label>
                    <select
                      value={noteFormColor}
                      onChange={(e) => setNoteFormColor(e.target.value)}
                      disabled={isSubmittingNote}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                    >
                      {NOTE_COLORS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} Theme
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                    Note Content / Numbers / Keys *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter passwords, account numbers, PINs, or confidential notes here..."
                    value={noteFormContent}
                    onChange={(e) => setNoteFormContent(e.target.value)}
                    disabled={isSubmittingNote}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* Secret & Pin Toggles */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={noteFormIsSecret}
                      onChange={(e) => setNoteFormIsSecret(e.target.checked)}
                      disabled={isSubmittingNote}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 w-4 h-4 cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span>Conceal / Mask as Secret</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={noteFormIsPinned}
                      onChange={(e) => setNoteFormIsPinned(e.target.checked)}
                      disabled={isSubmittingNote}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950 w-4 h-4 cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                      <Pin className="w-3 h-3 text-amber-400" />
                      <span>Pin to top</span>
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingNote}
                    onClick={() => setIsNoteModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNote}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingNote && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingNote ? 'Saving Note...' : editingNote ? 'Save Changes' : 'Create Note'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE NOTE CONFIRM (Rendered in Body Portal)                       */}
      {/* ========================================================================= */}
      {noteDeleteTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setNoteDeleteTarget(null);
            }}
            className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
            style={{ margin: 0, top: 0, left: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-rose-500/30 rounded-2xl sm:rounded-3xl max-w-xs w-full p-4 sm:p-5 shadow-2xl space-y-3 animate-fadeIn my-auto"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Delete Note?</h4>
                  <p className="text-[11px] text-slate-400">
                    Are you sure you want to delete <strong className="text-white font-mono">"{noteDeleteTarget.title}"</strong>?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNoteDeleteTarget(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(noteDeleteTarget.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PLANNED BUY ITEM (Rendered in Body Portal)               */}
      {/* ========================================================================= */}
      {isBuyModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingBuy) setIsBuyModalOpen(false);
            }}
            className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
            style={{ margin: 0, top: 0, left: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-3.5 my-auto max-h-[90vh] overflow-y-auto animate-fadeIn select-text"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  <span>{editingBuyItem ? 'Edit Planned Item' : 'Add Planned Item'}</span>
                </h3>
                <button 
                  type="button"
                  disabled={isSubmittingBuy}
                  onClick={() => setIsBuyModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBuyItem} className="space-y-3">
                <div>
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Item Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony Alpha Camera"
                    value={newBuyItem.title}
                    onChange={(e) => setNewBuyItem({ ...newBuyItem, title: e.target.value })}
                    disabled={isSubmittingBuy}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Estimated Cost (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      value={newBuyItem.estimatedCost}
                      onChange={(e) => setNewBuyItem({ ...newBuyItem, estimatedCost: e.target.value })}
                      disabled={isSubmittingBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Allocated Funds (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      value={newBuyItem.savedAmount}
                      onChange={(e) => setNewBuyItem({ ...newBuyItem, savedAmount: e.target.value })}
                      disabled={isSubmittingBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={newBuyItem.category}
                      onChange={(e) => setNewBuyItem({ ...newBuyItem, category: e.target.value })}
                      disabled={isSubmittingBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="Tech & Gear">Tech & Gear</option>
                      <option value="Precious Metals">Precious Metals</option>
                      <option value="Workspace">Workspace</option>
                      <option value="Travel & Gear">Travel & Gear</option>
                      <option value="Vehicle">Vehicle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Priority</label>
                    <select
                      value={newBuyItem.priority}
                      onChange={(e) => setNewBuyItem({ ...newBuyItem, priority: e.target.value })}
                      disabled={isSubmittingBuy}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingBuy}
                    onClick={() => setIsBuyModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBuy}
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-600/30 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingBuy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingBuy ? 'Saving...' : editingBuyItem ? 'Save Changes' : 'Add Item'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE BUY ITEM CONFIRM (Rendered in Body Portal)                   */}
      {/* ========================================================================= */}
      {buyDeleteTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setBuyDeleteTarget(null);
            }}
            className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
            style={{ margin: 0, top: 0, left: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-rose-500/30 rounded-2xl sm:rounded-3xl max-w-xs w-full p-4 sm:p-5 shadow-2xl space-y-3 animate-fadeIn my-auto"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Delete Item?</h4>
                  <p className="text-[11px] text-slate-400">
                    Are you sure you want to remove <strong className="text-white">"{buyDeleteTarget.title}"</strong>?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBuyDeleteTarget(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBuyItem(buyDeleteTarget.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL: 5-DIGIT PIN VAULT VERIFICATION (PIN: 14110)                        */}
      {/* ========================================================================= */}
      <PinVerificationModal
        isOpen={pinModalState.isOpen}
        targetNoteTitle={pinModalState.noteTitle}
        onSuccess={() => {
          if (pinModalState.noteId) {
            setRevealedSecrets((prev) => ({
              ...prev,
              [pinModalState.noteId]: true
            }));
          }
        }}
        onClose={() =>
          setPinModalState({
            isOpen: false,
            noteId: null,
            noteTitle: ''
          })
        }
      />
    </div>
  );
}
