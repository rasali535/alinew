'use client';

import React, { useRef } from 'react';
import {
  X,
  Printer,
  Truck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  UserCheck,
} from 'lucide-react';
import { RetailStockTransfer } from '@ralion/database';

interface TransferDocumentationModalProps {
  transfer: RetailStockTransfer | null;
  storeName?: string;
  onClose: () => void;
}

export const TransferDocumentationModal: React.FC<TransferDocumentationModalProps> = ({
  transfer,
  storeName = 'Frosthub Hardware & Retail',
  onClose,
}) => {
  const [printFormat, setPrintFormat] = React.useState<'A4' | '80MM'>('A4');
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!transfer) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = transfer.dispatchedAt
    ? new Date(transfer.dispatchedAt).toLocaleString('en-GB', {
        timeZone: 'Africa/Gaborone',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date(transfer.createdAt).toLocaleString('en-GB', {
        timeZone: 'Africa/Gaborone',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        {/* Header (Non-printable) */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Stock Transfer & Delivery Manifest</h2>
              <p className="text-xs text-zinc-400">Transfer Ref: {transfer.transferNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`rounded px-3 py-1 font-medium transition ${
                  printFormat === 'A4' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                A4 Manifest
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('80MM')}
                className={`rounded px-3 py-1 font-medium transition ${
                  printFormat === '80MM' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                80mm Slip
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6" ref={printAreaRef}>
          {printFormat === 'A4' ? (
            <div className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-white p-8 text-black shadow-md printable-a4">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b pb-6">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900">{storeName}</h1>
                  <p className="text-sm font-semibold text-zinc-600">INTERNAL STOCK TRANSFER MANIFEST</p>
                  <p className="text-xs text-zinc-500">Official goods-in-transit delivery document</p>
                </div>
                <div className="text-right">
                  <div className="inline-block rounded border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-800">
                    Status: {transfer.status}
                  </div>
                  <p className="mt-2 text-sm font-bold text-zinc-900">№ {transfer.transferNumber}</p>
                  <p className="text-xs text-zinc-500">Dispatched: {formattedDate}</p>
                </div>
              </div>

              {/* Location Route */}
              <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Source Dispatch Site</p>
                  <p className="text-base font-bold text-zinc-900">{transfer.sourceLocationName || 'Central Warehouse'}</p>
                  <p className="text-xs text-zinc-600">Dispatched By: {transfer.dispatchedByName || 'Warehouse Dispatcher'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Destination Site</p>
                  <p className="text-base font-bold text-zinc-900">{transfer.destinationLocationName || 'Retail Branch'}</p>
                  <p className="text-xs text-zinc-600">
                    Receiver: {transfer.receivedByName ? transfer.receivedByName : 'Pending Arrival'}
                  </p>
                </div>
              </div>

              {/* Logistics Details */}
              <div className="mt-4 grid grid-cols-3 gap-4 border-b pb-4 text-xs text-zinc-700">
                <div>
                  <span className="font-semibold text-zinc-500">Carrier / Driver: </span>
                  <span className="font-medium text-zinc-900">{transfer.carrierName || 'Internal Logistics'}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-500">Vehicle Reg: </span>
                  <span className="font-medium text-zinc-900">{transfer.vehicleRegistration || 'Company Fleet'}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-500">Tracking Code: </span>
                  <span className="font-medium text-zinc-900">{transfer.trackingNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-zinc-300 text-zinc-600">
                      <th className="py-2">Item / SKU</th>
                      <th className="py-2">Pack</th>
                      <th className="py-2 text-right">Dispatched</th>
                      <th className="py-2 text-right">Received</th>
                      <th className="py-2 text-right">Damaged</th>
                      <th className="py-2 text-right">Shortage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-800">
                    {transfer.items && transfer.items.length > 0 ? (
                      transfer.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-2.5">
                            <p className="font-bold text-zinc-900">{it.productName || 'Product'}</p>
                            <p className="text-[11px] text-zinc-500">{it.sku}</p>
                          </td>
                          <td className="py-2.5 text-zinc-600">
                            {it.packLabel ? `${it.packLabel} (x${it.packSize})` : 'Each'}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-zinc-900">
                            {it.quantityDispatched} {it.packLabel || 'units'}
                            <span className="block text-[10px] text-zinc-500 font-normal">
                              ({it.baseQuantityDispatched} base)
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-emerald-800">
                            {it.quantityReceived || 0}
                            <span className="block text-[10px] text-zinc-500 font-normal">
                              ({it.baseQuantityReceived || 0} base)
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-rose-700">
                            {it.quantityDamaged > 0 ? it.quantityDamaged : '—'}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-amber-700">
                            {it.quantityShortage > 0 ? it.quantityShortage : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-zinc-500">
                          No line items listed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="mt-6 flex justify-end border-t pt-4">
                <div className="w-64 space-y-1 text-xs text-zinc-700">
                  <div className="flex justify-between">
                    <span>Total Dispatched Units:</span>
                    <span className="font-bold text-zinc-900">{transfer.totalUnitsDispatched} base units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Received (Sellable):</span>
                    <span className="font-bold text-emerald-800">{transfer.totalUnitsReceived || 0} base units</span>
                  </div>
                  {transfer.totalUnitsDamaged > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Damaged (Quarantine):</span>
                      <span className="font-bold">{transfer.totalUnitsDamaged} units</span>
                    </div>
                  )}
                  {transfer.totalUnitsShortage > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Transit Shortage:</span>
                      <span className="font-bold">{transfer.totalUnitsShortage} units</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures & Custody Verification */}
              <div className="mt-12 grid grid-cols-2 gap-8 border-t pt-6 text-xs text-zinc-700">
                <div>
                  <p className="font-bold uppercase text-zinc-600">Dispatched & Certified By</p>
                  <div className="mt-8 border-b border-zinc-400"></div>
                  <p className="mt-1 text-[11px] text-zinc-500">Warehouse Officer / Dispatch Signature</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-zinc-600">Received & Inspected By</p>
                  <div className="mt-8 border-b border-zinc-400"></div>
                  <p className="mt-1 text-[11px] text-zinc-500">Destination Branch Receiver Signature</p>
                </div>
              </div>

              <div className="mt-6 text-center text-[10px] text-zinc-400">
                Ralion Retail Multi-Branch Distribution • Immutable Stock Movement Audit № {transfer.transferNumber}
              </div>
            </div>
          ) : (
            /* 80mm Thermal Slip */
            <div className="mx-auto w-[80mm] rounded border border-zinc-300 bg-white p-4 font-mono text-xs text-black shadow-md printable-80mm">
              <div className="text-center">
                <h1 className="text-sm font-bold uppercase">{storeName}</h1>
                <p className="text-[10px]">STOCK TRANSFER SLIP</p>
                <p className="text-[10px]">№ {transfer.transferNumber}</p>
                <p className="text-[10px]">{formattedDate}</p>
              </div>

              <div className="my-2 border-b border-dashed border-zinc-400"></div>

              <div className="space-y-1 text-[10px]">
                <p><strong>FROM:</strong> {transfer.sourceLocationName || 'Warehouse'}</p>
                <p><strong>TO:</strong> {transfer.destinationLocationName || 'Branch'}</p>
                <p><strong>STATUS:</strong> {transfer.status}</p>
                <p><strong>DISPATCHER:</strong> {transfer.dispatchedByName || 'N/A'}</p>
              </div>

              <div className="my-2 border-b border-dashed border-zinc-400"></div>

              <div className="space-y-2 text-[10px]">
                {(transfer.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <p className="font-semibold">{it.productName || 'Item'}</p>
                      <p className="text-[9px] text-zinc-600">{it.sku}</p>
                    </div>
                    <div className="text-right">
                      <p>{it.quantityDispatched} disp</p>
                      <p className="text-[9px]">({it.baseQuantityDispatched} base)</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-2 border-b border-dashed border-zinc-400"></div>

              <div className="text-right text-[10px]">
                <p><strong>TOTAL UNITS:</strong> {transfer.totalUnitsDispatched}</p>
                {transfer.totalUnitsDamaged > 0 && (
                  <p className="text-rose-600"><strong>DAMAGED:</strong> {transfer.totalUnitsDamaged}</p>
                )}
              </div>

              <div className="mt-6 text-center text-[9px] text-zinc-500">
                <p>Driver Sign: _________________</p>
                <p className="mt-3">Branch Receiver: _________________</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-a4,
          .printable-a4 *,
          .printable-80mm,
          .printable-80mm * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .printable-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .printable-80mm {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};
