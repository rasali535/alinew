'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Send,
  Loader2,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { RetailLocation, StockRequestPriority } from '@ralion/database';
import { authFetch } from '@/lib/api-config';

interface NewStockRequestModalProps {
  locations: RetailLocation[];
  products: Array<{ id: string; name: string; sku: string; packages?: any[] }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewStockRequestModal: React.FC<NewStockRequestModalProps> = ({
  locations,
  products,
  onClose,
  onSuccess,
}) => {
  const warehouses = locations.filter((l) => l.locationType === 'WAREHOUSE');
  const branches = locations.filter((l) => l.locationType === 'RETAIL_BRANCH');

  const [sourceLocationId, setSourceLocationId] = useState(warehouses[0]?.id || locations[0]?.id || '');
  const [destinationLocationId, setDestinationLocationId] = useState(branches[0]?.id || locations[1]?.id || '');
  const [priority, setPriority] = useState<StockRequestPriority>('NORMAL');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      productId: string;
      packageId?: string;
      packSize: number;
      packLabel?: string;
      quantityRequested: number;
    }>
  >([
    {
      productId: products[0]?.id || '',
      packSize: 1,
      quantityRequested: 10,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        packSize: 1,
        quantityRequested: 10,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          const prod = products.find((p) => p.id === value);
          const pkg = prod?.packages?.[0];
          return {
            ...item,
            productId: value,
            packageId: pkg?.id || undefined,
            packSize: pkg ? Number(pkg.baseUnitsPerPack) : 1,
            packLabel: pkg?.label || undefined,
          };
        }
        if (field === 'packageId') {
          const prod = products.find((p) => p.id === item.productId);
          const pkg = prod?.packages?.find((p: any) => p.id === value);
          return {
            ...item,
            packageId: value || undefined,
            packSize: pkg ? Number(pkg.baseUnitsPerPack) : 1,
            packLabel: pkg?.label || undefined,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceLocationId || !destinationLocationId) {
      setError('Please select both source warehouse and destination branch.');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setError('Source and destination cannot be the same location.');
      return;
    }
    if (items.length === 0) {
      setError('At least one product item is required.');
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch('/api/retail/transfers/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLocationId,
          destinationLocationId,
          priority,
          requiredDate: requiredDate || undefined,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            productId: it.productId,
            packageId: it.packageId,
            packSize: it.packSize,
            packLabel: it.packLabel,
            quantityRequested: Number(it.quantityRequested),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit stock request.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error submitting request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">New Stock Replenishment Request</h2>
              <p className="text-xs text-zinc-400">Request inventory from warehouse to your branch</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">Source Warehouse</label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.locationType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300">Destination Branch</label>
                <select
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.locationType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as StockRequestPriority)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300">Required Date (Optional)</label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Requested Items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Requested Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-blue-400 hover:bg-zinc-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Line
                </button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => {
                  const prod = products.find((p) => p.id === it.productId);
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="flex-1">
                        <select
                          value={it.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      {prod?.packages && prod.packages.length > 0 && (
                        <div className="w-40">
                          <select
                            value={it.packageId || ''}
                            onChange={(e) => handleItemChange(idx, 'packageId', e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Base Unit (x1)</option>
                            {prod.packages.map((pkg: any) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.label} (x{pkg.baseUnitsPerPack})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="w-24">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={it.quantityRequested}
                          onChange={(e) => handleItemChange(idx, 'quantityRequested', parseFloat(e.target.value) || 1)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none text-right"
                          placeholder="Qty"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300">Notes / Replenishment Reason</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Weekend peak rush stock replenishment for plumbing fixtures."
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/80 bg-zinc-900/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
