'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  X,
  RefreshCw,
  DollarSign,
  ShieldAlert,
  Calendar,
  Lock,
  Layers,
  FileText,
  UserCheck,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';
import {
  normalizeEmployees,
  normalizePayrollRuns,
  formatPrice,
  safeLowerCase,
  safeReplace,
  type NormalizedEmployee,
  type NormalizedPayrollRun,
} from '@/lib/retail/adapters';

export default function RetailPayrollPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<NormalizedEmployee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<NormalizedPayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Employee Form
  const [newEmp, setNewEmp] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: 'Cashier / Sales Clerk',
    department: 'Sales & Floor',
    employment_type: 'full_time',
    base_salary: 1200,
    hire_date: new Date().toISOString().split('T')[0],
  });

  // Payroll run period
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [payPeriod, setPayPeriod] = useState({
    start: currentMonthStart,
    end: currentMonthEnd,
    notes: 'Standard Monthly Hardware Store Wages (USD)',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const [resEmp, resPay] = await Promise.all([
        authFetch('/api/retail/employees'),
        authFetch('/api/retail/payroll/runs'),
      ]);

      if (!resEmp.ok) {
        let errJson: any = null;
        try { errJson = await resEmp.json(); } catch {}
        setErrorState({
          status: resEmp.status,
          code: errJson?.code || errJson?.error || (resEmp.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load staff & payroll: HTTP ${resEmp.status}`,
        });
        return;
      }

      const dataEmp = await resEmp.json();
      const dataPay = await resPay.json();

      if (dataEmp.success) setEmployees(normalizeEmployees(dataEmp.employees));
      if (dataPay.success) setPayrollRuns(normalizePayrollRuns(dataPay.payrollRuns));
    } catch (e: any) {
      console.error('Failed to fetch payroll data', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail payroll services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const canonicalEmpPayload = {
        firstName: newEmp.first_name,
        first_name: newEmp.first_name,
        lastName: newEmp.last_name,
        last_name: newEmp.last_name,
        email: newEmp.email,
        phone: newEmp.phone,
        jobTitle: newEmp.job_title,
        job_title: newEmp.job_title,
        department: newEmp.department,
        employmentType: newEmp.employment_type,
        employment_type: newEmp.employment_type,
        baseSalary: Number(newEmp.base_salary) || 0,
        base_salary: Number(newEmp.base_salary) || 0,
        hireDate: newEmp.hire_date,
        hire_date: newEmp.hire_date,
      };

      const res = await authFetch('/api/retail/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canonicalEmpPayload),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddEmpModal(false);
        setNotification(`Employee "${newEmp.first_name} ${newEmp.last_name}" added.`);
        setTimeout(() => setNotification(null), 3500);
        fetchData();
      } else {
        alert(data.error || 'Failed to add employee');
      }
    } catch (e: any) {
      alert(e.message || 'Error adding employee');
    }
  };

  const handleGeneratePayrollRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCalculatingPayroll(true);
      const res = await authFetch('/api/retail/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: payPeriod.start,
          periodEnd: payPeriod.end,
          notes: payPeriod.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowRunPayrollModal(false);
        const netWagesFormatted = formatPrice(data.payrollRun?.total_net_pay ?? data.payrollRun?.totalNetPay);
        setNotification(`Monthly payroll run generated: ${netWagesFormatted} calculated.`);
        setTimeout(() => setNotification(null), 4500);
        fetchData();
      } else {
        alert(data.error || 'Failed to generate payroll run');
      }
    } catch (e: any) {
      alert(e.message || 'Error calculating payroll');
    } finally {
      setCalculatingPayroll(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      safeLowerCase(emp.job_title || emp.jobTitle).includes(q) ||
      safeLowerCase(emp.department).includes(q)
    );
  });

  const totalMonthlyPayroll = employees.reduce((acc, emp) => acc + (emp.base_salary ?? emp.baseSalary ?? 0), 0);

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchData} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchData} />

      <div role="region" aria-label="Staff Payroll and Compensation" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {notification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Safe Disbursement Notice */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-300">
          <ShieldAlert className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-blue-200">Pilot Protection Notice:</strong> Direct bank salary transfers and automated tax authority filings are intentionally disabled during this hardware store evaluation. Wages are calculated for store P&L ledger tracking and recorded as verified internal payroll in USD ($).
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Store Staff & Internal Payroll
            </h2>
            <p className="text-sm text-zinc-400">
              Employee roster, shift staff, salary role privacy, and monthly wage calculations in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'employees' ? (
              <button
                onClick={() => setShowAddEmpModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Staff Member
              </button>
            ) : (
              <button
                onClick={() => setShowRunPayrollModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <DollarSign className="w-4 h-4" />
                Run Monthly Payroll
              </button>
            )}
          </div>
        </div>

        {/* Tab Switching */}
        <div className="flex border-b border-zinc-800 gap-6 text-sm">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'employees'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Active Staff Directory ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'payroll'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Payroll Ledger ({payrollRuns.length})
          </button>
        </div>

        {/* EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 backdrop-blur-sm">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name, title, department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Job Title</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4 text-right">Base Salary (USD)</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                          Loading employee roster...
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          No employees found. Click "Add Staff Member" to add one.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-zinc-100">
                            {emp.first_name || emp.firstName || '—'} {emp.last_name || emp.lastName || ''}
                            {emp.email && (
                              <div className="text-xs text-zinc-500 font-mono mt-0.5">{emp.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">{emp.job_title || emp.jobTitle || 'Staff'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                              {emp.department || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs capitalize text-zinc-400 font-mono">
                            {safeReplace(emp.employment_type || emp.employmentType, '_', ' ')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {(emp.base_salary !== null && emp.base_salary !== undefined) ? (
                              <span className="text-emerald-400">{formatPrice(emp.base_salary)}/mo</span>
                            ) : (
                              <span className="text-zinc-500 flex items-center justify-end gap-1 text-xs">
                                <Lock className="w-3 h-3" /> Confidential
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PAYROLL RUNS TAB */}
        {activeTab === 'payroll' && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                    <th className="py-3.5 px-4">Pay Period</th>
                    <th className="py-3.5 px-4 text-center">Staff Count</th>
                    <th className="py-3.5 px-4 text-right">Gross Pay</th>
                    <th className="py-3.5 px-4 text-right">Deductions</th>
                    <th className="py-3.5 px-4 text-right">Net Wages (USD)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                        Loading payroll ledger...
                      </td>
                    </tr>
                  ) : payrollRuns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        No payroll runs executed yet. Click "Run Monthly Payroll" to calculate wages.
                      </td>
                    </tr>
                  ) : (
                    payrollRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-zinc-200">
                          {run.pay_period_start ? new Date(run.pay_period_start).toLocaleDateString() : '—'} — {run.pay_period_end ? new Date(run.pay_period_end).toLocaleDateString() : '—'}
                          {run.notes && (
                            <div className="text-xs text-zinc-500 font-sans mt-0.5">{run.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                          {run.employee_count ?? run.employeeCount ?? 0} staff
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                          {formatPrice(run.total_gross_pay ?? run.totalGrossPay)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                          -{formatPrice(run.total_deductions ?? run.totalDeductions)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          {formatPrice(run.total_net_pay ?? run.totalNetPay)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {safeReplace(run.status, '_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADD EMPLOYEE MODAL */}
        {showAddEmpModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Add Hardware Staff Member
                </h3>
                <button
                  onClick={() => setShowAddEmpModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">First Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. John"
                      value={newEmp.first_name}
                      onChange={(e) => setNewEmp({ ...newEmp, first_name: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Last Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Smith"
                      value={newEmp.last_name}
                      onChange={(e) => setNewEmp({ ...newEmp, last_name: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Job Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Warehouse Clerk"
                      value={newEmp.job_title}
                      onChange={(e) => setNewEmp({ ...newEmp, job_title: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Department</label>
                    <select
                      value={newEmp.department}
                      onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Sales & Floor">Sales & Floor</option>
                      <option value="Warehouse & Logistics">Warehouse & Logistics</option>
                      <option value="Admin & Purchasing">Admin & Purchasing</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Monthly Base Salary ($ USD) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newEmp.base_salary}
                      onChange={(e) => setNewEmp({ ...newEmp, base_salary: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Hire Date</label>
                    <input
                      type="date"
                      value={newEmp.hire_date}
                      onChange={(e) => setNewEmp({ ...newEmp, hire_date: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddEmpModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Save Staff Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RUN PAYROLL MODAL */}
        {showRunPayrollModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Calculate Monthly Payroll (USD)
                </h3>
                <button
                  onClick={() => setShowRunPayrollModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs font-mono space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Eligible Active Employees:</span>
                  <span className="text-zinc-200 font-bold">{employees.length}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Estimated Total Wages:</span>
                  <span className="text-emerald-400 font-bold">${totalMonthlyPayroll.toFixed(2)} USD</span>
                </div>
              </div>

              <form onSubmit={handleGeneratePayrollRun} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Period Start</label>
                    <input
                      type="date"
                      value={payPeriod.start}
                      onChange={(e) => setPayPeriod({ ...payPeriod, start: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Period End</label>
                    <input
                      type="date"
                      value={payPeriod.end}
                      onChange={(e) => setPayPeriod({ ...payPeriod, end: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Payroll Description</label>
                  <input
                    type="text"
                    value={payPeriod.notes}
                    onChange={(e) => setPayPeriod({ ...payPeriod, notes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowRunPayrollModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={calculatingPayroll}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {calculatingPayroll ? 'Calculating...' : 'Execute Payroll Calculation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
