import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Cloud,
  CloudUpload,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  HardDrive,
  ShieldCheck,
  X,
  FileArchive,
  ArrowDownCircle,
  Calendar,
  Sparkles,
  Check,
  RotateCcw
} from 'lucide-react';

export default function BackupModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [status, setStatus] = useState(null);
  const [backups, setBackups] = useState({ localBackups: [], driveBackups: [], database: '' });
  const [feedback, setFeedback] = useState(null);
  const [restoringFile, setRestoringFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  // Lock background body scroll and listen for ESC key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch status and backups list
  const fetchBackupData = async () => {
    setLoading(true);
    try {
      const [statusRes, listRes] = await Promise.allSettled([
        axios.get('/api/backup/status'),
        axios.get('/api/backup/list')
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
      }
      if (listRes.status === 'fulfilled') {
        setBackups(listRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load backup details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackupData();
      setFeedback(null);
      setConfirmRestore(null);
    }
  }, [isOpen]);

  // Trigger manual backup
  const handleTriggerBackup = async () => {
    setTriggering(true);
    setFeedback(null);
    try {
      const res = await axios.post('/api/backup/trigger');
      if (res.data.success) {
        if (res.data.driveError) {
          setFeedback({
            type: 'warning',
            message: `Local backup saved (${res.data.localBackup?.filename}), but Google Drive sync failed: ${res.data.driveError}`
          });
        } else if (res.data.driveBackup) {
          setFeedback({
            type: 'success',
            message: `🎉 Backup successfully saved & uploaded to Google Drive! (ID: ${res.data.driveBackup.id})`
          });
        } else {
          setFeedback({
            type: 'success',
            message: `Backup created successfully! Saved: ${res.data.localBackup?.filename || 'archive'}`
          });
        }
        await fetchBackupData();
      } else {
        throw new Error(res.data.error || 'Backup trigger failed');
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to trigger backup'
      });
    } finally {
      setTriggering(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' && createPortal(
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Database Backup & Cloud Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {status?.database || 'MySQL'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated daily midnight dumps + one-click Google Drive sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Status Alert Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="flex-1">{feedback.message}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Last Backup Highlight Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Last Backup Taken
                </div>
                <div className="text-sm font-bold text-white font-mono truncate">
                  {status?.lastBackupTime ? (
                    new Date(status.lastBackupTime).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                  ) : (
                    <span className="text-slate-500 font-normal">No backup recorded yet</span>
                  )}
                </div>
              </div>
            </div>

            {status?.lastBackupTime && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                {status?.lastBackupSource || 'Active'}
              </span>
            )}
          </div>

          {/* Configuration & Cron Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Auto Schedule Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Auto Daily Backup
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${status?.isAutoBackupEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  {status?.isAutoBackupEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {status?.schedule || 'Every day at 00:00 (Midnight)'}
              </div>
              <div className="text-[11px] text-slate-500">
                Retention window: {status?.retentionDays || 30} days
              </div>
            </div>

            {/* Google Drive Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <CloudUpload className="w-3.5 h-3.5 text-cyan-400" />
                  Google Drive Target
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${status?.isConfigured ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                  {status?.isConfigured ? 'CONNECTED' : 'LOCAL ONLY'}
                </span>
              </div>
              <div className="text-sm font-bold text-white truncate font-mono">
                {status?.hasFolderId ? 'Folder Linked' : 'Folder ID Needed'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {status?.hasOAuth ? 'OAuth Active' : (status?.hasInlineKey || status?.hasKeyPath ? 'Service Account Active' : 'Credentials Needed')}
              </div>
            </div>
          </div>

          {/* Trigger Backup Action Button */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Manual On-Demand Backup
              </div>
              <div className="text-[11px] text-slate-400">
                Instantly dumps all schemas, table records, and syncs compressed archive
              </div>
            </div>

            <button
              onClick={handleTriggerBackup}
              disabled={triggering}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {triggering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dumping & Syncing...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Backup Database Now</span>
                </>
              )}
            </button>
          </div>

          {/* Recent Archives List (Local + Drive + DB Logs) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <FileArchive className="w-3.5 h-3.5 text-indigo-400" />
                Backup Archives History
              </h4>
              <button
                onClick={fetchBackupData}
                disabled={loading}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950/40 max-h-56 overflow-y-auto">
              {(() => {
                // Combine and deduplicate drive backups, local backups, and db logs
                const items = [];
                const seen = new Set();

                // 1. Google Drive backups
                (backups.driveBackups || []).forEach((b) => {
                  if (b.name && !seen.has(b.name)) {
                    seen.add(b.name);
                    items.push({
                      name: b.name,
                      sizeKB: b.size ? (b.size / 1024).toFixed(2) : null,
                      createdAt: b.createdTime || b.modifiedTime,
                      source: 'Google Drive',
                      link: b.webViewLink,
                      badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                    });
                  }
                });

                // 2. DB logged backups
                (backups.dbBackups || []).forEach((b) => {
                  if (b.name && !seen.has(b.name)) {
                    seen.add(b.name);
                    items.push({
                      name: b.name,
                      sizeKB: b.sizeKB || (b.sizeBytes ? (b.sizeBytes / 1024).toFixed(2) : null),
                      createdAt: b.createdAt,
                      source: b.driveFileId ? 'Drive Synced' : 'Database Log',
                      badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    });
                  }
                });

                // 3. Local disk backups
                (backups.localBackups || []).forEach((b) => {
                  if (b.name && !seen.has(b.name)) {
                    seen.add(b.name);
                    items.push({
                      name: b.name,
                      sizeKB: b.sizeKB,
                      createdAt: b.createdAt,
                      source: 'Local Disk',
                      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700'
                    });
                  }
                });

                // Sort by createdAt descending
                items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

                if (items.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No backup archives found yet. Click "Backup Database Now" above to create your first archive.
                    </div>
                  );
                }

                return items.map((b, idx) => (
                  <div key={b.name || idx} className="p-2.5 sm:p-3 flex items-center justify-between gap-2 hover:bg-slate-800/30 transition text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                        <FileArchive className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-slate-200 font-semibold truncate text-[11px] sm:text-xs">
                          {b.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Recent'}</span>
                          {b.sizeKB && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400 font-mono">{b.sizeKB} KB</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${b.badgeClass}`}>
                        {b.source}
                      </span>
                      {b.link && (
                        <a
                          href={b.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition"
                          title="Open in Google Drive"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted local storage with SSL cloud tunnel</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
