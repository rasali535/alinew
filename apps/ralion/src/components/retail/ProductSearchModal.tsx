'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { NormalizedProduct, formatPrice } from '@/lib/retail/adapters';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: NormalizedProduct[];
  initialQuery?: string;
  onSelectProduct: (product: NormalizedProduct, packageId?: string) => void;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  onClose,
  products,
  initialQuery = '',
  onSelectProduct,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Extract unique departments & brands
  const departments = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const d = p.department || p.category;
      if (d) set.add(d);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [products]);

  // Flattens products and their packages into selectable rows
  interface SearchRow {
    rowKey: string;
    product: NormalizedProduct;
    packageId?: string;
    packLabel?: string;
    baseUnitsPerPack?: number;
    sellingPrice: number;
    displaySku: string;
    availableStock: number;
    inStock: boolean;
  }

  const flattenedRows: SearchRow[] = useMemo(() => {
    const rows: SearchRow[] = [];
    const q = query.trim().toLowerCase();

    for (const p of products) {
      const dept = p.department || p.category || '';
      if (selectedDept !== 'ALL' && dept !== selectedDept) continue;
      if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) continue;

      const pStock = p.currentStock ?? 0;
      const pName = (p.name || '').toLowerCase();
      const pSku = (p.sku || '').toLowerCase();
      const pBarcode = (p.barcode || '').toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pSub = (p.subcategory || '').toLowerCase();

      // Check if product packages exist
      const packs = p.packs && p.packs.length > 0 ? p.packs : [];

      // Base product match check
      const baseMatch =
        q === '' ||
        pName.includes(q) ||
        pSku.includes(q) ||
        pBarcode.includes(q) ||
        pBrand.includes(q) ||
        pDesc.includes(q) ||
        pSub.includes(q);

      // Add base product row
      if (baseMatch || packs.length === 0) {
        rows.push({
          rowKey: `${p.id}-base`,
          product: p,
          sellingPrice: p.sellingPrice,
          displaySku: p.sku,
          availableStock: pStock,
          inStock: pStock > 0,
        });
      }

      // Add package rows if available (carton, box, pack variants)
      for (const pk of packs) {
        const pkLabel = (pk.label || '').toLowerCase();
        const pkBarcode = (pk.barcode || '').toLowerCase();
        const packMatch =
          q === '' ||
          baseMatch ||
          pkLabel.includes(q) ||
          pkBarcode.includes(q);

        if (packMatch) {
          const packUnits = pk.baseUnitsPerPack || 1;
          const packStock = Math.floor(pStock / packUnits);
          const packPrice =
            pk.sellingPrice !== undefined && pk.sellingPrice !== null
              ? pk.sellingPrice
              : Math.round(p.sellingPrice * packUnits * 100) / 100;

          rows.push({
            rowKey: `${p.id}-pack-${pk.id}`,
            product: p,
            packageId: pk.id,
            packLabel: pk.label,
            baseUnitsPerPack: packUnits,
            sellingPrice: packPrice,
            displaySku: pk.barcode || `${p.sku}-PK`,
            availableStock: packStock,
            inStock: packStock > 0,
          });
        }
      }
    }

    return rows;
  }, [products, query, selectedDept, selectedBrand]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= flattenedRows.length) {
      setSelectedIndex(Math.max(0, flattenedRows.length - 1));
    }
  }, [flattenedRows.length, selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flattenedRows.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flattenedRows[selectedIndex];
      if (selected && selected.inStock) {
        onSelectProduct(selected.product, selected.packageId);
      }
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full h-[85vh] max-h-[800px] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header with Search Input */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/90 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-emerald-400 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search by product name, SKU, barcode, brand, screw size, or packaging..."
                className="w-full bg-zinc-800/90 border border-zinc-700/80 rounded-2xl pl-11 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 border border-zinc-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Chips inside popup */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-zinc-400" /> Filter:
            </span>

            {/* Department chips (up to 6) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {departments.slice(0, 6).map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors ${
                    selectedDept === dept
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Brand chips if available */}
            {brands.length > 2 && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 border-l border-zinc-800 pl-2">
                {brands.slice(0, 4).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBrand(b)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedBrand === b
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                    }`}
                  >
                    {b === 'ALL' ? 'All Brands' : b}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Results List */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-zinc-800/50"
        >
          {flattenedRows.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-500">
              <Search className="w-12 h-12 text-zinc-600 mb-3 stroke-[1.5]" />
              <div className="text-sm font-medium text-zinc-300">No matching catalogue items found</div>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Try searching for screws, bolts, cement, paint, pipes, or clear active filters.
              </p>
            </div>
          ) : (
            flattenedRows.map((row, idx) => {
              const isSelected = idx === selectedIndex;
              const isPack = Boolean(row.packageId);

              return (
                <div
                  key={row.rowKey}
                  onClick={() => {
                    if (row.inStock) {
                      onSelectProduct(row.product, row.packageId);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`pt-2 pb-2 px-3 sm:px-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border border-emerald-500/50 shadow-md'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  } ${!row.inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Left: Product & Variant Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                        {row.displaySku}
                      </span>
                      {row.product.brand && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                          {row.product.brand}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {row.product.department || row.product.category}
                      </span>
                      {isPack && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-medium">
                          <Package className="w-2.5 h-2.5" />
                          {row.packLabel} ({row.baseUnitsPerPack} units)
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-zinc-100 truncate">
                      {row.product.name}
                    </div>

                    {row.product.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                        {row.product.description}
                      </p>
                    )}
                  </div>

                  {/* Right: Price, Stock & Selection Hint */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {formatPrice(row.sellingPrice, 'USD')}
                      </div>
                      <div className="text-[11px] font-medium mt-0.5">
                        {row.inStock ? (
                          <span className="text-zinc-400">
                            {row.availableStock}{' '}
                            {isPack ? 'packs' : row.product.unitOfMeasure || 'units'} available
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold flex items-center gap-1 justify-end">
                            <AlertCircle className="w-3 h-3" /> Out of stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected && row.inStock
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Guide */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                Enter
              </kbd>{' '}
              Add 1 to Cart
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>

          <div className="text-[11px] text-zinc-500">
            Showing {flattenedRows.length} matching result{flattenedRows.length === 1 ? '' : 's'} • No quantity input in search
          </div>
        </div>
      </div>
    </div>
  );
};
