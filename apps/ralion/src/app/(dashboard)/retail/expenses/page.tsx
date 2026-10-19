'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  X,
  RefreshCw,
  DollarSign,
  PieChart,
  Calendar,
  Building,
  Fuel,
  Wrench,
  Lightbulb,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  payee: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  expense_date: string;
  created_at: string;
}

export default function RetailExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Expense form
  const [newExpense, setNewExpense] = useState({
    category: 'Rent & Premises',
    amount: 0,
    payee: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/retail/expenses');
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (e) {
      console.error('Failed to fetch expenses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newExpense.amount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    try {
      const res = await fetch('/api/retail/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNotification(`Operating expense of $${newExpense.amount.toFixed(2)} USD logged successfully.`);
        setTimeout(() => setNotification(null), 4000);
        setNewExpense({
          category: 'Rent & Premises',
          amount: 0,
          payee: '',
          payment_method: 'cash',
          reference_number: '',
          notes: '',
          expense_date: new Date().toISOString().split('T')[0],
        });
        fetchExpenses();
      } else {
        alert(data.error || 'Failed to record expense');
      }
    } catch (e: any) {
      alert(e.message || 'Error recording expense');
    }
  };

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  // Group by category
  const categories = Array.from(new Set(expenses.map((e) => e.category)));
  const categoryTotals: { [cat: string]: number } = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.payee.toLowerCase().includes(search.toLowerCase()) ||
      (e.reference_number && e.reference_number.toLowerCase().includes(search.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchExpenses} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {notification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              Operating Expenses (OPEX)
            </h2>
            <p className="text-sm text-zinc-400">
              Record hardware store operational overheads in USD ($). Strictly non-inventory expenses to prevent double-counting COGS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchExpenses}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </button>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1">Total Operating Expenses</div>
            <div className="text-2xl font-bold font-mono text-rose-400">
              ${totalExpenses.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">USD • Excludes inventory purchases & payroll</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1">Expense Entries Logged</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{expenses.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Verified expenditure vouchers</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1">Top Cost Driver</div>
            <div className="text-base font-bold text-zinc-200 truncate">
              {Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a])[0] || 'N/A'}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              ${(Object.values(categoryTotals).sort((a, b) => b - a)[0] || 0).toFixed(2)} USD
            </div>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {Object.entries(categoryTotals).map(([cat, amt]) => (
            <div
              key={cat}
              className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-zinc-400">{cat}:</span>
              <strong className="text-zinc-200 font-mono">${amt.toFixed(2)}</strong>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by payee, notes, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-rose-500/50"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expense Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Payee / Vendor</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No operating expense records found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-200">
                        {exp.payee}
                        {exp.notes && (
                          <div className="text-xs text-zinc-500 font-sans mt-0.5">{exp.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize font-mono text-xs text-zinc-400">
                        {exp.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-500">
                        {exp.reference_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        -${exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECORD EXPENSE MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  Record Store Operating Expense
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[11px] text-rose-300">
                Operating expenses are recorded on the income statement separately from COGS to ensure non-double-counting.
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Expense Category *</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Rent & Premises">Rent & Premises</option>
                    <option value="Utilities (Electricity/Water)">Utilities (Electricity/Water)</option>
                    <option value="Fuel & Vehicle Transport">Fuel & Vehicle Transport</option>
                    <option value="Repairs & Equipment">Repairs & Equipment</option>
                    <option value="Packaging & Office">Packaging & Office</option>
                    <option value="Security & Guarding">Security & Guarding</option>
                    <option value="Licences & Compliance">Licences & Compliance</option>
                    <option value="Marketing & Signage">Marketing & Signage</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Amount ($ USD) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newExpense.amount || ''}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Date *</label>
                    <input
                      required
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Payee / Vendor Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. City Power & Electric"
                    value={newExpense.payee}
                    onChange={(e) => setNewExpense({ ...newExpense, payee: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Payment Method</label>
                    <select
                      value={newExpense.payment_method}
                      onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Corporate Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="petty_cash">Petty Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Invoice / Receipt #</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-9921"
                      value={newExpense.reference_number}
                      onChange={(e) => setNewExpense({ ...newExpense, reference_number: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Expense Notes</label>
                  <input
                    type="text"
                    placeholder="Description or authorization details..."
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition"
                  >
                    Log Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
