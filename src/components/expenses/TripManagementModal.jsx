import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Compass, MapPin, Calendar, X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export default function TripManagementModal({
  isOpen,
  editingTrip,
  onClose,
  onSaveTrip
}) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTrip) {
      setName(editingTrip.name || '');
      setDestination(editingTrip.destination || '');
      const sDate = editingTrip.startDate ? String(editingTrip.startDate).slice(0, 10) : '';
      const eDate = editingTrip.endDate ? String(editingTrip.endDate).slice(0, 10) : '';
      setStartDate(sDate);
      setEndDate(eDate);
      setIsMultiDay(!!eDate && eDate !== sDate);
      setStatus(editingTrip.status || 'active');
      setNotes(editingTrip.notes || '');
    } else {
      setName('');
      setDestination('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setIsMultiDay(false);
      setStatus('active');
      setNotes('');
    }
  }, [editingTrip, isOpen]);

  // Lock background body scroll and listen for ESC key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSaveTrip({
        name: name.trim(),
        destination: destination.trim(),
        startDate: startDate || null,
        endDate: isMultiDay && endDate ? endDate : null,
        budget: 0,
        status,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error saving trip:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative z-[100000] my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white shadow-md shadow-indigo-600/30 shrink-0">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {editingTrip ? 'Edit Trip / Outing' : 'Create Trip / Outing'}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Group exam rounds, single-day events, travel & outings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 overflow-y-auto pr-1">
          {/* Trip Name */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
              Trip / Event Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ahmedabad Exam, Mumbai Interview, Goa Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          {/* Destination & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>Location / City (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmedabad, Mumbai"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="active" className="bg-slate-900">Active (Ongoing / Current)</option>
                <option value="completed" className="bg-slate-900">Completed (Past)</option>
                <option value="planning" className="bg-slate-900">Planning (Upcoming)</option>
              </select>
            </div>
          </div>

          {/* Date Section */}
          <div className="space-y-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" />
                <span>Trip / Event Date <span className="text-rose-400">*</span></span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-indigo-300 hover:text-indigo-200">
                <input
                  type="checkbox"
                  checked={isMultiDay}
                  onChange={(e) => setIsMultiDay(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                />
                <span>Multi-day Trip?</span>
              </label>
            </div>

            <div className={`grid ${isMultiDay ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              <div>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {isMultiDay && (
                <div>
                  <input
                    type="date"
                    placeholder="Return Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Exam center at Satellite, AMTS bus, Metro fee, Return train"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Modal Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-2.5 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50 touch-manipulation text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 touch-manipulation"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : editingTrip ? 'Save Trip' : 'Create Trip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
