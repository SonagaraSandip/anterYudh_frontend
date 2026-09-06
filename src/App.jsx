import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  CreditCard,
  ShoppingBag,
  Shield,
  Menu,
  X,
  ChevronRight,
  ArrowUp,
  Database,
  RefreshCw,
  Zap,
  FileText,
  Lock,
  Loader2,
  Sparkles,
  Download,
  Smartphone
} from 'lucide-react';
import axios from 'axios';
import { Cloud } from 'lucide-react';
import MainDashboard from './components/MainDashboard';
import SecurityLockScreen from './components/SecurityLockScreen';
import BackupModal from './components/BackupModal';

// Lazy load heavyweight tab components so only Dashboard is loaded on initial render
const IpoDashboard = lazy(() => import('./components/IpoDashboard'));
const TradingView = lazy(() => import('./components/TradingView'));
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const NotesView = lazy(() => import('./components/NotesView'));
const GrowthView = lazy(() => import('./components/GrowthView'));

// Modern Sleek Fallback for lazy-loaded tabs
function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4 animate-fadeIn">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20 animate-ping pointer-events-none" />
      </div>
      <div className="text-center space-y-1">
        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight font-mono">
          Loading Module Runtime...
        </h4>
        <p className="text-[11px] text-slate-400 font-medium">
          Optimizing ledger components & secure encrypted state
        </p>
      </div>
    </div>
  );
}

