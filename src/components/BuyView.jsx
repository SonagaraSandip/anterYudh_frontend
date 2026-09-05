import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  Plus,
  Tag,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function BuyView() {
  const [items, setItems] = useState([
    { id: 1, title: 'MacBook Pro M-Series for Trading', category: 'Tech & Gear', estimatedCost: 180000, priority: 'High', savedAmount: 140000, status: 'planning' },
    { id: 2, title: 'Ergonomic Standing Desk Setup', category: 'Workspace', estimatedCost: 45000, priority: 'Medium', savedAmount: 45000, status: 'ready_to_buy' },
    { id: 3, title: 'Gold Sovereign Coins (10g)', category: 'Precious Metals', estimatedCost: 75000, priority: 'High', savedAmount: 50000, status: 'planning' },
    { id: 4, title: 'Noise Cancelling Headphones', category: 'Audio', estimatedCost: 28000, priority: 'Low', savedAmount: 10000, status: 'wishlist' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    category: 'Tech & Gear',
    estimatedCost: '',
    savedAmount: '',
    priority: 'High'
  });

  // Lock background body scroll and listen for ESC key
  useEffect(() => {
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const totalCost = items.reduce((sum, i) => sum + i.estimatedCost, 0);
  const totalSaved = items.reduce((sum, i) => sum + i.savedAmount, 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;
    const item = {
      id: Date.now(),
      title: newItem.title.trim(),
      category: newItem.category,
      estimatedCost: parseFloat(newItem.estimatedCost) || 0,
      savedAmount: parseFloat(newItem.savedAmount) || 0,
      priority: newItem.priority,
      status: 'planning'
    };
    setItems([item, ...items]);
    setNewItem({ title: '', category: 'Tech & Gear', estimatedCost: '', savedAmount: '', priority: 'High' });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner for Buy Module */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Buy & Asset Purchase Hub</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
              Under Progress / Beta
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Plan capital purchases, evaluate priorities, and track earmarked funds for upcoming acquisitions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Planned Item</span>
        </button>
      </div>

      {/* Buy Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Planned Value</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalCost)}
          </div>
          <span className="text-[10px] text-slate-500">Across {items.length} planned items</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Earmarked Funds</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalSaved)}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalCost > 0 ? ((totalSaved / totalCost) * 100).toFixed(0) : 0}% funded
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">High Priority Items</span>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
            {items.filter((i) => i.priority === 'High').length} Items
          </div>
          <span className="text-[10px] text-slate-500">Ready for purchase allocation</span>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const fundedPercent = item.estimatedCost > 0 ? ((item.savedAmount / item.estimatedCost) * 100).toFixed(0) : '0';
          const isReady = item.savedAmount >= item.estimatedCost;

          return (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-4 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : item.priority === 'Medium'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1.5">{item.title}</h3>
                </div>

                {isReady && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Funded</span>
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Allocated: {formatCurrency(item.savedAmount)}</span>
                  <span className="text-slate-200 font-semibold">Cost: {formatCurrency(item.estimatedCost)}</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isReady ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
                    }`}
                    style={{ width: `${Math.min(parseFloat(fundedPercent), 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="font-mono">
                  {fundedPercent}% target reached
                </span>
                <span className="text-slate-500 font-mono">
                  Remaining: {formatCurrency(Math.max(0, item.estimatedCost - item.savedAmount))}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Item (Rendered in Body Portal for True Viewport Screen Centering) */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto relative z-[100000]"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span>Add Planned Item / Wishlist</span>
            </h3>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony Alpha Camera"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    value={newItem.estimatedCost}
                    onChange={(e) => setNewItem({ ...newItem, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Allocated Funds (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    value={newItem.savedAmount}
                    onChange={(e) => setNewItem({ ...newItem, savedAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tech & Gear">Tech & Gear</option>
                    <option value="Precious Metals">Precious Metals</option>
                    <option value="Workspace">Workspace</option>
                    <option value="Travel & Gear">Travel & Gear</option>
                    <option value="Vehicle">Vehicle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
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
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md transition"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
