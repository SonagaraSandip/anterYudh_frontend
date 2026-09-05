import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ShieldAlert, X, AlertTriangle, KeyRound, CheckCircle2, Clock, Lock } from 'lucide-react';

const REQUIRED_PIN = '14110';
const PIN_LENGTH = 5;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 4 * 60 * 60 * 1000; // 4 Hours

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
  const [remainingTimeStr, setRemainingTimeStr] = useState('');
  const [isShake, setIsShake] = useState(false);
  const [isSuccessAnim, setIsSuccessAnim] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inputRef = useRef(null);

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

  // Reset and auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsSuccessAnim(false);
      setIsShake(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

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
      }, 350);
    } else {
      // WRONG PIN
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('antaryudh_secret_pin_attempts', String(newAttempts));

      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      setPin('');

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockTime);
        localStorage.setItem('antaryudh_secret_pin_lockout', String(lockTime));
        setErrorMsg('Maximum 5 failed attempts reached. Vault locked for 4 hours.');
      } else if (newAttempts > 2) {
        setErrorMsg(`Incorrect PIN! Warning: ${newAttempts} wrong attempts (${MAX_ATTEMPTS - newAttempts} left before 4h lockout)`);
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
      }

      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [attempts, lockoutUntil, onSuccess, onClose]);

  const handleInputChange = (e) => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    if (isSuccessAnim) return;

    // Filter only numeric digits, max length 5
    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(val);
    setErrorMsg('');

    if (val.length === PIN_LENGTH) {
      handleVerify(val);
    }
  };

  // Keyboard navigation for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLocked = Boolean(lockoutUntil && Date.now() < lockoutUntil);

  // Render via createPortal directly into document.body so it is ALWAYS fixed to screen center
  return createPortal(
    <div
      onClick={(e) => {
        // Outer click closes pop-up
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
      style={{ margin: 0, top: 0, left: 0 }}
    >
      <div
        className={clsx(
          'relative bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 transition-all',
          isShake && 'animate-shake ring-2 ring-rose-500'
        )}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-90 touch-manipulation"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            {isSuccessAnim ? (
              <CheckCircle2 className="w-6 h-6 text-white animate-scaleIn" />
            ) : isLocked ? (
              <ShieldAlert className="w-6 h-6 text-rose-300" />
            ) : (
              <KeyRound className="w-6 h-6 text-white" />
            )}
          </div>

          <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
            {isLocked ? 'Vault Temporarily Locked' : 'Enter 5-Digit PIN'}
          </h3>

          <p className="text-[11px] sm:text-xs text-slate-400 max-w-[240px] mx-auto truncate font-medium">
            {targetNoteTitle ? `Unlocking: "${targetNoteTitle}"` : 'Verify identity to unmask secret note'}
          </p>
        </div>

        {/* Lockout Screen */}
        {isLocked ? (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-rose-300 font-bold text-xs">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>4-Hour Security Lockout Active</span>
            </div>
            <p className="text-[11px] text-slate-300">
              5 consecutive incorrect attempts detected. Please wait before retrying.
            </p>
            <div className="text-lg sm:text-xl font-mono font-black text-white bg-black/40 py-1.5 rounded-xl border border-white/10 tracking-wider">
              {remainingTimeStr || 'Lockout in effect'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Warning when wrong attempts > 2 */}
            {attempts > 2 && (
              <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] font-medium flex items-center gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Warning:</strong> {attempts} failed attempts. {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} left before 4h lockout!
                </span>
              </div>
            )}

            {/* General error message */}
            {errorMsg && attempts <= 2 && (
              <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] text-center font-medium animate-fadeIn">
                {errorMsg}
              </div>
            )}

            {/* Hidden Input for Native Keyboard & Mobile Numeric Keypad */}
            <div className="relative flex justify-center">
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

              {/* 5-Digit Visual Dots / Boxes (Clicking focuses native keypad) */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="flex items-center justify-center gap-2.5 sm:gap-3 py-2 cursor-pointer"
              >
                {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                  const isFilled = idx < pin.length;
                  const isCurrent = idx === pin.length;
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        'w-10 h-12 sm:w-11 sm:h-13 rounded-xl border flex items-center justify-center text-lg sm:text-xl font-black font-mono transition-all duration-150 select-none',
                        isSuccessAnim
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                          : isFilled
                          ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-md shadow-indigo-500/20 scale-105'
                          : isCurrent
                          ? 'bg-slate-950 border-indigo-500/60 ring-2 ring-indigo-500/20 text-indigo-400'
                          : 'bg-slate-950/80 border-slate-800 text-slate-600'
                      )}
                    >
                      {isFilled ? '●' : '—'}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-400 font-medium">
              Type on your keyboard / keypad to unlock
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-800/80">
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