function App() {
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['dashboard', 'ipo', 'trading', 'expenses', 'notes', 'buy', 'growth', 'skills', 'books'].includes(hash)) {
        if (hash === 'buy') return 'notes';
        if (hash === 'skills' || hash === 'books') return 'growth';
        return hash;
      }
      if (hash === 'goal') return 'trading';

      const saved = localStorage.getItem('antaryudh_active_tab');
      if (['dashboard', 'ipo', 'trading', 'expenses', 'notes', 'buy', 'growth', 'skills', 'books'].includes(saved)) {
        if (saved === 'buy') return 'notes';
        if (saved === 'skills' || saved === 'books') return 'growth';
        return saved;
      }
      if (saved === 'goal') return 'trading';
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [sysStatus, setSysStatus] = useState({ database: 'Connecting...', isProd: false, environment: 'development' });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Listen for PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) {
      alert('To install on your phone:\n- Android Chrome: Tap menu (⋮) ➔ "Install app"\n- iOS Safari: Tap Share (⎋) ➔ "Add to Home Screen"');
      return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredInstallPrompt(null);
  };
  
  // 30-Minute Security Session Duration (30 * 60 * 1000 ms)
  const SESSION_DURATION_MS = 30 * 60 * 1000;

  // App Master 8-Digit Security State with 30-Minute Session
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const expiryStr = localStorage.getItem('antaryudh_auth_expiry');
      if (expiryStr) {
        const expiry = parseInt(expiryStr, 10);
        if (!isNaN(expiry) && Date.now() < expiry) {
          return true;
        }
      }
      // If expired, cleanup stale session tokens
      localStorage.removeItem('antaryudh_auth_expiry');
      sessionStorage.removeItem('antaryudh_authenticated');
      return false;
    } catch {
      return false;
    }
  });

  const handleUnlock = () => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem('antaryudh_auth_expiry', expiry.toString());
    sessionStorage.setItem('antaryudh_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLockApp = () => {
    localStorage.removeItem('antaryudh_auth_expiry');
    sessionStorage.removeItem('antaryudh_authenticated');
    setIsAuthenticated(false);
    setIsMobileMenuOpen(false);
  };

  // Monitor 30-minute session validity and auto-extend on user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkExpiry = () => {
      try {
        const expiryStr = localStorage.getItem('antaryudh_auth_expiry');
        if (!expiryStr || Date.now() >= parseInt(expiryStr, 10)) {
          handleLockApp();
        }
      } catch {
        handleLockApp();
      }
    };

    // Periodic check every 10 seconds
    const interval = setInterval(checkExpiry, 10000);

    // Re-verify immediately on window visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpiry();
      }
    };

    // Throttled activity refresh (extends session if user is actively working)
    let lastActivity = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 60000) {
        lastActivity = now;
        const currentExpiry = localStorage.getItem('antaryudh_auth_expiry');
        if (currentExpiry && parseInt(currentExpiry, 10) > now) {
          localStorage.setItem('antaryudh_auth_expiry', (now + SESSION_DURATION_MS).toString());
        }
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated]);

  // Background Parallel Database Connection State
  const [connectionState, setConnectionState] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  const checkDbConnection = async (isManualRetry = false) => {
    setConnectionState('connecting');
    try {
      const res = await axios.get('/api/system/status');
      if (res.data && (res.data.status === 'online' || res.data.connected)) {
        setSysStatus(res.data);
        sessionStorage.setItem('antaryudh_connected', 'true');
        setConnectionState('connected');
      } else {
        throw new Error('Database not ready');
      }
    } catch (err) {
      console.warn('System status not reachable or DB error:', err);
      setConnectionState('error');
    }
  };

  // Run DB connection check immediately in parallel while user enters password
  useEffect(() => {
    checkDbConnection();
  }, []);

  // Lock background scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsMobileMenuOpen(false);
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalStyle;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobileMenuOpen]);

  // Monitor window scroll position to toggle scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to browser hash navigation (back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['dashboard', 'ipo', 'trading', 'expenses', 'notes', 'buy', 'growth', 'skills', 'books'].includes(hash)) {
        if (hash === 'buy') setActiveTab('notes');
        else if (hash === 'skills' || hash === 'books') setActiveTab('growth');
        else setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      color: 'indigo',
      activeGradient: 'from-indigo-600 to-violet-600',
      activeText: 'text-indigo-400',
      activeBorder: 'border-indigo-500/40',
      glow: 'shadow-indigo-500/20'
    },
    {
      id: 'ipo',
      label: 'IPO Matrix',
      icon: TrendingUp,
      badge: 'Live',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      color: 'cyan',
      activeGradient: 'from-cyan-600 to-blue-600',
      activeText: 'text-cyan-400',
      activeBorder: 'border-cyan-500/40',
      glow: 'shadow-cyan-500/20'
    },
    {
      id: 'trading',
      label: 'Trading Journal',
      icon: BarChart2,
      badge: 'Pro',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      color: 'indigo',
      activeGradient: 'from-indigo-600 to-cyan-600',
      activeText: 'text-indigo-400',
      activeBorder: 'border-indigo-500/40',
      glow: 'shadow-indigo-500/20'
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: CreditCard,
      badge: 'Live',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      color: 'rose',
      activeGradient: 'from-rose-600 to-orange-600',
      activeText: 'text-rose-400',
      activeBorder: 'border-rose-500/40',
      glow: 'shadow-rose-500/20'
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: FileText,
      badge: 'Vault',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      color: 'indigo',
      activeGradient: 'from-indigo-600 via-blue-600 to-cyan-600',
      activeText: 'text-indigo-400',
      activeBorder: 'border-indigo-500/40',
      glow: 'shadow-indigo-500/20'
    },
    {
      id: 'growth',
      label: 'Skills & Books',
      icon: Sparkles,
      badge: 'New',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      color: 'amber',
      activeGradient: 'from-amber-600 via-orange-500 to-rose-500',
      activeText: 'text-amber-400',
      activeBorder: 'border-amber-500/40',
      glow: 'shadow-amber-500/20'
    }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('antaryudh_active_tab', tabId);
      window.location.hash = tabId;
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* 0. Fullscreen Master Passcode Screen with Live Background DB Connection Handshake */}
      {!isAuthenticated && (
        <SecurityLockScreen
          connectionState={connectionState}
          sysStatus={sysStatus}
          onUnlock={handleUnlock}
          onRetryConnection={() => checkDbConnection(true)}
        />
      )}

      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => handleSelectTab('dashboard')}>
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 shadow-md shadow-indigo-500/20 text-white">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  AntarYudh
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                  Wealth OS
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 tracking-wider hidden sm:block">
                Unified Finance • Trading • Cashflow • Vault
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === 'notes' && activeTab === 'buy');

              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-md ${tab.glow}`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Status Bar & Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Live Database Sync Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] font-mono shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sysStatus.isProd ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${sysStatus.isProd ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
              </span>
              <span className="text-slate-400">DB:</span>
              <span className={`font-bold ${sysStatus.isProd ? 'text-emerald-400' : 'text-amber-300'}`}>
                {sysStatus.database}
              </span>
            </div>

            {/* Cloud Backup Modal Quick Trigger Button */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono transition active:scale-95 shadow-sm shadow-indigo-500/10 cursor-pointer"
              title="Open Database Backup & Cloud Sync Manager"
            >
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>Backup</span>
            </button>

            {/* Master App Lock Button */}
            <button
              onClick={handleLockApp}
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-rose-300 border border-slate-700/60 text-xs font-bold font-mono transition active:scale-95 shadow-sm cursor-pointer"
              title="Lock Wealth OS"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Lock</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Content View Container (Lazy Loaded with Suspense for Maximum Speed) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-6">
        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === 'dashboard' && (
            <MainDashboard
              onNavigateTab={(tab) => handleSelectTab(tab)}
              onOpenBackup={() => setIsBackupModalOpen(true)}
            />
          )}
          {activeTab === 'ipo' && <IpoDashboard isEmbedded={true} />}
          {activeTab === 'trading' && <TradingView />}
          {activeTab === 'expenses' && <ExpensesView />}
          {(activeTab === 'notes' || activeTab === 'buy') && <NotesView />}
          {activeTab === 'growth' && <GrowthView />}
        </Suspense>
      </main>

      {/* Backup & Cloud Sync Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Mobile Slide-Out Side Navigation Drawer (Portaled to document.body for true full viewport overlay) */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999990] flex justify-end" style={{ margin: 0, padding: 0 }}>
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-fadeIn z-[999991]"
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[300px] sm:w-[340px] max-w-[88vw] h-[100dvh] bg-slate-900 border-l border-slate-800 shadow-2xl z-[999999] flex flex-col animate-slideInRight overflow-hidden"
          >
            {/* Drawer Top Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-white font-mono">AntarYudh</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                      OS
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400">Navigation Menu</span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation Tab List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
                Wealth OS Modules
              </div>

              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id || (tab.id === 'notes' && activeTab === 'buy');

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between cursor-pointer ${
                      isActive
                        ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-md ${tab.glow}`
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tab.badge && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : tab.badgeColor
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Pinned Bottom Section: DB Live Status, Backup & Screen Lock */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950 space-y-2 mt-auto shrink-0">
              {/* Live Database Sync Status Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Database:</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sysStatus.isProd ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${sysStatus.isProd ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                  </span>
                  <span className={`font-bold ${sysStatus.isProd ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {sysStatus.database}
                  </span>
                </div>
              </div>

              {/* PWA Install App Button (When available or on mobile) */}
              {!isAppInstalled && (
                <button
                  onClick={handleInstallApp}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600/25 to-blue-600/25 hover:from-cyan-600/35 hover:to-blue-600/35 border border-cyan-500/40 text-cyan-300 flex items-center justify-between transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-cyan-400 animate-bounce" />
                    <span>Install AntarYudh App</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                    PWA
                  </span>
                </button>
              )}

              {/* Mobile Database Backup Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsBackupModalOpen(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 flex items-center justify-between transition active:scale-95 cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  <span>Database Backup & Cloud Sync</span>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </button>

              {/* Mobile Screen Lock Button */}
              <button
                onClick={handleLockApp}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center justify-between transition active:scale-95 cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Lock Wealth OS</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono text-rose-400/80">
                  <span>30m</span>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modern Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AntarYudh &copy; 2026 — Comprehensive Personal Finance Platform</span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap justify-center">
            <span className="flex items-center gap-1 font-mono">
              <Database className="w-3 h-3 text-indigo-400" />
              <span>DB: <strong className={sysStatus.isProd ? 'text-emerald-400' : 'text-amber-300'}>{sysStatus.database}</strong></span>
            </span>
            <span>•</span>
            <span>Aiven MySQL Cloud Sync</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* Floating Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
        className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-xl shadow-indigo-500/30 border border-white/20 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-200" />
      </button>
    </div>
    </>
  );
}

export default App;
