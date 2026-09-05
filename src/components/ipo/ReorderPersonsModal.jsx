import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  Users,
  X,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Check,
  ArrowUpToLine,
  ArrowDownToLine,
  GripVertical,
  RotateCcw
} from 'lucide-react';

export function ReorderPersonsModal({
  isOpen,
  persons,
  onSaveOrder,
  onClose
}) {
  const [orderedList, setOrderedList] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOrderedList([...persons]);
      setHasSaved(false);
    }
  }, [isOpen, persons]);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = original;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Move up 1 position
  const moveUp = (idx) => {
    if (idx === 0) return;
    setOrderedList((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  };

  // Move down 1 position
  const moveDown = (idx) => {
    if (idx === orderedList.length - 1) return;
    setOrderedList((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  };

  // Move to top (#1 position for regular applicants)
  const moveToTop = (idx) => {
    if (idx === 0) return;
    setOrderedList((prev) => {
      const item = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      return [item, ...next];
    });
  };

  // Move to bottom (for occasional applicants)
  const moveToBottom = (idx) => {
    if (idx === orderedList.length - 1) return;
    setOrderedList((prev) => {
      const item = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      return [...next, item];
    });
  };

  // Drag and drop handlers
  const handleDragStart = (idx) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setOrderedList((prev) => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedIdx, 1);
      next.splice(targetIdx, 0, draggedItem);
      return next;
    });
    setDraggedIdx(targetIdx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleSaveAndLock = () => {
    onSaveOrder(orderedList);
    setHasSaved(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md select-none"
      style={{ margin: 0, top: 0, left: 0 }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col my-auto animate-fadeIn select-text"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Re-arrange Demat Accounts</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Move regular applicants to the top & lock order
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-90 touch-manipulation"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* List of Persons */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 max-h-[50vh]">
          {orderedList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No Demat accounts added yet.
            </div>
          ) : (
            orderedList.map((person, idx) => (
              <div
                key={person}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={clsx(
                  'flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-150',
                  draggedIdx === idx
                    ? 'bg-indigo-600/30 border-indigo-400 shadow-lg scale-102'
                    : idx === 0
                    ? 'bg-slate-950/90 border-indigo-500/40 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                )}
              >
                {/* Drag Handle & Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-xs sm:text-sm text-white truncate">
                    {person}
                  </span>
                  {idx === 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                      Primary
                    </span>
                  )}
                </div>

                {/* Quick Reorder Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Move to Top */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveToTop(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition disabled:opacity-20 disabled:pointer-events-none active:scale-90 touch-manipulation"
                    title="Move to Top"
                  >
                    <ArrowUpToLine className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveUp(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-20 disabled:pointer-events-none active:scale-90 touch-manipulation"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={idx === orderedList.length - 1}
                    onClick={() => moveDown(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-20 disabled:pointer-events-none active:scale-90 touch-manipulation"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Move to Bottom */}
                  <button
                    type="button"
                    disabled={idx === orderedList.length - 1}
                    onClick={() => moveToBottom(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition disabled:opacity-20 disabled:pointer-events-none active:scale-90 touch-manipulation"
                    title="Move to Bottom"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setOrderedList([...persons])}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 touch-manipulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndLock}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center gap-1.5 active:scale-95 touch-manipulation',
                hasSaved
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/30'
              )}
            >
              {hasSaved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved & Locked!</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save & Lock Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
