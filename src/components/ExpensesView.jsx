import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  TrendingDown,
  Calendar,
  Sparkles,
  CheckCircle2,
  DollarSign,
  PieChart,
  Wallet,
  ShoppingBag,
  Home,
  Zap,
  Coffee
} from 'lucide-react';

export default function ExpensesView() {
  const [expenses, setExpenses] = useState([
    { id: 1, title: 'House Rent & Maintenance', category: 'Housing', amount: 22000, date: '2026-08-01', type: 'essential' },
    { id: 2, title: 'Electricity & Broadband Bill', category: 'Utilities', amount: 3500, date: '2026-08-05', type: 'essential' },
    { id: 3, title: 'Groceries & Household Supplies', category: 'Food & Groceries', amount: 12500, date: '2026-08-12', type: 'essential' },
    { id: 4, title: 'Dining Out & Weekend Cafes', category: 'Leisure', amount: 4800, date: '2026-08-18', type: 'discretionary' },
    { id: 5, title: 'Fuel & Vehicle Maintenance', category: 'Transport', amount: 4200, date: '2026-08-22', type: 'essential' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExp, setNewExp] = useState({
    title: '',
    category: 'Housing',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const monthlyBudget = 65000;
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = monthlyBudget - totalSpent;
  const burnPercent = ((totalSpent / monthlyBudget) * 100).toFixed(1);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExp.title.trim()) return;
    const item = {
      id: Date.now(),
      title: newExp.title.trim(),
      category: newExp.category,
      amount: parseFloat(newExp.amount) || 0,
      date: newExp.date || new Date().toISOString().split('T')[0],
      type: 'essential'
    };
    setExpenses([item, ...expenses]);
    setNewExp({ title: '', category: 'Housing', amount: '', date: new Date().toISOString().split('T')[0] });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner for Expenses Module */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/20 p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Expenses & Cashflow Hub</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
              Under Progress / Beta
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Monitor monthly cash burn rate, track recurring expenses, and stay within target budgets.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Expense</span>
        </button>
      </div>

      {/* Expense Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Spent (This Month)</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {formatCurrency(totalSpent)}
          </div>
          <span className="text-[10px] text-slate-500">Across {expenses.length} logged entries</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Monthly Target Budget</span>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
            {formatCurrency(monthlyBudget)}
          </div>
          <span className="text-[10px] text-slate-500">Fixed monthly allowance limit</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Budget Remaining</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(remainingBudget)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                parseFloat(burnPercent) > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'
              }`}
              style={{ width: `${Math.min(parseFloat(burnPercent), 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Expense Entries List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Recent Expense Outflows
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Burn Rate: {burnPercent}%
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {expenses.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-800/40 transition flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{item.date}</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono font-bold text-xs text-rose-400">
                -{formatCurrency(item.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-400" />
              <span>Log New Expense</span>
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Health Insurance Premium"
                  value={newExp.title}
                  onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    value={newExp.amount}
                    onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newExp.category}
                    onChange={(e) => setNewExp({ ...newExp, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Housing">Housing</option>
                    <option value="Food & Groceries">Food & Groceries</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Transport">Transport</option>
                    <option value="Leisure">Leisure</option>
                    <option value="Healthcare">Healthcare</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newExp.date}
                  onChange={(e) => setNewExp({ ...newExp, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
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
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
