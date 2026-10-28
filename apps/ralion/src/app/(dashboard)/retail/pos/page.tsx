'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Scan,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
  Clock,
  RefreshCw,
  User,
  ShieldAlert,
  AlertCircle,
  Sparkles,
  FileText,
  RotateCcw,
  Package,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';
import { RetailCashierShift, RetailSale, RetailReturn, RetailCashupReport, RetailLocation } from '@ralion/database';
import {
  normalizeProducts,
  formatPrice,
  safeLowerCase,
  type NormalizedProduct,
} from '@/lib/retail/adapters';
import { ProductSearchModal } from '@/components/retail/ProductSearchModal';
import { FloorManagerModal } from '@/components/retail/FloorManagerModal';
import { RetailReceiptModal } from '@/components/retail/RetailReceipt';

interface CartItem {
  product: NormalizedProduct;
  packageId?: string;
  packLabel?: string;
  unitsPerPack?: number;
  quantity: number;
  unitPrice: number;
  discountRate: number;
}

export default function RetailPOSPage() {
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [activeShift, setActiveShift] = useState<RetailCashierShift | null>(null);
  const [cashierUser, setCashierUser] = useState<{ id: string; name: string } | null>(null);
  const [locations, setLocations] = useState<RetailLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [processingSale, setProcessingSale] = useState(false);

  // Modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFloorManagerModalOpen, setIsFloorManagerModalOpen] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState('100.00');
  const [shiftClosingCash, setShiftClosingCash] = useState('0.00');
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Receipt Modal state (Sales, Returns, Cash-up)
  const [receiptSale, setReceiptSale] = useState<RetailSale | null>(null);
  const completedSale = receiptSale;
  const [receiptReturn, setReceiptReturn] = useState<RetailReturn | null>(null);
  const [receiptCashup, setReceiptCashup] = useState<RetailCashupReport | null>(null);

  // Focus ref for fast barcode scanning / search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = searchInputRef;

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const [prodRes, shiftRes, locRes] = await Promise.all([
        authFetch('/api/retail/products'),
        authFetch('/api/retail/pos/shifts'),
        authFetch('/api/retail/locations').catch(() => null),
      ]);

      if (!prodRes.ok) {
        let errJson: any = null;
        try {
          errJson = await prodRes.json();
        } catch {}
        setErrorState({
          status: prodRes.status,
          code:
            errJson?.code ||
            errJson?.error ||
            (prodRes.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message:
            errJson?.message ||
            errJson?.error ||
            `Failed to load POS terminal: HTTP ${prodRes.status}`,
        });
        return;
      }

      const prodData = await prodRes.json();
      if (prodData.success) {
        setProducts(normalizeProducts(prodData.products));
      }

      let fetchedLocations: RetailLocation[] = [];
      if (locRes && locRes.ok) {
        const locData = await locRes.json();
        if (locData.success && Array.isArray(locData.locations)) {
          fetchedLocations = locData.locations;
          setLocations(fetchedLocations);
        }
      }

      const shiftData = await shiftRes.json();
      if (shiftData.success) {
        const shift: RetailCashierShift | null = shiftData.activeShift || null;
        setActiveShift(shift);
        if (shiftData.cashierName) {
          setCashierUser({ id: shiftData.cashierId, name: shiftData.cashierName });
        }
        if (shift?.locationId) {
          setSelectedLocationId(shift.locationId);
        } else if (fetchedLocations.length > 0) {
          const defaultLoc = fetchedLocations.find((l) => l.isDefault) || fetchedLocations[0];
          setSelectedLocationId(defaultLoc.id);
        }
      } else if (fetchedLocations.length > 0) {
        const defaultLoc = fetchedLocations.find((l) => l.isDefault) || fetchedLocations[0];
        setSelectedLocationId(defaultLoc.id);
      }
    } catch (e: any) {
      console.error('Failed to load POS data:', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail POS services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  // Add product to cart with packaging support
  const addToCart = (product: NormalizedProduct, packageId?: string) => {
    let packLabel: string | undefined = undefined;
    let unitsPerPack = 1;
    let unitPrice = product.sellingPrice;

    if (packageId && product.packs) {
      const foundPack = product.packs.find((pk) => pk.id === packageId);
      if (foundPack) {
        packLabel = foundPack.label;
        unitsPerPack = foundPack.baseUnitsPerPack || 1;
        unitPrice =
          foundPack.sellingPrice !== undefined && foundPack.sellingPrice !== null
            ? foundPack.sellingPrice
            : Math.round(product.sellingPrice * unitsPerPack * 100) / 100;
      }
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.packageId === packageId
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.packageId === packageId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          packageId,
          packLabel,
          unitsPerPack,
          quantity: 1,
          unitPrice,
          discountRate: 0,
        },
      ];
    });

    // Reset search input and refocus
    setSearchQuery('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Handle barcode / search submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) return;

    // 1. Check for exact unique barcode match across products
    const exactBarcodeMatch = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === raw.toLowerCase()
    );

    if (exactBarcodeMatch) {
      addToCart(exactBarcodeMatch);
      setSearchQuery('');
      return;
    }

    // 2. Check for exact unique barcode match across package variants
    for (const p of products) {
      if (p.packs && p.packs.length > 0) {
        const matchedPack = p.packs.find(
          (pk) => pk.barcode && pk.barcode.toLowerCase() === raw.toLowerCase()
        );
        if (matchedPack) {
          addToCart(p, matchedPack.id);
          setSearchQuery('');
          return;
        }
      }
    }

    // 3. Check for exact SKU match
    const exactSkuMatch = products.find(
      (p) => p.sku && p.sku.toLowerCase() === raw.toLowerCase()
    );
    if (exactSkuMatch) {
      addToCart(exactSkuMatch);
      setSearchQuery('');
      return;
    }

    // 4. Otherwise, open the large Product Selection Popup with current query
    setIsSearchModalOpen(true);
  };
  const handleBarcodeSubmit = handleSearchSubmit;

  const updateQuantity = (productId: string, packageId: string | undefined, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.packageId === packageId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setDirectQuantity = (
    productId: string,
    packageId: string | undefined,
    value: number
  ) => {
    const qty = Math.max(1, Math.floor(value || 1));
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.packageId === packageId
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const removeFromCart = (productId: string, packageId?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.packageId === packageId)
      )
    );
  };

  // Cart calculations in USD
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.discountRate / 100),
    0
  );
  const taxTotal = 0; // Configurable tax
  const totalAmount = Math.max(0, subtotal - discountTotal + taxTotal);

  // Checkout submission
  const handleCheckout = async (paymentMethod: 'CASH' | 'CARD_EXTERNAL' | 'BANK_TRANSFER') => {
    if (cart.length === 0) return;

    try {
      setProcessingSale(true);
      const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const payload = {
        saleNumber: `POS-${Date.now().toString().slice(-6)}`,
        customerName,
        shiftId: activeShift?.id,
        locationId: activeShift?.locationId || selectedLocationId || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          packageId: item.packageId,
          packLabel: item.packLabel,
          packSize: item.unitsPerPack || 1,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.product.purchaseCost,
          discountRate: item.discountRate,
          taxRate: item.product.vatRate,
        })),
        payments: [
          {
            paymentMethod,
            amount: totalAmount,
            reference: `${paymentMethod} POS Payment`,
          },
        ],
        idempotencyKey,
      };

      const res = await authFetch('/api/retail/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.sale) {
        setReceiptSale(data.sale);
        setCart([]);
        // Refresh product stock counts
        fetchInitialData();
      } else {
        alert(data.error || 'Failed to complete checkout.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error processing sale.');
    } finally {
      setProcessingSale(false);
    }
  };

  // Shift Management Handlers
  const handleOpenShift = async () => {
    try {
      const res = await authFetch('/api/retail/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          openingCash: Number(shiftOpeningCash) || 0,
          locationId: selectedLocationId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.shift);
        setShowShiftModal(false);
      } else {
        alert(data.error || 'Failed to open shift');
      }
    } catch (e: any) {
      alert(e.message || 'Error opening shift');
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    try {
      const res = await authFetch('/api/retail/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          shiftId: activeShift.id,
          closingCashActual: Number(shiftClosingCash) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(null);
        setShowShiftModal(false);
        // Show permanent cash-up report in receipt modal for instant printing!
        if (data.report) {
          setReceiptCashup(data.report);
        } else if (data.shift) {
          alert(
            `Shift closed. Expected cash: ${formatUSD(data.shift.expectedCash)}, Actual: ${formatUSD(data.shift.closingCashActual)}, Variance: ${formatUSD(data.shift.variance)}`
          );
        }
      } else {
        alert(data.error || 'Failed to close shift');
      }
    } catch (e: any) {
      alert(e.message || 'Error closing shift');
    }
  };

  if (errorState) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
        <RetailNavHeader onRefresh={fetchInitialData} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchInitialData} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <RetailNavHeader onRefresh={fetchInitialData} />

      <div
        role="region"
        aria-label="Point of Sale Terminal"
        className="flex-1 p-4 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-4"
      >
        {/* Left Column: Clean Cashier Search Area & Workspace Status */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Control Bar: Search Input & Secondary Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
            {/* Prominent Single Barcode / Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-emerald-400 absolute left-3.5 top-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan a barcode or search for a product to begin..."
                  className="w-full bg-zinc-800/90 border border-zinc-700/80 rounded-2xl pl-11 pr-24 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="absolute right-2.5 top-2 px-2.5 py-1 rounded-xl bg-zinc-700/70 hover:bg-zinc-600 text-[11px] font-medium text-zinc-300 transition-colors"
                >
                  Browse (F2)
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-2xl shadow-sm transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </form>

            {/* Secondary Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Branch Location Badge */}
              <div
                className="px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-zinc-800/80 text-zinc-200 border border-zinc-700/60"
                title="Active Branch Location"
              >
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[140px]">
                  {locations.find((l) => l.id === (activeShift?.locationId || selectedLocationId))?.name || 'Main Branch'}
                </span>
              </div>

              {/* Floor Manager Controls Trigger */}
              <button
                type="button"
                onClick={() => setIsFloorManagerModalOpen(true)}
                className="px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                title="Floor Manager Returns, Refunds and Voids"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Returns & Voids</span>
              </button>

              {/* Quotations shortcut */}
              <Link
                href="/retail/quotations"
                className="px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Quotes</span>
              </Link>

              {/* Shift Status Button */}
              <button
                type="button"
                onClick={() => {
                  setIsClosingShift(Boolean(activeShift));
                  setShowShiftModal(true);
                }}
                className={`px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                  activeShift
                    ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700/60'
                    : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-500/40'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Shift: {activeShift ? 'Open' : 'Closed'}</span>
              </button>

              {/* Ask MARI AI Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ralion:open-mari'));
                  }
                }}
                className="px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white border border-indigo-500/40 transition-all shadow-sm cursor-pointer"
                title="Ask Mari AI Assistant (Ctrl+Shift+M)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ask Mari</span>
              </button>
            </div>
          </div>

          {/* Clean Main POS Stage: EMPTY by default (Strict Requirement 1) */}
          <div className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[460px]">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 flex items-center justify-center mb-5 shadow-inner">
              <Scan className="w-10 h-10 text-emerald-400/80 stroke-[1.5]" />
            </div>

            <h3 className="text-lg font-bold text-zinc-100">Point of Sale Terminal</h3>
            <p className="text-sm text-zinc-400 max-w-md mt-1.5">
              Scan a barcode or search for a product to begin.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('screw');
                  setIsSearchModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>Search Screws & Fixings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors"
              >
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span>Browse Full Catalogue</span>
              </button>
            </div>

            {/* Terminal & Shift Info Badge */}
            <div className="mt-8 pt-6 border-t border-zinc-800/60 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Terminal: TILL-01 (Frosthub Hardware)</span>
              </div>
              <div>
                <span>Cashier: </span>
                <span className="text-zinc-300 font-medium">{cashierUser?.name || 'Authorized Cashier'}</span>
              </div>
              <div>
                <span>Currency: </span>
                <span className="text-zinc-300 font-medium">USD ($) / Africa/Gaborone (CAT)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Cart & Drawer */}
        <div className="w-full lg:w-[420px] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-3.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-100">Checkout Cart</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-emerald-400 font-mono font-semibold">
                  {cart.reduce((s, it) => s + it.quantity, 0)} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer input */}
            <div className="mb-3.5">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Customer / Contractor
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-2xl pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Walk-in Customer or contractor name..."
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1">
              {cart.length === 0 ? (
                <div className="py-14 text-center text-xs text-zinc-500 flex flex-col items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-zinc-700 mb-2 stroke-[1.5]" />
                  <span>Cart is empty.</span>
                  <span className="text-[11px] text-zinc-600 mt-0.5">
                    Search or scan products to start a sale.
                  </span>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.packageId || 'base'}`}
                    className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-800 flex flex-col gap-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-zinc-100 truncate">{item.product.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                          <span className="font-mono text-[10px]">{item.product.sku}</span>
                          {item.packLabel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {item.packLabel} ({item.unitsPerPack} units)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-zinc-100 text-sm">
                          {formatUSD(item.unitPrice * item.quantity)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {formatUSD(item.unitPrice)} ea
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls directly in cart */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.packageId, -1)}
                          className="w-7 h-7 rounded-xl bg-zinc-700/80 hover:bg-zinc-600 flex items-center justify-center text-zinc-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            setDirectQuantity(item.product.id, item.packageId, Number(e.target.value))
                          }
                          className="w-12 text-center bg-zinc-900 border border-zinc-700 rounded-xl py-1 font-mono font-bold text-xs text-zinc-100"
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.packageId, 1)}
                          className="w-7 h-7 rounded-xl bg-zinc-700/80 hover:bg-zinc-600 flex items-center justify-center text-zinc-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id, item.packageId)}
                        className="text-zinc-500 hover:text-red-400 p-1.5 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & Tender Buttons */}
          <div className="mt-4 pt-3.5 border-t border-zinc-800 space-y-3">
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200">{formatUSD(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Discounts:</span>
                  <span className="font-mono">-{formatUSD(discountTotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-bold text-zinc-100 pt-2 border-t border-zinc-800">
                <span>Total Due:</span>
                <span className="font-mono text-lg text-emerald-400">{formatUSD(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCheckout('CASH')}
                disabled={cart.length === 0 || processingSale}
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors shadow-lg cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckout('CARD_EXTERNAL')}
                disabled={cart.length === 0 || processingSale}
                className="py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-zinc-700 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckout('BANK_TRANSFER')}
                disabled={cart.length === 0 || processingSale}
                className="py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-zinc-700 cursor-pointer"
              >
                <Building className="w-4 h-4 text-indigo-400" />
                <span>Transfer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Large Product Selection Popup (Requirement 2 & 3) */}
      <ProductSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false);
          searchInputRef.current?.focus();
        }}
        products={products}
        initialQuery={searchQuery}
        onSelectProduct={(product, packageId) => {
          addToCart(product, packageId);
          setIsSearchModalOpen(false);
        }}
      />

      {/* Floor Manager Controls Modal: Returns, Refunds, Voids (Phase 3) */}
      <FloorManagerModal
        isOpen={isFloorManagerModalOpen}
        onClose={() => setIsFloorManagerModalOpen(false)}
        onReturnCompleted={(returnRec) => {
          setReceiptReturn(returnRec);
          fetchInitialData();
        }}
        onVoidCompleted={(voidRec) => {
          alert(`Transaction ${voidRec.saleId} successfully voided and inventory restocked.`);
          fetchInitialData();
        }}
      />

      {/* Multi-Format Receipt & Cash-Up Print Modal (Phase 2 & Phase 4) */}
      {(receiptSale || receiptReturn || receiptCashup) && (
        <RetailReceiptModal
          sale={receiptSale}
          returnRecord={receiptReturn}
          cashupReport={receiptCashup}
          storeName="Frosthub Hardware & Building Supplies"
          storeBranch="Gaborone West Industrial, Botswana"
          onClose={() => {
            setReceiptSale(null);
            setReceiptReturn(null);
            setReceiptCashup(null);
          }}
        />
      )}

      {/* Cashier Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100">
              {isClosingShift ? 'Reconcile & Close Cashier Shift' : 'Open New Cashier Shift'}
            </h3>

            {isClosingShift ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Count the physical cash in the drawer and record actual closing cash.
                </p>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Actual Counted Cash in Drawer (USD):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shiftClosingCash}
                    onChange={(e) => setShiftClosingCash(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseShift}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    Close & Cash-Up
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">Record the starting cash float and verify your assigned branch counter.</p>
                {locations.length > 0 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">
                      Assigned Retail Branch / Location:
                    </label>
                    <select
                      value={selectedLocationId || ''}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.locationType || 'BRANCH'}) {loc.isDefault ? '— Default' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Opening Cash Float (USD):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shiftOpeningCash}
                    onChange={(e) => setShiftOpeningCash(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenShift}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Open Shift
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
