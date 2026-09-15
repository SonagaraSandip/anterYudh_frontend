import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Clock,
  Lock,
  Delete,
  RotateCcw
} from 'lucide-react';

const REQUIRED_PIN = '14110';
const PIN_LENGTH = 5;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 4 * 60 * 60 * 1000; // 4 Hours

const DIAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinVerificationModal({
  isOpen,
  targetNoteTitle,
  onSuccess,
  onClose
}) {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(() => {
    const saved = localStorage.getItem('antaryudh_secret_pin_attempts');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const saved = localStorage.getItem('antaryudh_secret_pin_lockout');
    return saved ? parseInt(saved, 10) || null : null;
  });
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [remainingTimeStr, setRemainingTimeStr] = useState('');
  const [isShake, setIsShake] = useState(false);
  const [isSuccessAnim, setIsSuccessAnim] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Check Lockout status and countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const checkLockout = () => {
      const now = Date.now();
      setCurrentTime(now);
      if (lockoutUntil && now < lockoutUntil) {
        const diff = lockoutUntil - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTimeStr(
          `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
        );
      } else if (lockoutUntil && now >= lockoutUntil) {
        // Lockout expired, reset attempts
        setLockoutUntil(null);
        setAttempts(0);
        localStorage.removeItem('antaryudh_secret_pin_lockout');
        localStorage.removeItem('antaryudh_secret_pin_attempts');
        setRemainingTimeStr('');
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [isOpen, lockoutUntil]);

  const handleVerify = useCallback((enteredPin) => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return;
    }

    if (enteredPin === REQUIRED_PIN) {
      // SUCCESS!
      setIsSuccessAnim(true);
      setErrorMsg('');
      // Reset attempts
      setAttempts(0);
      localStorage.removeItem('antaryudh_secret_pin_attempts');
      localStorage.removeItem('antaryudh_secret_pin_lockout');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 80);
    } else {
      // WRONG PIN
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('antaryudh_secret_pin_attempts', String(newAttempts));

      setIsShake(true);
      setTimeout(() => setIsShake(false), 400);
      setTimeout(() => setPin(''), 250);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockTime);
        localStorage.setItem('antaryudh_secret_pin_lockout', String(lockTime));
        setErrorMsg('Maximum 5 failed attempts reached. Vault locked for 4 hours.');
      } else if (newAttempts > 2) {
        setErrorMsg(`Incorrect PIN! ${MAX_ATTEMPTS - newAttempts} attempt(s) left before 4h lockout.`);
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
      }
    }
  }, [attempts, lockoutUntil, onSuccess, onClose]);

  // Handle Digit Press
  const handleDigitPress = useCallback((digit) => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    if (isSuccessAnim) return;

    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + digit;
      setErrorMsg('');

      if (next.length === PIN_LENGTH) {
        handleVerify(next);
      }
      return next;
    });
  }, [lockoutUntil, isSuccessAnim, handleVerify]);

  // Handle Backspace / Delete
  const handleDeletePress = useCallback(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    if (isSuccessAnim) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  }, [lockoutUntil, isSuccessAnim]);

  // Handle Clear
  const handleClearPress = useCallback(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    if (isSuccessAnim) return;
    setPin('');
    setErrorMsg('');
  }, [lockoutUntil, isSuccessAnim]);

  // Keyboard navigation for physical keyboards
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeletePress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleDigitPress, handleDeletePress]);

  if (!isOpen) return null;

  const isLocked = Boolean(lockoutUntil && currentTime < lockoutUntil);

  // Render via createPortal directly into document.body
  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto"
      style={{ margin: 0, top: 0, left: 0 }}
    >
      <div
        className={clsx(
          'relative bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-xs sm:max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-3.5 transition-all my-auto',
          isShake && 'animate-shake ring-2 ring-rose-500'
        )}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-90 touch-manipulation"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-1 pt-0.5">
          <div className="mx-auto w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mb-1.5">
            {isSuccessAnim ? (
              <CheckCircle2 className="w-5 h-5 text-white animate-scaleIn" />
            ) : isLocked ? (
              <ShieldAlert className="w-5 h-5 text-rose-300" />
            ) : (
              <KeyRound className="w-5 h-5 text-white" />
            )}
          </div>

          <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
            {isLocked ? 'Vault Temporarily Locked' : 'Enter 5-Digit PIN'}
          </h3>

          <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-[220px] mx-auto truncate font-medium">
            {targetNoteTitle ? `Unlocking: "${targetNoteTitle}"` : 'Verify identity to unmask note'}
          </p>
        </div>

        {/* Lockout Screen */}
        {isLocked ? (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-rose-300 font-bold text-xs">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>4-Hour Lockout Active</span>
            </div>
            <p className="text-[10px] text-slate-300">
              5 consecutive failed attempts. Please wait before retrying.
            </p>
            <div className="text-base sm:text-lg font-mono font-black text-white bg-black/40 py-1.5 rounded-xl border border-white/10 tracking-wider">
              {remainingTimeStr || 'Lockout in effect'}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Warning when wrong attempts > 2 */}
            {attempts > 2 && (
              <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[10px] font-medium flex items-center gap-1.5 animate-fadeIn">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong>Warning:</strong> {attempts} failed attempts ({MAX_ATTEMPTS - attempts} left before 4h lockout)
                </span>
              </div>
            )}

            {/* General error message */}
            {errorMsg && attempts <= 2 && (
              <div className="p-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[10px] text-center font-medium animate-fadeIn">
                {errorMsg}
              </div>
            )}

            {/* 5-Digit Visual Dots / Slots */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-1">
              {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                const isFilled = idx < pin.length;
                const isCurrent = idx === pin.length;
                return (
                  <div
                    key={idx}
                    className={clsx(
                      'w-9 h-11 sm:w-10 sm:h-12 rounded-xl border flex items-center justify-center text-base sm:text-lg font-black font-mono transition-all duration-150 select-none',
                      isSuccessAnim
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                        : isFilled
                        ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-md shadow-indigo-500/20 scale-105'
                        : isCurrent
                        ? 'bg-slate-950 border-indigo-500/60 ring-2 ring-indigo-500/20 text-indigo-400 animate-pulse'
                        : 'bg-slate-950/80 border-slate-800 text-slate-600'
                    )}
                  >
                    {isFilled ? '●' : '—'}
                  </div>
                );
              })}
            </div>

            {/* IN-BUILT NUMERIC DIAL PAD (Fast, Zero-Lag, Clean Pure Numbers) */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {DIAL_KEYS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-indigo-600/30 active:bg-indigo-600/50 border border-slate-700/70 hover:border-indigo-500/50 text-white font-mono font-bold transition-all duration-75 active:scale-95 shadow-sm touch-manipulation flex items-center justify-center min-h-[42px] sm:min-h-[46px]"
                >
                  <span className="text-lg sm:text-xl font-black leading-none">{digit}</span>
                </button>
              ))}

              {/* Bottom Row: Clear / 0 / Backspace */}
              <button
                type="button"
                onClick={handleClearPress}
                className="py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 active:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-mono font-bold transition-all duration-75 active:scale-95 touch-manipulation flex items-center justify-center gap-1 min-h-[42px] sm:min-h-[46px]"
                title="Clear all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px] font-sans">Clear</span>
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-indigo-600/30 active:bg-indigo-600/50 border border-slate-700/70 hover:border-indigo-500/50 text-white font-mono font-bold transition-all duration-75 active:scale-95 shadow-sm touch-manipulation flex items-center justify-center min-h-[42px] sm:min-h-[46px]"
              >
                <span className="text-lg sm:text-xl font-black leading-none">0</span>
              </button>

              <button
                type="button"
                onClick={handleDeletePress}
                className="py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 active:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-mono font-bold transition-all duration-75 active:scale-95 touch-manipulation flex items-center justify-center gap-1 min-h-[42px] sm:min-h-[46px]"
                title="Delete last digit"
              >
                <Delete className="w-3.5 h-3.5" />
                <span className="text-[10px] font-sans">Del</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center pt-1.5 border-t border-slate-800/80">
          <p className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>AntarYudh Vault PIN Security</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
