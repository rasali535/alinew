'use client';

import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { RetailSale, RetailReturn, RetailCashupReport } from '@ralion/database';

export function formatBotswanaTime(isoDate: string | Date | undefined): string {
  if (!isoDate) return '—';
  const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (isNaN(d.getTime())) return '—';
  try {
    return (
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Gaborone',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d) + ' CAT'
    );
  } catch {
    return d.toLocaleString() + ' (CAT)';
  }
}

export function formatCurrencyUSD(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val || 0);
}

interface RetailReceiptModalProps {
  sale?: RetailSale | null;
  returnRecord?: RetailReturn | null;
  cashupReport?: RetailCashupReport | null;
  storeName?: string;
  storeBranch?: string;
  onClose: () => void;
}

export const RetailReceiptModal: React.FC<RetailReceiptModalProps> = ({
  sale,
  returnRecord,
  cashupReport,
  storeName = 'Frosthub Hardware & Building Supplies',
  storeBranch = 'Gaborone West Industrial, Botswana',
  onClose,
}) => {
  const [format, setFormat] = useState<'80mm' | 'a4'>('80mm');

  const handlePrint = () => {
    window.print();
  };

  const isSale = Boolean(sale);
  const isReturn = Boolean(returnRecord);
  const isCashup = Boolean(cashupReport);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Print-specific style tag injecting isolated print boundaries */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #retail-print-target,
          #retail-print-target * {
            visibility: visible !important;
          }
          #retail-print-target {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${format === '80mm' ? '76mm' : '100%'} !important;
            max-width: ${format === '80mm' ? '76mm' : '100%'} !important;
            margin: 0 !important;
            padding: ${format === '80mm' ? '2mm' : '10mm'} !important;
            background: white !important;
            color: black !important;
            font-family: monospace, monospace !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: ${format === '80mm' ? '80mm auto' : 'A4 portrait'};
            margin: ${format === '80mm' ? '2mm' : '10mm'};
          }
        }
      `}</style>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {isSale ? 'Sales Tax Receipt' : isReturn ? 'Goods Return & Refund Slip' : 'Cashier Cash-Up Report'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isSale
                  ? `Sale #${sale?.saleNumber}`
                  : isReturn
                  ? `Return #${returnRecord?.returnNumber} (Original Sale #${returnRecord?.receiptNumber})`
                  : `Shift Reconciled for ${cashupReport?.cashierName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="bg-zinc-800 rounded-xl p-1 flex text-xs font-medium">
              <button
                onClick={() => setFormat('80mm')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  format === '80mm'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setFormat('a4')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  format === 'a4'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                A4 Document
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body Container */}
        <div className="flex-1 overflow-y-auto py-4 flex justify-center">
          <div
            id="retail-print-target"
            className={`bg-white text-zinc-900 shadow-md font-mono transition-all ${
              format === '80mm'
                ? 'w-[320px] p-4 text-[11px] leading-tight rounded-xl'
                : 'w-full max-w-xl p-8 text-xs leading-relaxed rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-zinc-400 space-y-1">
              <div className="font-bold text-sm uppercase tracking-wide">{storeName}</div>
              <div className="text-[10px] text-zinc-600">{storeBranch}</div>
              <div className="text-[10px] text-zinc-600 font-semibold pt-1">
                {isSale ? '*** OFFICIAL SALES RECEIPT ***' : isReturn ? '*** GOODS RETURN & REFUND VOUCHER ***' : '*** CASHIER SHIFT CASH-UP REPORT ***'}
              </div>
            </div>

            {/* SALE RECEIPT BODY */}
            {isSale && sale && (
              <div className="space-y-3 pt-3">
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Receipt #:</span>
                    <span className="font-bold">{sale.saleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Date/Time:</span>
                    <span>{formatBotswanaTime(sale.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Cashier:</span>
                    <span className="font-semibold">{sale.cashierName || 'Cashier'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Terminal:</span>
                    <span>DEFAULT_POS_TERMINAL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Customer:</span>
                    <span className="font-medium truncate max-w-[180px]">{sale.customerName || 'Walk-in Customer'}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 border-b border-dashed border-zinc-300 pb-3">
                  <div className="font-bold text-[10px] uppercase flex justify-between border-b border-zinc-200 pb-1">
                    <span>Description & Qty</span>
                    <span>Total (USD)</span>
                  </div>
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold break-words max-w-[200px]">
                            {it.productName || 'Hardware Product'}
                          </span>
                          <span className="font-bold">{formatCurrencyUSD(it.lineTotal)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-600">
                          <span>
                            {it.quantity} {it.packLabel ? `× ${it.packLabel} (${it.packSize} ea)` : 'units'} @ {formatCurrencyUSD(it.unitPrice)}
                          </span>
                          {it.discountRate > 0 && <span className="text-emerald-700">-{it.discountRate}%</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-zinc-500 text-[10px]">Standard transaction lines</div>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-xs border-b border-dashed border-zinc-400 pb-3">
                  <div className="flex justify-between text-[11px]">
                    <span>Subtotal:</span>
                    <span>{formatCurrencyUSD(sale.subtotal)}</span>
                  </div>
                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-700">
                      <span>Total Discounts:</span>
                      <span>-{formatCurrencyUSD(sale.discountTotal)}</span>
                    </div>
                  )}
                  {sale.taxTotal > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span>VAT / Tax:</span>
                      <span>{formatCurrencyUSD(sale.taxTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-zinc-300 pt-1">
                    <span>TOTAL AMOUNT:</span>
                    <span>{formatCurrencyUSD(sale.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600 pt-0.5">
                    <span>Paid via {sale.paymentMethod}:</span>
                    <span>{formatCurrencyUSD(sale.totalAmount)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[9px] text-zinc-500 space-y-1 pt-1">
                  <div>Tax Compliance Notice: Valid transaction record.</div>
                  <div>Returns accepted within 7 days with original receipt.</div>
                  <div className="font-semibold">Thank you for shopping with Frosthub!</div>
                </div>
              </div>
            )}

            {/* RETURN VOUCHER BODY */}
            {isReturn && returnRecord && (
              <div className="space-y-3 pt-3">
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Return Voucher #:</span>
                    <span className="font-bold text-rose-700">{returnRecord.returnNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Original Sale #:</span>
                    <span className="font-semibold">{returnRecord.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Date/Time:</span>
                    <span>{formatBotswanaTime(returnRecord.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Approved By (Floor Mgr):</span>
                    <span className="font-bold">{returnRecord.approvedByName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Cashier:</span>
                    <span>{returnRecord.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Reason:</span>
                    <span className="italic">{returnRecord.reason}</span>
                  </div>
                </div>

                {/* Returned Items */}
                <div className="space-y-1.5 border-b border-dashed border-zinc-300 pb-3">
                  <div className="font-bold text-[10px] uppercase flex justify-between border-b border-zinc-200 pb-1">
                    <span>Returned Item & Condition</span>
                    <span>Refund (USD)</span>
                  </div>
                  {returnRecord.items?.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold">{it.productName}</span>
                        <span className="font-bold text-rose-700">-{formatCurrencyUSD(it.refundLineTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>Qty: {it.quantityReturned} {it.packLabel || 'units'}</span>
                        <span className={`px-1 rounded text-[9px] font-bold ${
                          it.condition === 'SELLABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {it.condition} {it.restocked ? '(Restocked)' : '(Quarantined)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-sm font-bold border-b border-dashed border-zinc-400 pb-2">
                  <span>TOTAL REFUNDED:</span>
                  <span className="text-rose-700 font-mono">-{formatCurrencyUSD(returnRecord.totalRefundAmount)}</span>
                </div>
                <div className="text-[10px] text-zinc-600 flex justify-between">
                  <span>Tender Refunded:</span>
                  <span className="font-semibold">{returnRecord.refundPaymentMethod}</span>
                </div>
              </div>
            )}

            {/* CASH-UP REPORT BODY */}
            {isCashup && cashupReport && (
              <div className="space-y-3 pt-3">
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Cashier:</span>
                    <span className="font-bold">{cashupReport.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Terminal:</span>
                    <span>{cashupReport.terminalId || 'DEFAULT_POS_TERMINAL'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Shift Started:</span>
                    <span>{formatBotswanaTime(cashupReport.startedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Shift Closed:</span>
                    <span>{formatBotswanaTime(cashupReport.closedAt)}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="font-bold text-[10px] uppercase text-zinc-700 pb-0.5">Sales Register</div>
                  <div className="flex justify-between">
                    <span>Opening Cash Float:</span>
                    <span className="font-bold">{formatCurrencyUSD(cashupReport.openingFloat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Sales ({cashupReport.salesCount} txns):</span>
                    <span>{formatCurrencyUSD(cashupReport.grossSales)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Discounts:</span>
                    <span>-{formatCurrencyUSD(cashupReport.discountTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-zinc-200 pt-0.5">
                    <span>Net Sales:</span>
                    <span>{formatCurrencyUSD(cashupReport.netSales)}</span>
                  </div>
                </div>

                {/* Tender Breakdown */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="font-bold text-[10px] uppercase text-zinc-700 pb-0.5">Tender Breakdown</div>
                  <div className="flex justify-between">
                    <span>Cash Sales:</span>
                    <span className="font-bold">{formatCurrencyUSD(cashupReport.cashSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card / Electronic:</span>
                    <span>{formatCurrencyUSD(cashupReport.cardSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Transfers:</span>
                    <span>{formatCurrencyUSD(cashupReport.transferSales)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Cash Refunds ({cashupReport.refundCount} items):</span>
                    <span>-{formatCurrencyUSD(cashupReport.cashRefunds)}</span>
                  </div>
                  {cashupReport.voidCount > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Voided Sales ({cashupReport.voidCount}):</span>
                      <span>{formatCurrencyUSD(cashupReport.voidTotal)}</span>
                    </div>
                  )}
                </div>

                {/* Cash Drawer Reconciliation */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-400 pb-2">
                  <div className="font-bold text-[10px] uppercase text-zinc-700 pb-0.5">Cash Drawer Balance</div>
                  <div className="text-[10px] text-zinc-500 italic pb-0.5">
                    Formula: Float ({formatCurrencyUSD(cashupReport.openingFloat)}) + Cash Sales ({formatCurrencyUSD(cashupReport.cashSales)}) - Cash Refunds ({formatCurrencyUSD(cashupReport.cashRefunds)})
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Expected Drawer Cash:</span>
                    <span>{formatCurrencyUSD(cashupReport.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Actual Counted Cash:</span>
                    <span>{formatCurrencyUSD(cashupReport.closingCashActual)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-bold pt-1 border-t border-zinc-300 ${
                    cashupReport.variance === 0
                      ? 'text-emerald-700'
                      : cashupReport.variance > 0
                      ? 'text-cyan-700'
                      : 'text-rose-700'
                  }`}>
                    <span>
                      {cashupReport.variance === 0
                        ? 'BALANCED (Zero Variance)'
                        : cashupReport.variance > 0
                        ? 'CASH OVERAGE (+)'
                        : 'CASH SHORTAGE (-)'}
                    </span>
                    <span>{formatCurrencyUSD(cashupReport.variance)}</span>
                  </div>
                </div>

                <div className="pt-2 text-[9px] text-zinc-500 text-center">
                  Immutable Shift Cash-Up Record • Verified against source ledger
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between no-print">
          <div className="text-xs text-zinc-400">
            Clicking print will output only the selected document in {format === '80mm' ? '80mm thermal' : 'A4 standard'} format.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {format === '80mm' ? '80mm Thermal' : 'A4 Document'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
