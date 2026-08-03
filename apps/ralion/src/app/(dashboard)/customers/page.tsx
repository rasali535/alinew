'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Users, Plus, Search, Filter, Mail, Phone, MapPin, Clock, FileText, ChevronRight, X, Sparkles, Building } from 'lucide-react';

interface CustomerProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  category: 'ENTERPRISE' | 'SMB' | 'GOVERNMENT' | 'INDIVIDUAL';
  createdDate: string;
  notes: string;
  timeline: Array<{ action: string; date: string; details: string }>;
}

const initialCustomersList: CustomerProfile[] = [];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>(initialCustomersList);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: 'Gaborone, Botswana',
    category: 'SMB' as const,
    notes: ''
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCustomer = () => {
    if (!newCust.name || !newCust.email) return;

    const created: CustomerProfile = {
      id: `cust-${Date.now()}`,
      name: newCust.name,
      company: newCust.company || 'Independent',
      email: newCust.email,
      phone: newCust.phone || '+267 70000000',
      address: newCust.address,
      category: newCust.category,
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      notes: newCust.notes || 'New customer ingested into Ralion Business',
      timeline: [
        { action: 'Created account', date: 'Today', details: 'Account created via Customers Module' }
      ]
    };

    setCustomers(prev => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewCust({ name: '', company: '', email: '', phone: '', address: 'Gaborone, Botswana', category: 'SMB', notes: '' });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Customers Management</h1>
            <Badge variant="primary">Ralion Core</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Empowered to Prosper — Manage customer accounts, directory search, and interaction timelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name, company..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Customer Directory ({filteredCustomers.length})</CardTitle>
          <CardDescription>Click any row to open the full customer profile timeline</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {cust.name.charAt(0)}
                      </div>
                      {cust.name}
                    </td>
                    <td className="p-4 text-zinc-300 font-medium">{cust.company}</td>
                    <td className="p-4 text-zinc-400 font-mono">
                      {cust.email} <br /><span className="text-[10px] text-zinc-500">{cust.phone}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={cust.category === 'ENTERPRISE' ? 'purple' : 'primary'}>
                        {cust.category}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-zinc-400">{cust.createdDate}</td>
                    <td className="p-4 text-right">
                      <button className="text-blue-400 hover:text-white text-xs font-semibold flex items-center gap-1 ml-auto">
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Profile Slide-Over Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {selectedCustomer.name}
                <Badge variant="purple">{selectedCustomer.category}</Badge>
              </h2>
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-zinc-500" /> {selectedCustomer.company}
              </p>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
            {/* Contact Specs Card */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-2.5 text-xs">
              <span className="text-zinc-400">Email: <strong className="text-white font-mono">{selectedCustomer.email}</strong></span>
              <span className="text-zinc-400">Phone: <strong className="text-white font-mono">{selectedCustomer.phone}</strong></span>
              <span className="text-zinc-400">Address: <strong className="text-white">{selectedCustomer.address}</strong></span>
              <span className="text-zinc-400 border-t border-zinc-800/80 pt-2 mt-1">Notes: <em className="text-zinc-200">{selectedCustomer.notes}</em></span>
            </div>

            {/* Timeline View */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Customer Timeline History
              </h3>

              <div className="flex flex-col gap-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {selectedCustomer.timeline.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 pl-7 relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute left-2 top-1.5 ring-4 ring-zinc-950" />
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-0.5 text-xs w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{event.action}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{event.date}</span>
                      </div>
                      <p className="text-zinc-300 text-[11px] mt-0.5">{event.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>Close</Button>
            <Button variant="primary" size="sm">
              <Mail className="w-3.5 h-3.5" /> Send Message
            </Button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Customer Profile">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Customer Full Name</label>
            <input
              type="text"
              value={newCust.name}
              onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
              placeholder="e.g. John Smith"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Company Name</label>
            <input
              type="text"
              value={newCust.company}
              onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
              placeholder="e.g. Smith & Co"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Email Address</label>
              <input
                type="email"
                value={newCust.email}
                onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                placeholder="john@smithco.com"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300">Phone</label>
              <input
                type="text"
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                placeholder="+267 70000000"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Notes</label>
            <textarea
              rows={2}
              value={newCust.notes}
              onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
              placeholder="Initial customer notes..."
              className="w-full mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddCustomer}>Save Customer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
