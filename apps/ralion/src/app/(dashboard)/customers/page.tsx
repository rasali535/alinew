'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Building, ChevronRight, Clock, Mail, MapPin, Phone, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';

type CustomerCategory = 'ENTERPRISE' | 'SMB' | 'GOVERNMENT' | 'INDIVIDUAL';

interface CustomerProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  category: CustomerCategory;
  createdDate: string;
  notes: string;
  dealValue: number | null;
  timeline: Array<{ action: string; date: string; details: string }>;
}

interface CustomerForm {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  category: CustomerCategory;
  notes: string;
  dealValue: string;
}

const EMPTY_FORM: CustomerForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: 'Gaborone, Botswana',
  category: 'SMB',
  notes: '',
  dealValue: '',
};

function mapCustomer(row: any): CustomerProfile {
  return {
    id: String(row.id),
    name: row.name || 'Unnamed Customer',
    company: row.company || 'Independent',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || 'Botswana',
    category: (row.category || 'SMB') as CustomerCategory,
    createdDate: new Date(row.created_at || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
    notes: row.notes || '',
    dealValue: row.deal_value == null ? null : Number(row.deal_value),
    timeline: [
      {
        action: 'Customer record active',
        date: new Date(row.created_at || Date.now()).toLocaleString(),
        details: 'Persisted in the tenant-scoped Ralion customer store.',
      },
    ],
  };
}

export default function CustomersPage() {
  const { organization } = useOrganization();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCustomers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/crm/customers');
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load customers.');
      setCustomers((result.customers || []).map(mapCustomer));
    } catch (err: any) {
      setCustomers([]);
      setError(err?.message || 'Unable to load customers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!organization?.id) return;
    void loadCustomers();
  }, [organization?.id]);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query) ||
      customer.company.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (customer: CustomerProfile) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      company: customer.company === 'Independent' ? '' : customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      category: customer.category,
      notes: customer.notes,
      dealValue: customer.dealValue == null ? '' : String(customer.dealValue),
    });
    setIsModalOpen(true);
  };

  const saveCustomer = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await authFetch('/api/crm/customers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          address: form.address,
          category: form.category,
          notes: form.notes,
          dealValue: form.dealValue === '' ? null : Number(form.dealValue),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save customer.');

      const mapped = mapCustomer(result.customer);
      setCustomers((current) => editingId
        ? current.map((customer) => customer.id === editingId ? mapped : customer)
        : [mapped, ...current]
      );
      if (selectedCustomer?.id === editingId) setSelectedCustomer(mapped);
      setIsModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || 'Unable to save customer.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomer = async (customer: CustomerProfile) => {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    setError('');
    try {
      const response = await authFetch(`/api/crm/customers?id=${encodeURIComponent(customer.id)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to delete customer.');
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      setSelectedCustomer(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to delete customer.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Customers Management</h1>
            <Badge variant="primary">Durable CRM</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Tenant-scoped customer records, notes and relationship history.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-200">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory ({filteredCustomers.length})</CardTitle>
          <CardDescription>Every record is loaded from the authenticated workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-500">Loading customer records…</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-10 text-center">
              <Sparkles className="w-6 h-6 text-blue-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No customers yet</p>
              <p className="text-xs text-zinc-500 mt-1">Add the first customer to begin building your durable CRM history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <td className="p-4 font-bold text-white">{customer.name}</td>
                      <td className="p-4">{customer.company}</td>
                      <td className="p-4 text-zinc-400 font-mono">{customer.email}<br /><span className="text-[10px]">{customer.phone || 'No phone'}</span></td>
                      <td className="p-4"><Badge variant={customer.category === 'ENTERPRISE' ? 'purple' : 'primary'}>{customer.category}</Badge></td>
                      <td className="p-4 font-mono text-zinc-400">{customer.createdDate}</td>
                      <td className="p-4 text-right"><span className="text-blue-400 inline-flex items-center gap-1">View <ChevronRight className="w-3.5 h-3.5" /></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">{selectedCustomer.name}<Badge variant="purple">{selectedCustomer.category}</Badge></h2>
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><Building className="w-3.5 h-3.5" /> {selectedCustomer.company}</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3 text-xs">
              <span className="flex gap-2 text-zinc-400"><Mail className="w-4 h-4" /><strong className="text-white font-mono">{selectedCustomer.email}</strong></span>
              <span className="flex gap-2 text-zinc-400"><Phone className="w-4 h-4" /><strong className="text-white font-mono">{selectedCustomer.phone || 'Not supplied'}</strong></span>
              <span className="flex gap-2 text-zinc-400"><MapPin className="w-4 h-4" /><strong className="text-white">{selectedCustomer.address}</strong></span>
              {selectedCustomer.dealValue != null && <span className="text-zinc-400">Relationship value: <strong className="text-white">${selectedCustomer.dealValue.toLocaleString()}</strong></span>}
              <span className="text-zinc-400 border-t border-zinc-800 pt-3">Notes: <span className="text-zinc-200">{selectedCustomer.notes || 'No notes yet.'}</span></span>
            </div>

            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-3"><Clock className="w-3.5 h-3.5 text-blue-400" /> Timeline</h3>
              {selectedCustomer.timeline.map((entry, index) => (
                <div key={`${entry.action}-${index}`} className="border-l border-blue-500/30 pl-4 py-2">
                  <p className="text-xs font-semibold text-white">{entry.action}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{entry.date}</p>
                  <p className="text-xs text-zinc-400 mt-1">{entry.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
            <Button variant="glass" size="sm" onClick={() => void deleteCustomer(selectedCustomer)}><Trash2 className="w-4 h-4" /> Delete</Button>
            <Button variant="primary" size="sm" onClick={() => openEdit(selectedCustomer)}>Edit Customer</Button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Customer' : 'Add Customer'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Customer name *" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email *" type="email" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Address" className="sm:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as CustomerCategory })} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white">
            <option value="SMB">SMB</option><option value="ENTERPRISE">Enterprise</option><option value="GOVERNMENT">Government</option><option value="INDIVIDUAL">Individual</option>
          </select>
          <input value={form.dealValue} onChange={(event) => setForm({ ...form, dealValue: event.target.value })} placeholder="Relationship value" type="number" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" rows={4} className="sm:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white resize-none" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="glass" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={isSaving || !form.name.trim() || !form.email.trim()} onClick={() => void saveCustomer()}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Customer'}</Button>
        </div>
      </Modal>
    </div>
  );
}
