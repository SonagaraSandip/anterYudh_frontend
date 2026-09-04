import React, { useState, useEffect, Suspense, lazy } from 'react';
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
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { Cloud } from 'lucide-react';
import MainDashboard from './components/MainDashboard';
import ConnectingScreen from './components/ConnectingScreen';
import BackupModal from './components/BackupModal';

// Lazy load heavyweight tab components so only Dashboard is loaded on initial render
const IpoDashboard = lazy(() => import('./components/IpoDashboard'));
const TradingView = lazy(() => import('./components/TradingView'));
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const NotesView = lazy(() => import('./components/NotesView'));

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
      if (['dashboard', 'ipo', 'trading', 'expenses', 'notes', 'buy'].includes(hash)) {
        return hash === 'buy' ? 'notes' : hash;
      }
      if (hash === 'goal') return 'trading';

      const saved = localStorage.getItem('antaryudh_active_tab');
      if (['dashboard', 'ipo', 'trading', 'expenses', 'notes', 'buy'].includes(saved)) {
        return saved === 'buy' ? 'notes' : saved;
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
  
  // Database Connecting Screen State (Skip on session refresh for instantaneous loading)
  const [isConnectingDb, setIsConnectingDb] = useState(() => {
    try {
      return !sessionStorage.getItem('antaryudh_connected');
    } catch {
      return true;
    }
  });
  const [connectionState, setConnectionState] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  const checkDbConnection = async (isManualRetry = false) => {
    setConnectionState('connecting');
    const startTime = Date.now();
    try {
      const res = await axios.get('/api/system/status');
      if (res.data && (res.data.status === 'online' || res.data.connected)) {
        setSysStatus(res.data);
        sessionStorage.setItem('antaryudh_connected', 'true');
        
        // Fast transition: non-blocking delay so user gets into dashboard in < 300ms!
        const elapsed = Date.now() - startTime;
        const remainingDelay = isManualRetry ? Math.max(0, 300 - elapsed) : Math.max(0, 150 - elapsed);
        
        setTimeout(() => {
          setConnectionState('connected');
          setTimeout(() => {
            setIsConnectingDb(false);
          }, 100);
        }, remainingDelay);
      } else {
        throw new Error('Database not ready');
      }
    } catch (err) {
      console.warn('System status not reachable or DB error:', err);
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 400 - elapsed);
      setTimeout(() => {
        setConnectionState('error');
      }, remainingDelay);
    }
  };

  useEffect(() => {
    checkDbConnection();
  }, []);

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
      {/* 0. Fullscreen Database Connecting Screen (Instant on session return) */}
      {isConnectingDb && (
        <ConnectingScreen
          connectionState={connectionState}
          sysStatus={sysStatus}
          onRetry={() => checkDbConnection(true)}
          onBypass={() => setIsConnectingDb(false)}
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
                </button>
              );
            })}
          </nav>

          {/* Right Header Status Bar & Mobile Menu Button */}
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

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-3 py-3 animate-fadeIn">
            <div className="grid grid-cols-1 gap-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id || (tab.id === 'notes' && activeTab === 'buy');

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between ${
                      isActive
                        ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-md ${tab.glow}`
                        : 'text-slate-300 hover:bg-slate-800/80'
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

              {/* Mobile Backup Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsBackupModalOpen(true);
                }}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  <span>Database Backup & Cloud Sync</span>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>
        )}
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
        </Suspense>
      </main>

      {/* Backup & Cloud Sync Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

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
