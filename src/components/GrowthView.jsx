import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import cacheManager from '../utils/cacheManager';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Bookmark,
  Layers,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  FileText,
  Target,
  Award,
  Zap,
  Tag,
  BookMarked
} from 'lucide-react';

const SKILL_CATEGORIES = [
  'Coding & Tech',
  'Finance & Trading',
  'AI & Data Science',
  'Business & Startups',
  'Design & Creative',
  'Communication & Leadership',
  'Languages',
  'Other'
];

const BOOK_CATEGORIES = [
  'Finance & Investing',
  'Trading & Economics',
  'Psychology & Mindset',
  'Business & Biography',
  'Tech & Engineering',
  'Self-Help & Productivity',
  'Philosophy & Science',
  'Fiction & Literature',
  'Other'
];

export default function GrowthView() {
  // State for Skills
  const [skills, setSkills] = useState(() => {
    const cached = cacheManager.get('learning_skills_list');
    return Array.isArray(cached) ? cached : [];
  });
  const [skillSearch, setSkillSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('All'); // 'All' | 'Learning' | 'Planned' | 'Completed'

  // State for Books
  const [books, setBooks] = useState(() => {
    const cached = cacheManager.get('reading_books_list');
    return Array.isArray(cached) ? cached : [];
  });
  const [bookSearch, setBookSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('All'); // 'All' | 'Reading' | 'Want to Read' | 'Completed'

  const [loading, setLoading] = useState(false);

  // Modal states
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'skill' | 'book', id, title }

  // Fetch live Skills & Books
  const fetchData = async () => {
    setLoading(true);
    try {
      const [skillsRes, booksRes] = await Promise.allSettled([
        axios.get('/api/skills'),
        axios.get('/api/books')
      ]);

      if (skillsRes.status === 'fulfilled' && Array.isArray(skillsRes.value.data)) {
        setSkills(skillsRes.value.data);
        cacheManager.set('learning_skills_list', skillsRes.value.data, 120000);
        localStorage.setItem('antaryudh_cached_skills', JSON.stringify(skillsRes.value.data));
      }

      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value.data)) {
        setBooks(booksRes.value.data);
        cacheManager.set('reading_books_list', booksRes.value.data, 120000);
        localStorage.setItem('antaryudh_cached_books', JSON.stringify(booksRes.value.data));
      }
    } catch (err) {
      console.warn('Failed to fetch growth hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick skill progress patch
  const handleSkillProgressStep = async (id, currentProgress, delta) => {
    const newProgress = Math.min(100, Math.max(0, currentProgress + delta));
    const newStatus = newProgress === 100 ? 'Completed' : (newProgress > 0 ? 'Learning' : 'Planned');

    // Optimistic UI update
    setSkills(prev => prev.map(s => s.id === id ? { ...s, progress: newProgress, status: newStatus } : s));

    try {
      await axios.patch(`/api/skills/${id}/progress`, { progress: newProgress, status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update skill progress:', err);
      fetchData();
    }
  };

  // Quick skill status toggle
  const handleSkillStatusChange = async (id, newStatus) => {
    const newProgress = newStatus === 'Completed' ? 100 : (newStatus === 'Planned' ? 0 : 25);
    setSkills(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, progress: newProgress } : s));

    try {
      await axios.patch(`/api/skills/${id}/progress`, { status: newStatus, progress: newProgress });
      fetchData();
    } catch (err) {
      console.error('Failed to update skill status:', err);
      fetchData();
    }
  };

  // Quick book status change
  const handleBookStatusChange = async (id, newStatus) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

    try {
      await axios.patch(`/api/books/${id}/progress`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update book status:', err);
      fetchData();
    }
  };

  // Quick book rating change
  const handleBookRatingChange = async (id, newRating) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, rating: newRating } : b));

    try {
      await axios.patch(`/api/books/${id}/progress`, { rating: newRating });
      fetchData();
    } catch (err) {
      console.error('Failed to update book rating:', err);
      fetchData();
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;

    try {
      if (type === 'skill') {
        await axios.delete(`/api/skills/${id}`);
        setSkills(prev => prev.filter(s => s.id !== id));
      } else {
        await axios.delete(`/api/books/${id}`);
        setBooks(prev => prev.filter(b => b.id !== id));
      }
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Filtered Skills
  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchesSearch = (s.name || '').toLowerCase().includes(skillSearch.toLowerCase()) ||
                            (s.category || '').toLowerCase().includes(skillSearch.toLowerCase()) ||
                            (s.notes || '').toLowerCase().includes(skillSearch.toLowerCase());
      const matchesStatus = skillFilter === 'All' || s.status === skillFilter;
      return matchesSearch && matchesStatus;
    });
  }, [skills, skillSearch, skillFilter]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesSearch = (b.title || '').toLowerCase().includes(bookSearch.toLowerCase()) ||
                            (b.author || '').toLowerCase().includes(bookSearch.toLowerCase()) ||
                            (b.category || '').toLowerCase().includes(bookSearch.toLowerCase()) ||
                            (b.keyTakeaways || '').toLowerCase().includes(bookSearch.toLowerCase());
      const matchesStatus = bookFilter === 'All' || b.status === bookFilter;
      return matchesSearch && matchesStatus;
    });
  }, [books, bookSearch, bookFilter]);

  // Skill stats
  const skillStats = useMemo(() => {
    const total = skills.length;
    const learning = skills.filter(s => s.status === 'Learning').length;
    const completed = skills.filter(s => s.status === 'Completed').length;
    const planned = skills.filter(s => s.status === 'Planned').length;
    return { total, learning, completed, planned };
  }, [skills]);

  // Book stats
  const bookStats = useMemo(() => {
    const total = books.length;
    const reading = books.filter(b => b.status === 'Reading').length;
    const completed = books.filter(b => b.status === 'Completed').length;
    const wantToRead = books.filter(b => b.status === 'Want to Read').length;
    return { total, reading, completed, wantToRead };
  }, [books]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-sans max-w-full">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-4 sm:p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                Knowledge & Mastery Hub
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold font-mono">
                Skills & Reading
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white font-mono">
              Skills Roadmap & Books To Read
            </h1>

            <p className="text-xs text-slate-400">
              Track skill acquisition pipelines side-by-side with reading lists, key takeaways, and learning milestones.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => { setEditingSkill(null); setSkillModalOpen(true); }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>+ Add Skill</span>
            </button>

            <button
              onClick={() => { setEditingBook(null); setBookModalOpen(true); }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>+ Add Book</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Dual Column Grid (Left: Skills to Learn, Right: Books to Read) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: SKILLS TO LEARN */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Skills To Learn</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    {skills.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  <span className="text-cyan-400 font-bold">{skillStats.learning} Learning</span>
                  <span>•</span>
                  <span>{skillStats.planned} Planned</span>
                  <span>•</span>
                  <span className="text-emerald-400">{skillStats.completed} Mastered</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setEditingSkill(null); setSkillModalOpen(true); }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search skills, categories, notes..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {skillSearch && (
                <button
                  onClick={() => setSkillSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['All', 'Learning', 'Planned', 'Completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSkillFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                    skillFilter === tab
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Cards List */}
          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {filteredSkills.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-2">
                <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No skills found matching filter.</p>
                <button
                  onClick={() => { setEditingSkill(null); setSkillModalOpen(true); }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline font-mono"
                >
                  + Add your first skill
                </button>
              </div>
            ) : (
              filteredSkills.map((skill) => {
                const isCompleted = skill.status === 'Completed';
                const isLearning = skill.status === 'Learning';

                return (
                  <div
                    key={skill.id}
                    className={`group p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
                      isCompleted
                        ? 'bg-slate-950/40 border-emerald-500/30'
                        : isLearning
                        ? 'bg-slate-950/80 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Title + Category Badge + Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight break-words">
                            {skill.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.2 rounded-md font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {skill.category || 'Skill'}
                          </span>
                          {skill.priority === 'High' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              High Priority
                            </span>
                          )}
                        </div>

                        {skill.targetDate && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            <span>Target: {new Date(skill.targetDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() => { setEditingSkill(skill); setSkillModalOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                          title="Edit Skill"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'skill', id: skill.id, title: skill.name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Quick Adjust */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Mastery Progress</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSkillProgressStep(skill.id, skill.progress || 0, -10)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                            title="-10%"
                          >
                            -10%
                          </button>
                          <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-cyan-400'}`}>
                            {skill.progress || 0}%
                          </span>
                          <button
                            onClick={() => handleSkillProgressStep(skill.id, skill.progress || 0, 10)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                            title="+10%"
                          >
                            +10%
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, skill.progress || 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono">
                      <div className="flex items-center gap-1">
                        {['Planned', 'Learning', 'Completed'].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleSkillStatusChange(skill.id, st)}
                            className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              skill.status === st
                                ? st === 'Completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                                  : st === 'Learning'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                                  : 'bg-slate-800 text-slate-200 border-slate-700 font-bold'
                                : 'bg-slate-950 text-slate-500 border-slate-800/80 hover:text-slate-300'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      {skill.resources && (
                        <span className="text-[10px] text-cyan-400/90 truncate max-w-[150px]" title={skill.resources}>
                          🔗 {skill.resources}
                        </span>
                      )}
                    </div>

                    {/* Notes Snippet */}
                    {skill.notes && (
                      <p className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                        {skill.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: BOOKS TO READ */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Books To Read</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {books.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  <span className="text-amber-400 font-bold">{bookStats.reading} Reading</span>
                  <span>•</span>
                  <span>{bookStats.wantToRead} Want to Read</span>
                  <span>•</span>
                  <span className="text-emerald-400">{bookStats.completed} Finished</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setEditingBook(null); setBookModalOpen(true); }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search books, authors, genres, takeaways..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
              {bookSearch && (
                <button
                  onClick={() => setBookSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['All', 'Reading', 'Want to Read', 'Completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBookFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                    bookFilter === tab
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Books Cards List */}
          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {filteredBooks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No books found matching filter.</p>
                <button
                  onClick={() => { setEditingBook(null); setBookModalOpen(true); }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline font-mono"
                >
                  + Add your first book
                </button>
              </div>
            ) : (
              filteredBooks.map((book) => {
                const isCompleted = book.status === 'Completed';
                const isReading = book.status === 'Reading';
                const pagesRatio = book.totalPages > 0
                  ? Math.min(100, Math.round(((book.progressPages || 0) / book.totalPages) * 100))
                  : (isCompleted ? 100 : 0);

                return (
                  <div
                    key={book.id}
                    className={`group p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
                      isCompleted
                        ? 'bg-slate-950/40 border-emerald-500/30'
                        : isReading
                        ? 'bg-slate-950/80 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Book Title + Author + Badges + Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight break-words flex items-center gap-1.5">
                            <BookMarked className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{book.title}</span>
                          </h4>
                          <span className="text-[10px] px-2 py-0.2 rounded-md font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {book.category || 'Book'}
                          </span>
                        </div>

                        {book.author && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            by <span className="text-slate-200">{book.author}</span>
                          </div>
                        )}
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() => { setEditingBook(book); setBookModalOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
                          title="Edit Book"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'book', id: book.id, title: book.title })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Reading Progress Indicator (if totalPages specified) */}
                    {book.totalPages > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">
                            Page {book.progressPages || 0} of {book.totalPages}
                          </span>
                          <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {pagesRatio}% read
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400'
                            }`}
                            style={{ width: `${pagesRatio}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Status & Star Rating Row */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono">
                      {/* Status Chips */}
                      <div className="flex items-center gap-1">
                        {['Want to Read', 'Reading', 'Completed'].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleBookStatusChange(book.id, st)}
                            className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              book.status === st
                                ? st === 'Completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                                  : st === 'Reading'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                  : 'bg-slate-800 text-slate-200 border-slate-700 font-bold'
                                : 'bg-slate-950 text-slate-500 border-slate-800/80 hover:text-slate-300'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-0.5" title={`${book.rating || 0} Stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleBookRatingChange(book.id, star === book.rating ? 0 : star)}
                            className="p-0.5 hover:scale-125 transition cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                star <= (book.rating || 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Key Takeaways Quote Box */}
                    {book.keyTakeaways && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 italic">
                        <span className="font-bold text-amber-400 not-italic block text-[10px] uppercase font-mono tracking-wider mb-0.5">
                          💡 Key Takeaway
                        </span>
                        "{book.keyTakeaways}"
                      </div>
                    )}

                    {/* Notes Snippet */}
                    {book.notes && (
                      <p className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                        {book.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SKILL MODAL (ADD / EDIT) */}
      {/* ========================================================= */}
      {skillModalOpen && (
        <SkillModal
          isOpen={skillModalOpen}
          initialData={editingSkill}
          onClose={() => setSkillModalOpen(false)}
          onSuccess={() => { setSkillModalOpen(false); fetchData(); }}
        />
      )}

      {/* ========================================================= */}
      {/* 4. BOOK MODAL (ADD / EDIT) */}
      {/* ========================================================= */}
      {bookModalOpen && (
        <BookModal
          isOpen={bookModalOpen}
          initialData={editingBook}
          onClose={() => setBookModalOpen(false)}
          onSuccess={() => { setBookModalOpen(false); fetchData(); }}
        />
      )}

      {/* ========================================================= */}
      {/* 5. DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deleteConfirm && (
        <DeleteModal
          isOpen={!!deleteConfirm}
          target={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MODAL: ADD / EDIT SKILL
// -------------------------------------------------------------
function SkillModal({ isOpen, initialData, onClose, onSuccess }) {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || 'Coding & Tech');
  const [status, setStatus] = useState(initialData?.status || 'Planned');
  const [priority, setPriority] = useState(initialData?.priority || 'Medium');
  const [progress, setProgress] = useState(initialData?.progress || 0);
  const [targetDate, setTargetDate] = useState(initialData?.targetDate ? initialData.targetDate.slice(0, 10) : '');
  const [resources, setResources] = useState(initialData?.resources || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Esc key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a skill name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        category,
        status,
        priority,
        progress: parseInt(progress, 10) || 0,
        targetDate: targetDate || null,
        resources: resources.trim(),
        notes: notes.trim()
      };

      if (initialData?.id) {
        await axios.put(`/api/skills/${initialData.id}`, payload);
      } else {
        await axios.post('/api/skills', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' && createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto relative z-[100000]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialData?.id ? 'Edit Learning Skill' : 'Add New Skill'}
              </h3>
              <p className="text-xs text-slate-400">Track milestones and mastery progression</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Skill Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Skill Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Next.js App Router, Technical Analysis, PyTorch..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value;
                  setStatus(s);
                  if (s === 'Completed') setProgress(100);
                  if (s === 'Planned' && progress === 100) setProgress(0);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="Planned">Planned</option>
                <option value="Learning">Learning (In Progress)</option>
                <option value="Completed">Completed (Mastered)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Progress: {progress}%</label>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => {
                  const p = parseInt(e.target.value, 10);
                  setProgress(p);
                  if (p === 100) setStatus('Completed');
                  else if (p > 0 && status === 'Planned') setStatus('Learning');
                }}
                className="w-full accent-indigo-500 cursor-pointer mt-2"
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Completion Date (Optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Resources / Links */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Resources / Course Links (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Documentation, Udemy course, YouTube series..."
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Personal Notes / Milestones</label>
            <textarea
              rows="3"
              placeholder="Key concepts to master, mini-projects to build..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? 'Saving...' : initialData?.id ? 'Update Skill' : 'Save Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// -------------------------------------------------------------
// MODAL: ADD / EDIT BOOK
// -------------------------------------------------------------
function BookModal({ isOpen, initialData, onClose, onSuccess }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [category, setCategory] = useState(initialData?.category || 'Finance & Investing');
  const [status, setStatus] = useState(initialData?.status || 'Want to Read');
  const [priority, setPriority] = useState(initialData?.priority || 'Medium');
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [progressPages, setProgressPages] = useState(initialData?.progressPages || 0);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 0);
  const [keyTakeaways, setKeyTakeaways] = useState(initialData?.keyTakeaways || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Esc key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a book title.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        author: author.trim(),
        category,
        status,
        priority,
        rating: parseInt(rating, 10) || 0,
        progressPages: parseInt(progressPages, 10) || 0,
        totalPages: parseInt(totalPages, 10) || 0,
        keyTakeaways: keyTakeaways.trim(),
        notes: notes.trim()
      };

      if (initialData?.id) {
        await axios.put(`/api/books/${initialData.id}`, payload);
      } else {
        await axios.post('/api/books', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' && createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto relative z-[100000]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialData?.id ? 'Edit Book' : 'Add Book To Read'}
              </h3>
              <p className="text-xs text-slate-400">Personal library, reading goals, and key takeaways</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Book Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Book Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. The Psychology of Money, Atomic Habits, Margin of Safety..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Author Name</label>
            <input
              type="text"
              placeholder="e.g. Morgan Housel, James Clear, Seth Klarman..."
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category / Genre</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              >
                {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reading Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              >
                <option value="Want to Read">Want to Read</option>
                <option value="Reading">Currently Reading</option>
                <option value="Completed">Completed (Finished)</option>
              </select>
            </div>
          </div>

          {/* Priority & Star Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rating</label>
              <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    className="cursor-pointer hover:scale-110 transition"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-auto font-mono">
                  {rating > 0 ? `${rating}/5 Stars` : 'No rating'}
                </span>
              </div>
            </div>
          </div>

          {/* Pages Progress */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Current Page</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={progressPages}
                onChange={(e) => setProgressPages(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Total Pages</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 350"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Key Takeaways */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">💡 Key Takeaway / Quote</label>
            <input
              type="text"
              placeholder="e.g. Compounding is not just math; it's consistency over time."
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Notes / Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Summary / Chapter Notes</label>
            <textarea
              rows="3"
              placeholder="Key lessons, quotes, actionable insights from the book..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? 'Saving...' : initialData?.id ? 'Update Book' : 'Save Book'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// -------------------------------------------------------------
// MODAL: DELETE CONFIRMATION
// -------------------------------------------------------------
function DeleteModal({ isOpen, target, onClose, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  return typeof document !== 'undefined' && createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 relative z-[100000]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Delete {target.type === 'skill' ? 'Skill' : 'Book'}?
            </h3>
            <p className="text-xs text-slate-400 font-mono truncate max-w-[220px]">
              "{target.title}"
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Are you sure you want to delete this {target.type === 'skill' ? 'skill' : 'book'}? This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
