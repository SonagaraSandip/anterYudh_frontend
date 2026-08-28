import React, { useState } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Award,
  BarChart3,
  AlertCircle
} from 'lucide-react';

export default function GoalView() {
  const [goals, setGoals] = useState([
    {
      id: 1,
      title: 'Emergency Fund (6 Months)',
      category: 'Security',
      targetAmount: 300000,
      currentAmount: 240000,
      targetDate: '2026-12-31',
      status: 'on_track'
    },
    {
      id: 2,
      title: 'Demat IPO Investment Corpus',
      category: 'Wealth Growth',
      targetAmount: 500000,
      currentAmount: 350000,
      targetDate: '2027-03-31',
      status: 'on_track'
    },
    {
      id: 3,
      title: 'New Electric Vehicle Fund',
      category: 'Lifestyle',
      targetAmount: 1200000,
      currentAmount: 480000,
      targetDate: '2027-10-15',
      status: 'in_progress'
    },
    {
      id: 4,
      title: 'Long Term Retirement Bucket',
      category: 'Freedom',
      targetAmount: 25000000,
      currentAmount: 4500000,
      targetDate: '2040-01-01',
      status: 'in_progress'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'Wealth Growth',
    targetAmount: '',
    currentAmount: '',
    targetDate: ''
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    const item = {
      id: Date.now(),
      title: newGoal.title.trim(),
      category: newGoal.category,
      targetAmount: parseFloat(newGoal.targetAmount) || 0,
      currentAmount: parseFloat(newGoal.currentAmount) || 0,
      targetDate: newGoal.targetDate || '2027-01-01',
      status: 'in_progress'
    };
    setGoals([item, ...goals]);
    setNewGoal({ title: '', category: 'Wealth Growth', targetAmount: '', currentAmount: '', targetDate: '' });
    setIsModalOpen(false);
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallPercent = totalTarget > 0 ? ((totalCurrent / totalTarget) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner for Goal Module */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/20 p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Financial Goals & Milestones</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              Under Progress / Beta
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Define high-conviction financial milestones, target dates, and track savings progress.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Goal</span>
        </button>
      </div>

      {/* Goal Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Current Savings</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalCurrent)}
          </div>
          <span className="text-[10px] text-slate-500">Across all {goals.length} target milestones</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Target Corpus</span>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
            {formatCurrency(totalTarget)}
          </div>
          <span className="text-[10px] text-slate-500">Combined financial milestone value</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Overall Progress</span>
          <div className="text-2xl font-bold font-mono text-teal-300 mt-1">
            {overallPercent}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(parseFloat(overallPercent), 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1) : '0';
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <div
              key={goal.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg space-y-4 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {goal.category}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5">{goal.title}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg">
                  {progress}%
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Current: {formatCurrency(goal.currentAmount)}</span>
                  <span className="text-slate-200 font-semibold">Target: {formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(parseFloat(progress), 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target: {goal.targetDate}</span>
                </div>
                <span className="text-slate-500 font-mono">
                  Remaining: {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <span>Create New Financial Goal</span>
            </h3>

            <form onSubmit={handleAddGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dream House Downpayment"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Saved (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Date</label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
