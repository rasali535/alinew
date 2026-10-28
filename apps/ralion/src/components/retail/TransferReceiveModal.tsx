'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  ShieldAlert,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { RetailStockTransfer } from '@ralion/database';
import { authFetch } from '@/lib/api-config';

interface TransferReceiveModalProps {
  transfer: RetailStockTransfer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferReceiveModal: React.FC<TransferReceiveModalProps> = ({
  transfer,
  onClose,
  onSuccess,
}) => {
  const [lines, setLines] = useState<
    Array<{
      itemId: string;
      productName: string;
      sku: string;
      packLabel?: string;
      packSize: number;
      quantityDispatched: number;
      baseQuantityDispatched: number;
      quantityReceived: number;
      quantityDamaged: number;
    }>
  >(() => {
    if (!transfer?.items) return [];
    return transfer.items.map((it) => ({
      itemId: it.id,
      productName: it.productName || 'Product',
      sku: it.sku || '',
      packLabel: it.packLabel || undefined,
      packSize: it.packSize || 1,
      quantityDispatched: it.quantityDispatched,
      baseQuantityDispatched: it.baseQuantityDispatched,
      quantityReceived: it.quantityDispatched, // default to receiving full count
      quantityDamaged: 0,
    }));
  });

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transfer) return null;

  const handleQtyChange = (itemId: string, field: 'quantityReceived' | 'quantityDamaged', val: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.itemId !== itemId) return l;
        const updatedVal = Math.max(0, val);
        return { ...l, [field]: updatedVal };
      })
    );
  };

  const handleReceiveAllGood = () => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantityReceived: l.quantityDispatched,
        quantityDamaged: 0,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: no over-delivery
    for (const l of lines) {
      const totalEntered = l.quantityReceived + l.quantityDamaged;
      if (totalEntered > l.quantityDispatched) {
        setError(
          `Over-delivery rejected on '${l.productName}': Received (${l.quantityReceived}) + Damaged (${l.quantityDamaged}) exceeds dispatched count (${l.quantityDispatched}).`
        );
        return;
      }
    }

    try {
      setLoading(true);
      const res = await authFetch(`/api/retail/transfers/${transfer.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptLines: lines.map((l) => ({
            itemId: l.itemId,
            quantityReceived: l.quantityReceived,
            quantityDamaged: l.quantityDamaged,
          })),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to post receiving confirmation.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error occurred while posting receipt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Confirm Branch Receipt</h2>
              <p className="text-xs text-zinc-400">
                Transfer № {transfer.transferNumber} • Source: {transfer.sourceLocationName || 'Central Warehouse'}
              </p>
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                <p>{error}</p>
              </div>
            )}

            {/* Invariant Alert */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-200">
              <p className="font-semibold text-blue-100">Physical Inspection Invariant:</p>
              <p className="mt-1 text-blue-300/90">
                • <strong>Sellable Received units</strong> increase available inventory at this branch.
                <br />
                • <strong>Damaged units</strong> are automatically routed to the quarantine write-off bucket and will <strong>never</strong> be added to sellable cashier POS stock.
                <br />
                • <strong>Shortages</strong> are logged to the discrepancy audit ledger. Over-deliveries are rejected.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">Manifest Line Verification</h3>
              <button
                type="button"
                onClick={handleReceiveAllGood}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                Reset All to Dispatched Quantity
              </button>
            </div>

            {/* Lines List */}
            <div className="space-y-4">
              {lines.map((l) => {
                const totalIn = l.quantityReceived + l.quantityDamaged;
                const shortage = Math.max(0, l.quantityDispatched - totalIn);
                const isOver = totalIn > l.quantityDispatched;

                return (
                  <div
                    key={l.itemId}
                    className={`rounded-xl border p-4 transition ${
                      isOver
                        ? 'border-rose-500/50 bg-rose-950/20'
                        : l.quantityDamaged > 0 || shortage > 0
                        ? 'border-amber-500/30 bg-amber-950/10'
                        : 'border-zinc-800 bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-zinc-100">{l.productName}</h4>
                        <p className="text-xs text-zinc-400">
                          SKU: {l.sku} • Pack: {l.packLabel ? `${l.packLabel} (x${l.packSize})` : 'Each'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-300">
                          Dispatched: <strong>{l.quantityDispatched}</strong> {l.packLabel || 'units'} ({l.baseQuantityDispatched} base)
                        </p>
                      </div>

                      {shortage > 0 && (
                        <span className="rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300">
                          Shortage: {shortage}
                        </span>
                      )}
                      {l.quantityDamaged > 0 && (
                        <span className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300">
                          Damaged: {l.quantityDamaged}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800/80 pt-3">
                      <div>
                        <label className="block text-xs font-medium text-emerald-400">
                          Sellable Good Count (POS Stock)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={l.quantityReceived}
                          onChange={(e) => handleQtyChange(l.itemId, 'quantityReceived', parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-rose-400">
                          Damaged In-Transit (Quarantine)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={l.quantityDamaged}
                          onChange={(e) => handleQtyChange(l.itemId, 'quantityDamaged', parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-300">Inspection & Delivery Notes (Optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Driver arrived on time; 2 bags punctured in transit."
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
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
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Post Destination Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
