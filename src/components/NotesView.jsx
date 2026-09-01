import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCheck
} from 'lucide-react';

import cacheManager from '../utils/cacheManager';

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
  { id: 'indigo', name: 'Indigo', border: 'border-indigo-500/30', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', glow: 'hover:border-indigo-500/50' },
  { id: 'amber', name: 'Amber', border: 'border-amber-500/30', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', glow: 'hover:border-amber-500/50' },
  { id: 'emerald', name: 'Emerald', border: 'border-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', glow: 'hover:border-emerald-500/50' },
  { id: 'rose', name: 'Rose', border: 'border-rose-500/30', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30', glow: 'hover:border-rose-500/50' },
  { id: 'cyan', name: 'Cyan', border: 'border-cyan-500/30', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', glow: 'hover:border-cyan-500/50' },
  { id: 'purple', name: 'Purple', border: 'border-purple-500/30', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', glow: 'hover:border-purple-500/50' }
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
  // Copied feedback map (noteId -> boolean)
  const [copiedNoteId, setCopiedNoteId] = useState(null);

  // Add/Edit Note Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
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

  // Toggle Secret Reveal
  const toggleRevealSecret = (noteId) => {
    setRevealedSecrets((prev) => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
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
    if (!noteFormTitle.trim()) return;

    const payload = {
      title: noteFormTitle.trim(),
      content: noteFormContent.trim(),
      category: noteFormCategory,
      isSecret: noteFormIsSecret,
      isPinned: noteFormIsPinned,
      color: noteFormColor
    };

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
    if (!newBuyItem.title.trim()) return;

    const payload = {
      title: newBuyItem.title.trim(),
      category: newBuyItem.category,
      estimatedCost: parseFloat(newBuyItem.estimatedCost) || 0,
      savedAmount: parseFloat(newBuyItem.savedAmount) || 0,
      priority: newBuyItem.priority,
      status: 'planning'
    };

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

    setNewBuyItem({ title: '', category: 'Tech & Gear', estimatedCost: '', savedAmount: '', priority: 'High' });
    setIsBuyModalOpen(false);
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
                  <h2 className="text-xs sm:text-base md:text-lg font-black text-white tracking-tight truncate">
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
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {activeSubTab === 'notes' ? (
                <button
                  onClick={() => handleOpenNoteModal()}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/20 transition active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>New Note</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenBuyModal()}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-600/20 transition active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Add Planned Item</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-tab Navigation Pill Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800/80 w-fit">
            <button
              onClick={() => setActiveSubTab('notes')}
              className={clsx(
                'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95',
                activeSubTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              )}
            >
              <FolderLock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Notes & Passwords</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white font-mono">
                {notes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('buy')}
              className={clsx(
                'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95',
                activeSubTab === 'buy'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              )}
            >
              <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Planned Buys</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white font-mono">
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
                  className="w-full pl-8 pr-7 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                {noteSearch && (
                  <button
                    onClick={() => setNoteSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick Toggle Filters */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setOnlySecrets(!onlySecrets)}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition active:scale-95',
                    onlySecrets
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Secrets</span>
                </button>

                <button
                  onClick={() => setOnlyPinned(!onlyPinned)}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition active:scale-95',
                    onlyPinned
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Pin className="w-3 h-3 text-amber-400" />
                  <span>Pinned</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {NOTE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedNoteCategory(cat)}
                  className={clsx(
                    'px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition active:scale-95 shrink-0',
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
                const isRevealed = revealedSecrets[note.id];
                const isCopied = copiedNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className={clsx(
                      'p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 shadow-md relative flex flex-col justify-between group overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950',
                      colorConfig.border,
                      colorConfig.glow,
                      note.isPinned && 'ring-1 ring-amber-500/40'
                    )}
                  >
                    {/* Top Bar: Title, Category Badge & Pin */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={clsx(
                                'text-[9px] font-bold px-2 py-0.2 rounded-full border font-mono',
                                colorConfig.badge
                              )}
                            >
                              {note.category || 'General'}
                            </span>
                            {note.isSecret ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-rose-400" />
                                <span>Secret</span>
                              </span>
                            ) : null}
                          </div>

                          {/* NOTE TITLE (Clearly identifiable) */}
                          <h3 className="text-xs sm:text-sm font-bold text-white mt-1 tracking-tight break-words">
                            {note.title}
                          </h3>
                        </div>

                        {/* Pin Button */}
                        <button
                          onClick={() => handleTogglePin(note)}
                          className={clsx(
                            'p-1.5 rounded-lg border transition active:scale-95 shrink-0',
                            note.isPinned
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border-slate-800'
                          )}
                          title={note.isPinned ? 'Unpin Note' : 'Pin Note to Top'}
                        >
                          <Pin
                            className={clsx(
                              'w-3.5 h-3.5',
                              note.isPinned && 'fill-amber-400 text-amber-400'
                            )}
                          />
                        </button>
                      </div>

                      {/* NOTE BODY CONTENT */}
                      <div className="bg-slate-950/90 rounded-xl p-2.5 sm:p-3 border border-slate-800/80 text-xs font-mono relative overflow-hidden">
                        {note.isSecret && !isRevealed ? (
                          <div className="flex items-center justify-between text-slate-500 py-1">
                            <span className="tracking-widest font-black text-slate-400 text-xs sm:text-sm truncate">
                              ••••••••••••••••••••
                            </span>
                            <button
                              onClick={() => toggleRevealSecret(note.id)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans font-semibold ml-2 shrink-0"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Show</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <pre className="whitespace-pre-wrap font-mono text-slate-200 text-[11px] sm:text-xs break-words leading-relaxed select-all max-h-48 overflow-y-auto">
                              {note.content || '—'}
                            </pre>
                            {note.isSecret && isRevealed && (
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => toggleRevealSecret(note.id)}
                                  className="text-[10px] text-slate-400 hover:text-slate-300 flex items-center gap-1 font-sans"
                                >
                                  <EyeOff className="w-3 h-3" />
                                  <span>Hide</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-xs text-slate-400">
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">
                        {formatDate(note.updatedAt || note.createdAt)}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1-Click Copy Button */}
                        <button
                          onClick={() => handleCopyNote(note)}
                          className={clsx(
                            'p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition active:scale-95',
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
                          )}
                          title="Copy content"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-[9px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span className="text-[9px]">Copy</span>
                            </>
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenNoteModal(note)}
                          className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition active:scale-95"
                          title="Edit Note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setNoteDeleteTarget(note)}
                          className="p-1.5 rounded-lg bg-slate-950 text-rose-400/80 hover:text-rose-300 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-500/30 transition active:scale-95"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
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
              {buyItems.map((item) => {
                const fundedPercent =
                  item.estimatedCost > 0
                    ? ((item.savedAmount / item.estimatedCost) * 100).toFixed(0)
                    : '0';
                const isReady = item.savedAmount >= item.estimatedCost && item.estimatedCost > 0;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-5 shadow-lg space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.category}
                          </span>
                          <span
                            className={clsx(
                              'text-[9px] font-bold px-2 py-0.2 rounded-full',
                              item.priority === 'High'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : item.priority === 'Medium'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            )}
                          >
                            {item.priority} Priority
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-base font-bold text-white mt-1 break-words">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isReady && (
                          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ready</span>
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenBuyModal(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white transition"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setBuyDeleteTarget(item)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
                        <span className="text-slate-400">Saved: {formatCurrency(item.savedAmount)}</span>
                        <span className="text-amber-300 font-semibold">
                          Cost: {formatCurrency(item.estimatedCost)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-500',
                            isReady ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          )}
                          style={{ width: `${Math.min(parseFloat(fundedPercent), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT NOTE                                                    */}
      {/* ========================================================================= */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-3.5 my-auto max-h-[90vh] overflow-y-auto">
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
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={noteFormCategory}
                    onChange={(e) => setNoteFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Secret & Pin Toggles */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={noteFormIsSecret}
                    onChange={(e) => setNoteFormIsSecret(e.target.checked)}
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
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
                >
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE NOTE CONFIRM                                                */}
      {/* ========================================================================= */}
      {noteDeleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-xs w-full p-4 sm:p-5 shadow-2xl space-y-3">
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
                onClick={() => setNoteDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNote(noteDeleteTarget.id)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PLANNED BUY ITEM                                        */}
      {/* ========================================================================= */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-3.5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <span>{editingBuyItem ? 'Edit Planned Item' : 'Add Planned Item'}</span>
              </h3>
              <button onClick={() => setIsBuyModalOpen(false)} className="text-slate-400 hover:text-white">
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newBuyItem.category}
                    onChange={(e) => setNewBuyItem({ ...newBuyItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
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
                  onClick={() => setIsBuyModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-600/30"
                >
                  {editingBuyItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE BUY ITEM CONFIRM                                            */}
      {/* ========================================================================= */}
      {buyDeleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-xs w-full p-4 sm:p-5 shadow-2xl space-y-3">
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
                onClick={() => setBuyDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBuyItem(buyDeleteTarget.id)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
