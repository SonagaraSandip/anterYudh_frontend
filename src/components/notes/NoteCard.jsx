import React from 'react';
import clsx from 'clsx';
import { Lock, Pin, Eye, EyeOff, Check, Copy, Edit3, Trash2 } from 'lucide-react';

export const NoteCard = React.memo(function NoteCard({
  note,
  colorConfig,
  isRevealed,
  isCopied,
  onTogglePin,
  onToggleReveal,
  onCopy,
  onEdit,
  onDelete,
  formatDate
}) {
  const bgClass = colorConfig.bg || 'bg-slate-900/95';
  const borderClass = colorConfig.border || 'border-slate-800 hover:border-slate-700';
  const dividerClass = colorConfig.divider || 'border-white/10';
  const badgeClass = colorConfig.badge || 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';

  return (
    <div
      className={clsx(
        'rounded-xl sm:rounded-2xl border p-3 sm:p-4 shadow-xl transition-all duration-200 relative flex flex-col justify-between group overflow-hidden min-h-[120px] sm:min-h-[140px]',
        bgClass,
        borderClass,
        note.isPinned && 'ring-1 ring-amber-400/40 shadow-amber-500/5'
      )}
    >
      {/* Top Header Bar */}
      <div>
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          {/* Left: Pin + Title + Badges */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 flex-wrap">
            {/* Interactive Pin */}
            <button
              type="button"
              onClick={() => onTogglePin(note)}
              className={clsx(
                'p-1 -ml-1 rounded-md transition hover:bg-white/10 shrink-0 select-none active:scale-90 touch-manipulation',
                note.isPinned ? 'text-amber-400' : 'text-slate-400/70 hover:text-white'
              )}
              title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin
                className={clsx(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform',
                  note.isPinned ? 'fill-amber-400 rotate-0' : '-rotate-45'
                )}
              />
            </button>

            {/* Note Title (Underlined style matching reference) */}
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight break-words underline decoration-white/30 underline-offset-4 decoration-1 hover:decoration-white transition-colors">
              {note.title}
            </h3>

            {/* Compact Category / Secret Badges */}
            <div className="flex items-center gap-1 shrink-0">
              {note.category && note.category !== 'General' && (
                <span className={clsx('text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.2 rounded-full border font-mono', badgeClass)}>
                  {note.category}
                </span>
              )}
              {note.isSecret ? (
                <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-rose-400" />
                  <span>Secret</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Right Corner Action Icons (Copy, Edit, Delete) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 bg-black/30 backdrop-blur-sm p-0.5 sm:p-1 rounded-lg border border-white/5 opacity-90 group-hover:opacity-100 transition">
            {/* Copy Button (Protected with PIN for secret notes) */}
            <button
              type="button"
              onClick={() => onCopy(note)}
              className={clsx(
                'p-1 sm:p-1.5 rounded transition active:scale-90 touch-manipulation',
                note.isSecret && !isRevealed
                  ? 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              )}
              title={
                note.isSecret && !isRevealed
                  ? 'Protected: Enter PIN to copy'
                  : isCopied
                  ? 'Copied!'
                  : 'Copy Note Text'
              }
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-scaleIn" />
              ) : note.isSecret && !isRevealed ? (
                <Lock className="w-3.5 h-3.5 text-amber-400/90" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Edit Button (Protected with PIN for secret notes) */}
            <button
              type="button"
              onClick={() => onEdit(note)}
              className="p-1 sm:p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-90 touch-manipulation"
              title={note.isSecret && !isRevealed ? 'Protected: Enter PIN to edit' : 'Edit Note'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => onDelete(note)}
              className="p-1 sm:p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition active:scale-90 touch-manipulation"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div className={clsx('border-b my-2 sm:my-2.5', dividerClass)} />
      </div>

      {/* Note Body Content - Fills available card space with NO wasted boxes */}
      <div className="flex-1 flex flex-col justify-start">
        {note.isSecret && !isRevealed ? (
          <div className="flex items-center justify-between text-slate-400 py-1.5 px-2 bg-black/20 rounded-lg">
            <span className="tracking-widest font-black text-slate-300 text-xs truncate select-none">
              ••••••••••••••••••••
            </span>
            <button
              type="button"
              onClick={() => onToggleReveal(note)}
              className="text-[10px] sm:text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-semibold ml-2 shrink-0 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 transition active:scale-95 touch-manipulation"
            >
              <Eye className="w-3 h-3" />
              <span>Show</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 flex-1 flex flex-col justify-between">
            <div className="text-xs sm:text-[13px] text-slate-200/90 whitespace-pre-wrap font-sans leading-relaxed break-words select-text max-h-48 sm:max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {note.content || <span className="italic text-slate-400/60 font-serif text-[11px] sm:text-xs">Jot down your thoughts here...</span>}
            </div>
            {note.isSecret && isRevealed && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onToggleReveal(note)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-sans px-1.5 py-0.5 rounded hover:bg-white/10 active:scale-95 touch-manipulation"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Hide</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle Bottom-Right Timestamp & Category Tag */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-white/5 text-[9px] sm:text-[10px] text-slate-400/60 font-mono">
        <span className="truncate max-w-[120px] sm:max-w-[200px]">
          {note.category ? `#${note.category}` : ''}
        </span>
        <span className="shrink-0" title={`Updated on ${formatDate(note.updatedAt || note.createdAt)}`}>
          {formatDate(note.updatedAt || note.createdAt)}
        </span>
      </div>
    </div>
  );
});
