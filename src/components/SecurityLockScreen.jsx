import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Clock,
  Shield
} from 'lucide-react';

const APP_MASTER_PASSWORD = '30009142'; // 8-Digit Master Passcode
const PIN_LENGTH = 8;

export default function SecurityLockScreen({
  connectionState, // 'connecting' | 'connected' | 'error'
  sysStatus,
  onUnlock,
  onRetryConnection
}) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShake, setIsShake] = useState(false);

  const inputRef = useRef(null);

  // Immediate auto-focus on mount with fallback
  useEffect(() => {
    inputRef.current?.focus();
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const validatePin = (pinToValidate) => {
    if (pinToValidate === APP_MASTER_PASSWORD) {
      setIsSuccess(true);
      setIsError(false);
      setErrorMessage('');

      // Instant seamless transition into Wealth OS (zero delay)
      setTimeout(() => {
        onUnlock();
      }, 50);
    } else {
      setIsError(true);
      setIsShake(true);
      setErrorMessage('Incorrect 8-digit passcode. Try again.');
      
      // Fast error reset
      setTimeout(() => setIsShake(false), 300);
      setTimeout(() => {
        setPin('');
        if (inputRef.current) inputRef.current.focus();
      }, 250);
    }
  };

  const handleInputChange = (e) => {
    if (isSuccess) return;

    // Filter only numeric digits, max length 8
    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(val);
    setIsError(false);
    setErrorMessage('');

    if (val.length === PIN_LENGTH) {
      validatePin(val);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950 text-slate-100 overflow-y-auto select-none font-sans cursor-pointer"
    >
      {/* Ambient Cyberpunk Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/10 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-500/10 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none animate-pulse-glow" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main Lock Card */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.focus();
        }}
        className={`relative z-10 max-w-sm sm:max-w-md w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-2xl transition-all duration-200 space-y-3 sm:space-y-4 my-auto ${
          isShake ? 'animate-shake ring-2 ring-rose-500' : ''
        }`}
      >
        {/* Top Header: Parallel Handshake Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-400 opacity-75'
                    : connectionState === 'error'
                    ? 'bg-rose-400 opacity-75'
                    : 'bg-cyan-400 opacity-75'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 ${
                  connectionState === 'connected'
                    ? 'bg-emerald-500'
                    : connectionState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-cyan-500'
                }`}
              />
            </span>
            <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
              {connectionState === 'connected'
                ? 'DB Link Active'
                : connectionState === 'error'
                ? 'DB Warning'
                : 'Connecting DB...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
              <span>30m Session</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1 shrink-0">
              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
              <span>Lock</span>
            </div>
          </div>
        </div>

        {/* Brand Emblem */}
        <div className="flex flex-col items-center justify-center text-center pt-0.5 sm:pt-1">
          <div
            className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl mb-2 sm:mb-2.5 transition-all duration-200 ${
              isSuccess
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30 scale-105'
                : isError
                ? 'bg-gradient-to-tr from-rose-600 to-orange-600 shadow-rose-500/30'
                : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 shadow-indigo-500/25'
            }`}
          >
            {isSuccess ? (
              <Unlock className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-scaleIn" />
            ) : isError ? (
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            )}
          </div>

          <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center justify-center gap-1.5 font-mono">
            <span>AntarYudh</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
              Wealth OS
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Enter 8-digit passcode • Unlocks 30-min active session
          </p>
        </div>

        {/* 8-Digit PIN Input Container (Fully fluid and 100% mobile-responsive) */}
        <div className="space-y-2 pt-0.5">
          <div className="relative flex justify-center w-full">
            {/* Native Clean Mobile/Desktop Input */}
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              autoFocus
            />

            {/* 8-Digit Visual Slots (Flex with flex-1 to always fit all screen widths) */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="flex items-center justify-between gap-1 sm:gap-1.5 py-1 sm:py-2 cursor-pointer w-full"
            >
              {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                const isFilled = idx < pin.length;
                const isCurrent = idx === pin.length;
                const digit = pin[idx];

                return (
                  <div
                    key={idx}
                    className={`flex-1 min-w-0 aspect-[4/5] sm:aspect-square max-w-[44px] rounded-lg sm:rounded-xl border flex items-center justify-center font-mono font-black text-sm sm:text-base md:text-lg transition-all duration-150 select-none ${
                      isSuccess
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                        : isError
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : isFilled
                        ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                        : isCurrent
                        ? 'bg-slate-950 border-indigo-500/80 ring-2 ring-indigo-500/30 text-indigo-400'
                        : 'bg-slate-950/80 border-slate-800 text-slate-600'
                    }`}
                  >
                    {isFilled ? (showPin ? digit : '●') : '—'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Show / Hide Toggle & Error Banner */}
          <div className="flex items-center justify-between min-h-[20px] px-0.5 text-[10px] sm:text-[11px]">
            {errorMessage ? (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{errorMessage}</span>
              </span>
            ) : isSuccess ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                <span>Passcode verified!</span>
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[10px] sm:text-[11px]">
                Type on keyboard to unlock
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPin(!showPin);
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[10px] sm:text-[11px] ml-auto font-mono cursor-pointer py-0.5 px-1 rounded"
            >
              {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showPin ? 'Hide' : 'Show'}</span>
            </button>
          </div>
        </div>

        {/* Live Parallel Database Connection Bar at Bottom */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <Database className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">
              DB: <strong className="text-slate-200">{sysStatus?.database || 'MySQL Cloud'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {connectionState === 'connected' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Ready
              </span>
            ) : connectionState === 'error' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryConnection();
                }}
                className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" /> Retry Link
              </button>
            ) : (
              <span className="text-cyan-400 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" /> Handshaking...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


