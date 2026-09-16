import { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Shield,
  Clock,
  Unlock,
  AlertTriangle,
  Delete,
  RotateCcw
} from 'lucide-react';

const APP_MASTER_PASSWORD = '30009142'; // 8-Digit Master Passcode
const PIN_LENGTH = 8;

const DIAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Subtle tactile haptic pulse on mobile devices
const triggerHaptic = (duration = 10) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(duration);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
};

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

  const validatePin = useCallback((pinToValidate) => {
    if (pinToValidate === APP_MASTER_PASSWORD) {
      setIsSuccess(true);
      setIsError(false);
      setErrorMessage('');
      triggerHaptic(25);

      // Instant seamless transition into Wealth OS
      setTimeout(() => {
        onUnlock();
      }, 50);
    } else {
      setIsError(true);
      setIsShake(true);
      setErrorMessage('Incorrect 8-digit passcode. Try again.');
      triggerHaptic([40, 50, 40]);

      // Fast error reset
      setTimeout(() => setIsShake(false), 400);
      setTimeout(() => {
        setPin('');
      }, 250);
    }
  }, [onUnlock]);

  // Handle Digit Press (from Dial Pad or Physical Keyboard)
  const handleDigitPress = useCallback((digit) => {
    if (isSuccess) return;
    triggerHaptic(8);

    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + digit;
      setIsError(false);
      setErrorMessage('');

      if (next.length === PIN_LENGTH) {
        // Trigger instant validation on 8th digit
        validatePin(next);
      }
      return next;
    });
  }, [isSuccess, validatePin]);

  // Handle Backspace / Delete
  const handleDeletePress = useCallback(() => {
    if (isSuccess) return;
    triggerHaptic(10);
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage('');
  }, [isSuccess]);

  // Handle Clear / Reset
  const handleClearPress = useCallback(() => {
    if (isSuccess) return;
    triggerHaptic(12);
    setPin('');
    setIsError(false);
    setErrorMessage('');
  }, [isSuccess]);

  // Physical keyboard listener for desktop / laptop users (without triggering mobile soft keyboard)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSuccess) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeletePress();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearPress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuccess, handleDigitPress, handleDeletePress, handleClearPress]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 xs:p-4 sm:p-6 bg-slate-950 text-slate-100 overflow-y-auto select-none font-sans min-h-[100dvh]">
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

      {/* Main Lock Card - Responsive full-width on mobile with max-w-[400px] */}
      <div
        className={`relative z-10 w-full max-w-[390px] sm:max-w-[420px] p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-2xl transition-all duration-200 space-y-3.5 sm:space-y-4 my-auto ${
          isShake ? 'animate-shake ring-2 ring-rose-500' : ''
        }`}
      >
        {/* Top Header: Parallel Handshake Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="flex h-2 w-2 relative shrink-0">
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
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connectionState === 'connected'
                    ? 'bg-emerald-500'
                    : connectionState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-cyan-500'
                }`}
              />
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
              {connectionState === 'connected'
                ? 'DB Linked'
                : connectionState === 'error'
                ? 'DB Warning'
                : 'Syncing DB...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>30m</span>
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1 shrink-0">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Lock</span>
            </div>
          </div>
        </div>

        {/* Brand Emblem */}
        <div className="flex flex-col items-center justify-center text-center pt-1">
          <div
            className={`p-2.5 sm:p-3 rounded-2xl shadow-lg mb-2 transition-all duration-200 ${
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
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
              Wealth OS
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter 8-digit passcode via dial pad
          </p>
        </div>

        {/* 8-Digit PIN Slots Container */}
        <div className="space-y-2">
          {/* 8-Digit Visual Slots (Flex with flex-1 to perfectly fit all phone widths) */}
          <div className="flex items-center justify-between gap-1 sm:gap-1.5 py-1 w-full">
            {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
              const isFilled = idx < pin.length;
              const isCurrent = idx === pin.length;
              const digit = pin[idx];

              return (
                <div
                  key={idx}
                  className={`flex-1 min-w-0 max-w-[42px] h-10 sm:h-12 rounded-xl border flex items-center justify-center font-mono font-black text-sm sm:text-base transition-all duration-150 select-none ${
                    isSuccess
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                      : isError
                      ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                      : isFilled
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                      : isCurrent
                      ? 'bg-slate-950 border-indigo-500/80 ring-2 ring-indigo-500/30 text-indigo-400 animate-pulse'
                      : 'bg-slate-950/80 border-slate-800 text-slate-600'
                  }`}
                >
                  {isFilled ? (
                    showPin ? (
                      digit
                    ) : (
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-300 shadow-sm shadow-indigo-400/50 inline-block" />
                    )
                  ) : (
                    <span className="text-slate-600 text-xs sm:text-sm">—</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show / Hide Toggle & Error Banner */}
          <div className="flex items-center justify-between min-h-[20px] px-1 text-xs">
            {errorMessage ? (
              <span className="text-rose-400 font-medium flex items-center gap-1 text-[11px] sm:text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </span>
            ) : isSuccess ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono text-[11px] sm:text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Unlocked!</span>
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[11px] sm:text-xs">
                {pin.length > 0 ? `${pin.length} of ${PIN_LENGTH} entered` : 'Tap numbers below'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px] sm:text-xs font-mono cursor-pointer py-1 px-1.5 rounded-lg hover:bg-slate-800 touch-manipulation active:scale-95"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPin ? 'Hide' : 'Show'}</span>
            </button>
          </div>
        </div>

        {/* IN-BUILT NUMERIC DIAL PAD (Fast, Zero-Lag, Clean Touch-Friendly Responsive Buttons) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
          {DIAL_KEYS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="py-3 sm:py-3.5 rounded-2xl bg-slate-800/80 hover:bg-indigo-600/30 active:bg-indigo-600/50 border border-slate-700/60 active:border-indigo-400 text-white font-mono transition-all duration-75 active:scale-95 shadow-sm touch-manipulation flex items-center justify-center min-h-[50px] xs:min-h-[54px] sm:min-h-[58px]"
            >
              <span className="text-xl sm:text-2xl font-black leading-none">{digit}</span>
            </button>
          ))}

          {/* Bottom Row: Clear / 0 / Backspace */}
          <button
            type="button"
            onClick={handleClearPress}
            className="py-3 sm:py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-mono font-bold transition-all duration-75 active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 min-h-[50px] xs:min-h-[54px] sm:min-h-[58px]"
            title="Clear all"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs font-semibold font-sans">Clear</span>
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="py-3 sm:py-3.5 rounded-2xl bg-slate-800/80 hover:bg-indigo-600/30 active:bg-indigo-600/50 border border-slate-700/60 active:border-indigo-400 text-white font-mono transition-all duration-75 active:scale-95 shadow-sm touch-manipulation flex items-center justify-center min-h-[50px] xs:min-h-[54px] sm:min-h-[58px]"
          >
            <span className="text-xl sm:text-2xl font-black leading-none">0</span>
          </button>

          <button
            type="button"
            onClick={handleDeletePress}
            className="py-3 sm:py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-mono font-bold transition-all duration-75 active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 min-h-[50px] xs:min-h-[54px] sm:min-h-[58px]"
            title="Delete last digit"
          >
            <Delete className="w-4 h-4" />
            <span className="text-xs font-semibold font-sans">Del</span>
          </button>
        </div>

        {/* Live Parallel Database Connection Bar at Bottom */}
        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              DB: <strong className="text-slate-200">{sysStatus?.database || 'MySQL Cloud'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {connectionState === 'connected' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            ) : connectionState === 'error' ? (
              <button
                type="button"
                onClick={onRetryConnection}
                className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-bold touch-manipulation"
              >
                <RefreshCw className="w-3 h-3 animate-spin" /> Retry Link
              </button>
            ) : (
              <span className="text-cyan-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


