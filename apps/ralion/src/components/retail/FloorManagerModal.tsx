'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Ban,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Package,
  DollarSign,
  User,
  Clock,
  Printer,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import { formatBotswanaTime, formatCurrencyUSD } from './RetailReceipt';

interface FloorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnCompleted: (returnRecord: any) => void;
  onVoidCompleted?: (voidedSale: any) => void;
}

export const FloorManagerModal: React.FC<FloorManagerModalProps> = ({
  isOpen,
  onClose,
  onReturnCompleted,
  onVoidCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'RETURN' | 'VOID'>('RETURN');
  const [lookupQuery, setLookupQuery] = useState('');
  const [loadingSale, setLoadingSale] = useState(false);
  const [sale, setSale] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Return form state
  const [selectedItems, setSelectedItems] = useState<{
    [itemId: string]: {
      selected: boolean;
      returnQty: number;
      condition: 'SELLABLE' | 'DAMAGED';
    };
  }>({});
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CARD_EXTERNAL' | 'BANK_TRANSFER'>('CASH');
  const [returnReason, setReturnReason] = useState('Customer returned goods');
  const [managerNotes, setManagerNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Void form state
  const [voidReason, setVoidReason] = useState('Transaction entered in error / Void requested');

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupQuery.trim()) return;

    try {
      setLoadingSale(true);
      setLookupError(null);
      setSale(null);
      setSelectedItems({});

      const res = await authFetch(`/api/retail/pos/sales/lookup?query=${encodeURIComponent(lookupQuery.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.sale) {
        setLookupError(data.error || 'Sale transaction not found. Verify receipt or sale number.');
        return;
      }

      setSale(data.sale);

      // Pre-initialize selectable items
      const initial: any = {};
      (data.sale.items || []).forEach((it: any) => {
        const remainingReturnable = Math.max(0, it.quantity - (it.returnedQuantity || it.returned_quantity || 0));
        initial[it.id] = {
          selected: false,
          returnQty: remainingReturnable > 0 ? 1 : 0,
          condition: 'SELLABLE',
        };
      });
      setSelectedItems(initial);
    } catch (err: any) {
      setLookupError(err.message || 'Error looking up original sale.');
    } finally {
      setLoadingSale(false);
    }
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected,
      },
    }));
  };

  const handleQuantityChange = (itemId: string, maxQty: number, val: number) => {
    const clamped = Math.max(1, Math.min(maxQty, val));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        returnQty: clamped,
      },
    }));
  };

  const handleConditionChange = (itemId: string, condition: 'SELLABLE' | 'DAMAGED') => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        condition,
      },
    }));
  };

  // Calculate return total
  const returnLinesToSubmit = (sale?.items || [])
    .filter((it: any) => selectedItems[it.id]?.selected && selectedItems[it.id]?.returnQty > 0)
    .map((it: any) => {
      const state = selectedItems[it.id];
      const lineUnit = Number(it.unitPrice ?? it.unit_price ?? 0);
      return {
        saleItemId: it.id,
        productId: it.productId ?? it.product_id,
        productName: it.productName ?? it.product_name,
        quantity: state.returnQty,
        condition: state.condition,
        unitPrice: lineUnit,
        refundAmount: Math.round(state.returnQty * lineUnit * 100) / 100,
        packageId: it.packageId ?? it.package_id,
        packSize: it.packSize ?? it.pack_size ?? 1,
      };
    });

  const totalRefundToIssue = returnLinesToSubmit.reduce((sum: number, it: any) => sum + it.refundAmount, 0);

  const handleSubmitReturn = async () => {
    if (returnLinesToSubmit.length === 0) {
      setActionError('Select at least one product line item to return.');
      return;
    }

    try {
      setProcessingAction(true);
      setActionError(null);

      const idempotencyKey = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        saleId: sale.id,
        reason: returnReason,
        refundMethod,
        items: returnLinesToSubmit,
        notes: managerNotes,
        idempotencyKey,
      };

      const res = await authFetch('/api/retail/pos/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to process return & refund.');
        return;
      }

      onClose();
      onReturnCompleted(data.return);
    } catch (err: any) {
      setActionError(err.message || 'Network error processing return.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSubmitVoid = async () => {
    if (!sale) return;
    if (!voidReason.trim()) {
      setActionError('Floor manager reason is required to void a sale.');
      return;
    }

    try {
      setProcessingAction(true);
      setActionError(null);

      const idempotencyKey = `void_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        saleId: sale.id,
        reason: voidReason,
        idempotencyKey,
      };

      const res = await authFetch('/api/retail/pos/voids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to void transaction.');
        return;
      }

      onClose();
      if (onVoidCompleted) {
        onVoidCompleted(data.void);
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error voiding transaction.');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Floor Manager Authorization Control
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Manager Role Required
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Authorize customer product returns, tender refunds, or transaction voids.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('RETURN');
              setActionError(null);
            }}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'RETURN'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Product Return & Refund
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('VOID');
              setActionError(null);
            }}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'VOID'
                ? 'border-red-500 text-red-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Void Completed Sale
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Sale Lookup Form */}
          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Enter original receipt number (e.g. POS-123456) or Sale UUID..."
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSale}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              {loadingSale ? 'Searching...' : 'Locate Sale'}
            </button>
          </form>

          {lookupError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {sale && (
            <div className="space-y-4">
              {/* Sale Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-zinc-800/40 border border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Receipt / Sale No:</span>
                  <span className="font-mono font-bold text-zinc-100">{sale.saleNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Date (Botswana CAT):</span>
                  <span className="font-mono text-zinc-300">{formatBotswanaTime(sale.saleDate || sale.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Original Cashier:</span>
                  <span className="text-zinc-200 font-medium">{sale.cashierName || 'Cashier'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Total Sale:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrencyUSD(Number(sale.totalAmount))}
                  </span>
                </div>
              </div>

              {activeTab === 'RETURN' ? (
                <>
                  {/* Select Items to Return */}
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">
                      Select Sold Line Items to Return
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {(sale.items || []).map((it: any) => {
                        const remaining = Math.max(0, it.quantity - (it.returnedQuantity || it.returned_quantity || 0));
                        const state = selectedItems[it.id] || { selected: false, returnQty: 1, condition: 'SELLABLE' };
                        const isReturnable = remaining > 0;

                        return (
                          <div
                            key={it.id}
                            className={`p-3 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              state.selected
                                ? 'bg-emerald-950/30 border-emerald-500/40'
                                : 'bg-zinc-800/30 border-zinc-800'
                            } ${!isReturnable ? 'opacity-40' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={state.selected}
                                disabled={!isReturnable}
                                onChange={() => handleItemToggle(it.id)}
                                className="w-4 h-4 rounded border-zinc-700 text-emerald-600 focus:ring-0"
                              />
                              <div>
                                <div className="font-semibold text-zinc-200">{it.productName}</div>
                                <div className="text-[11px] text-zinc-400 font-mono">
                                  SKU: {it.sku} • Sold: {it.quantity} {it.packLabel ? `(${it.packLabel})` : ''} • Unit:{' '}
                                  {formatCurrencyUSD(Number(it.unitPrice))}
                                  {remaining < it.quantity && (
                                    <span className="text-amber-400 ml-2">
                                      ({it.quantity - remaining} already returned)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {state.selected && isReturnable && (
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {/* Quantity input */}
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[10px] text-zinc-400">Qty:</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={remaining}
                                    value={state.returnQty}
                                    onChange={(e) => handleQuantityChange(it.id, remaining, Number(e.target.value))}
                                    className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-center font-mono text-zinc-100"
                                  />
                                </div>

                                {/* Condition inspection */}
                                <select
                                  value={state.condition}
                                  onChange={(e) => handleConditionChange(it.id, e.target.value as any)}
                                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200"
                                >
                                  <option value="SELLABLE">Sellable (Restock)</option>
                                  <option value="DAMAGED">Damaged (Quarantine)</option>
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return details & refund config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                        Refund Payment Method:
                      </label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as any)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="CASH">Cash Refund (Drawer)</option>
                        <option value="CARD_EXTERNAL">Card Reversal (Terminal)</option>
                        <option value="BANK_TRANSFER">Bank Transfer / EFT</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                        Return Reason:
                      </label>
                      <input
                        type="text"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="e.g. Wrong screw diameter, surplus building pack..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  {actionError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                      {actionError}
                    </div>
                  )}

                  {/* Total & Action */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">Authoritative Refund Amount</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {formatCurrencyUSD(totalRefundToIssue)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitReturn}
                      disabled={processingAction || totalRefundToIssue <= 0}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {processingAction ? 'Processing Refund...' : 'Approve & Issue Refund'}
                    </button>
                  </div>
                </>
              ) : (
                /* Void Transaction Tab */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 text-xs text-red-300 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      Audited Financial Void Confirmation
                    </div>
                    <p>
                      Voiding reverses the entire sale, marks the transaction status as VOIDED, and restocks all sold
                      catalogue items. The record is permanently preserved with manager audit trail.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                      Manager Reason for Void: *
                    </label>
                    <input
                      type="text"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="e.g. Duplicate scan, cashier error, customer card declined after manual tender entry..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>

                  {actionError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                      {actionError}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSubmitVoid}
                      disabled={processingAction || !voidReason.trim()}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      {processingAction ? 'Voiding Transaction...' : 'Confirm Audited Void'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
