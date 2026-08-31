import React, { useState, useEffect } from 'react';
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
  Zap
} from 'lucide-react';
import axios from 'axios';
import MainDashboard from './components/MainDashboard';
import IpoDashboard from './components/IpoDashboard';
import TradingView from './components/TradingView';
import ExpensesView from './components/ExpensesView';
import BuyView from './components/BuyView';
import ConnectingScreen from './components/ConnectingScreen';

function App() {
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['dashboard', 'ipo', 'trading', 'expenses', 'buy'].includes(hash)) {
        return hash;
      }
      if (hash === 'goal') return 'trading';

      const saved = localStorage.getItem('antaryudh_active_tab');
      if (['dashboard', 'ipo', 'trading', 'expenses', 'buy'].includes(saved)) {
        return saved;
      }
      if (saved === 'goal') return 'trading';
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sysStatus, setSysStatus] = useState({ database: 'Connecting...', isProd: false, environment: 'development' });
  
  // Database Connecting Screen State
  const [isConnectingDb, setIsConnectingDb] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  const checkDbConnection = async () => {
    setConnectionState('connecting');
    const startTime = Date.now();
    try {
      const res = await axios.get('/api/system/status');
      if (res.data && (res.data.status === 'online' || res.data.connected)) {
        setSysStatus(res.data);
        
        // Ensure the visual connecting sequence completes gracefully
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 1400 - elapsed);
        
        setTimeout(() => {
          setConnectionState('connected');
          // Allow the 100% checkmark and success state to be viewed before entering
          setTimeout(() => {
            setIsConnectingDb(false);
          }, 450);
        }, remainingDelay);
      } else {
        throw new Error('Database not ready');
      }
    } catch (err) {
      console.warn('System status not reachable or DB error:', err);
      // Wait at least 1.2s before displaying error to allow visual feedback
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 1200 - elapsed);
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
      activeGradient: 'from-blue-600 to-cyan-600',
      activeText: 'text-cyan-400',
      activeBorder: 'border-cyan-500/40',
      glow: 'shadow-cyan-500/20'
    },
    {
      id: 'trading',
      label: 'Trading',
      icon: BarChart2,
      badge: 'Journal',
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      color: 'indigo',
      activeGradient: 'from-blue-600 to-indigo-600',
      activeText: 'text-indigo-300',
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
      id: 'buy',
      label: 'Buy',
      icon: ShoppingBag,
      badge: 'Progress',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      color: 'amber',
      activeGradient: 'from-amber-600 to-yellow-600',
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
      {/* Database Connection Initializer Screen */}
      {isConnectingDb && (
        <ConnectingScreen
          connectionState={connectionState}
          sysStatus={sysStatus}
          onRetry={checkDbConnection}
          onBypass={() => setIsConnectingDb(false)}
        />
      )}

      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
        {/* Master Top Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 py-2.5 transition-all">

        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Brand Logo & Tagline */}
          <div 
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/25 text-white shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-indigo-300 transition">
                  AntarYudh
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                  Wealth OS
                </span>
                {/* Active Database Badge */}
                <span 
                  className={`text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${
                    sysStatus.isProd
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                  }`}
                  title={`Connected to database: ${sysStatus.database}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sysStatus.isProd ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{sysStatus.isProd ? 'PROD DB' : 'DEV DB'}: {sysStatus.database}</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:block">
                Personal Wealth & Financial Command Center
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs Switcher */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/90 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap select-none ${
                    isActive
                      ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-md ${tab.glow}`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${
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

          {/* Mobile Hamburger Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95 shadow-sm"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-indigo-400 transition-transform rotate-90 duration-200" />
              ) : (
                <Menu className="w-5 h-5 text-slate-200 transition-transform duration-200" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Animated Dropdown Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2.5 pt-2.5 border-t border-slate-800/80 animate-slideDown origin-top">
            <div className="grid grid-cols-1 gap-1.5 p-1 bg-slate-950/90 backdrop-blur-xl rounded-xl border border-slate-800/90 shadow-2xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-lg ${tab.glow}`
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-800'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{tab.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tab.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
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
          </div>
        )}
      </header>

      {/* Main Tab Content View Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-6">
        {activeTab === 'dashboard' && <MainDashboard onNavigateTab={(tab) => handleSelectTab(tab)} />}
        {activeTab === 'ipo' && <IpoDashboard isEmbedded={true} />}
        {activeTab === 'trading' && <TradingView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'buy' && <BuyView />}
      </main>


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
