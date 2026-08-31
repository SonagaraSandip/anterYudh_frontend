import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Activity,
  Server,
  Lock,
  ArrowRight,
  Wifi,
  Sparkles
} from 'lucide-react';

export default function ConnectingScreen({
  connectionState, // 'connecting' | 'connected' | 'error'
  sysStatus,
  onRetry,
  onBypass
}) {
  const [progress, setProgress] = useState(15);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    { title: 'Initializing Wealth OS Kernel', desc: 'Loading secure client runtime & cryptographic modules' },
    { title: 'Connecting to Cloud Database', desc: 'Establishing encrypted TLS/SSL link with Aiven MySQL' },
    { title: 'Verifying DB Integrity & Tables', desc: 'Checking schema, IPO matrices, and Demat accounts' },
    { title: 'Environment Ready', desc: 'Finalizing session state and rendering command center' }
  ];

  useEffect(() => {
    if (connectionState === 'connecting') {
      const timer1 = setTimeout(() => {
        setProgress(40);
        setCurrentStepIndex(1);
      }, 500);

      const timer2 = setTimeout(() => {
        setProgress(75);
        setCurrentStepIndex(2);
      }, 1100);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (connectionState === 'connected') {
      setProgress(100);
      setCurrentStepIndex(3);
    }
  }, [connectionState]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Background Tech Grids & Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />

      {/* Cyberpunk Circuit Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 max-w-lg w-full mx-4 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-2xl backdrop-blur-2xl transition-all duration-300">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connectionState === 'error' ? 'bg-rose-400 opacity-75' : 'bg-cyan-400 opacity-75'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connectionState === 'error' ? 'bg-rose-500' : 'bg-cyan-500'}`} />
            </span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {connectionState === 'error' ? 'Connection Interrupted' : 'Live Sync Protocol'}
            </span>
          </div>

          <div className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>SSL Secured</span>
          </div>
        </div>

        {/* Central Animated Hologram Node */}
        <div className="relative flex items-center justify-center my-6">
          {/* Pulsing Radar Wave Rings */}
          <div className="absolute w-36 h-36 rounded-full border border-indigo-500/20 animate-radar pointer-events-none" />
          <div className="absolute w-48 h-48 rounded-full border border-cyan-500/15 animate-radar pointer-events-none" style={{ animationDelay: '1.2s' }} />

          {/* Rotating Dashed Orbital Rings */}
          <div className="absolute w-28 h-28 rounded-full border border-dashed border-indigo-500/40 animate-spin-slow pointer-events-none" />
          <div className="absolute w-32 h-32 rounded-full border border-dashed border-cyan-500/30 animate-spin-reverse-slow pointer-events-none" />

          {/* Main Shield / Database Emblem */}
          <div className={`relative p-5 rounded-2xl shadow-2xl transition-all duration-500 ${
            connectionState === 'error'
              ? 'bg-gradient-to-tr from-rose-600 to-orange-600 shadow-rose-500/30 text-white'
              : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 shadow-indigo-500/30 text-white'
          }`}>
            {connectionState === 'error' ? (
              <AlertTriangle className="w-9 h-9 animate-bounce" />
            ) : (
              <div className="relative">
                <Shield className="w-9 h-9" />
                <Database className="w-4 h-4 absolute -bottom-1 -right-1 text-cyan-200" />
              </div>
            )}
          </div>
        </div>

        {/* Title & Connection Status Description */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>AntarYudh</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase tracking-wide">
              Wealth OS
            </span>
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {connectionState === 'error' ? (
              <span className="text-rose-400">Database Connection Notice</span>
            ) : connectionState === 'connected' ? (
              <span className="text-emerald-400 flex items-center justify-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Connected to Database Successfully
              </span>
            ) : (
              <span className="text-slate-300 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                Establishing Database Connection...
              </span>
            )}
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5 mb-6">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Handshake Progress</span>
            </span>
            <span className="text-indigo-300 font-bold">{progress}%</span>
          </div>

          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                connectionState === 'error'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Connection Telemetry List */}
        <div className="space-y-2.5 mb-6">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex || connectionState === 'connected';
            const isCurrent = idx === currentStepIndex && connectionState === 'connecting';
            const isFailed = connectionState === 'error' && idx === currentStepIndex;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition-all duration-300 border ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-300'
                    : isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-white shadow-md shadow-indigo-500/10'
                    : isFailed
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                    : 'bg-slate-950/30 border-slate-800/50 text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : isFailed ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-500">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isCompleted ? 'text-slate-200' : isCurrent ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {step.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-cyan-400 animate-pulse font-bold">
                        Connecting...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Telemetry Status Bar */}
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target:</span>
            <span className="font-bold text-slate-200">
              {sysStatus?.database || 'MySQL Cloud'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connectionState === 'error' ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
            <span className={sysStatus?.isProd ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
              {sysStatus?.isProd ? 'PROD CLOUD' : 'DEV CLOUD'}
            </span>
          </div>
        </div>

        {/* Action Controls for Error State */}
        {connectionState === 'error' && (
          <div className="mt-5 space-y-2.5 animate-fadeIn">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Could not reach backend on port 5000 or database. Retrying...</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onRetry}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>

              <button
                onClick={onBypass}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
                title="Enter offline mode with local storage cache"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
