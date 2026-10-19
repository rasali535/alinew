'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailProduct, RetailCashierShift, RetailSale } from '@ralion/database';

interface CartItem {
  product: RetailProduct;
  quantity: number;
  unitPrice: number;
  discountRate: number;
}

export default function RetailPOSPage() {
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [activeShift, setActiveShift] = useState<RetailCashierShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);
  const [completedSale, setCompletedSale] = useState<RetailSale | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState('100.00');
  const [shiftClosingCash, setShiftClosingCash] = useState('0.00');
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Focus ref for fast barcode scanning
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, shiftRes] = await Promise.all([
        fetch('/api/retail/products'),
        fetch('/api/retail/pos/shifts'),
      ]);

      const prodData = await prodRes.json();
      if (prodData.success) {
        setProducts(prodData.products || []);
      }

      const shiftData = await shiftRes.json();
      if (shiftData.success) {
        setActiveShift(shiftData.activeShift || null);
      }
    } catch (e) {
      console.error('Failed to load POS data:', e);
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

  // Add product to cart
  const addToCart = (product: RetailProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellingPrice, discountRate: 0 }];
    });
  };

  // Handle barcode scanning (keyboard scanner emulates enter)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const barcode = barcodeInput.trim();
    setBarcodeInput('');

    // Check local loaded products first
    const matched = products.find((p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase());
    if (matched) {
      addToCart(matched);
      return;
    }

    // Try server lookup
    try {
      const res = await fetch(`/api/retail/products?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (data.success && data.product) {
        addToCart(data.product);
      } else {
        alert(`No product found for barcode: ${barcode}`);
      }
    } catch (err: any) {
      alert(err.message || 'Barcode scan lookup failed.');
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Cart calculations in USD
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.discountRate / 100),
    0
  );
  const taxTotal = 0; // Configurable tax
  const totalAmount = subtotal - discountTotal + taxTotal;

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
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
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

      const res = await fetch('/api/retail/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.sale) {
        setCompletedSale(data.sale);
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
      const res = await fetch('/api/retail/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          openingCash: Number(shiftOpeningCash) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.shift);
        setShowShiftModal(false);
      }
    } catch (e: any) {
      alert(e.message || 'Error opening shift');
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    try {
      const res = await fetch('/api/retail/pos/shifts', {
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
        alert(`Shift closed. Expected cash: ${formatUSD(data.shift.expectedCash)}, Actual: ${formatUSD(data.shift.closingCashActual)}, Variance: ${formatUSD(data.shift.variance)}`);
      }
    } catch (e: any) {
      alert(e.message || 'Error closing shift');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCat && matchesQuery;
  });

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <RetailNavHeader onRefresh={fetchInitialData} />

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-4">
        {/* Left Column: Product Catalog & Fast Search */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Barcode & Search Topbar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            {/* Barcode Scanning Input */}
            <form onSubmit={handleBarcodeSubmit} className="flex-1 min-w-[240px] flex items-center gap-2">
              <div className="relative flex-1">
                <Scan className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode with scanner or enter SKU..."
                  className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl border border-zinc-700 transition-colors"
              >
                Enter
              </button>
            </form>

            {/* Shift Status Button */}
            <button
              onClick={() => {
                setIsClosingShift(Boolean(activeShift));
                setShowShiftModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Shift: {activeShift ? 'Open' : 'Closed'}</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto max-h-[600px] pr-1">
            {filteredProducts.map((p) => {
              const inStock = (p.currentStock || 0) > 0;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={!inStock}
                  className={`p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 flex flex-col justify-between text-left transition-all group ${
                    !inStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 mb-1 font-mono">
                      <span>{p.sku}</span>
                      <span className="truncate max-w-[80px]">{p.unitOfMeasure}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                      {p.name}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatUSD(p.sellingPrice)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        inStock ? 'bg-zinc-800 text-zinc-300' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {inStock ? `${p.currentStock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Checkout Cart & Drawer */}
        <div className="w-full lg:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-100">Checkout Cart</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {cart.reduce((s, it) => s + it.quantity, 0)} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Customer input */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-zinc-400 block mb-1">Customer / Contractor</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Walk-in or contractor name..."
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Cart is empty. Scan items or click products to begin sale.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-200 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {formatUSD(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & Pay Buttons */}
          <div className="mt-4 pt-3 border-t border-zinc-800 space-y-3">
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
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-400">{formatUSD(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleCheckout('CASH')}
                disabled={cart.length === 0 || processingSale}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash</span>
              </button>
              <button
                onClick={() => handleCheckout('CARD_EXTERNAL')}
                disabled={cart.length === 0 || processingSale}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-zinc-700"
              >
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Card</span>
              </button>
              <button
                onClick={() => handleCheckout('BANK_TRANSFER')}
                disabled={cart.length === 0 || processingSale}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-zinc-700"
              >
                <Building className="w-4 h-4 text-indigo-400" />
                <span>Transfer</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Printable Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Sale Completed</h3>
              <p className="text-xs text-zinc-400">Receipt #{completedSale.saleNumber}</p>
            </div>

            {/* Receipt Body */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-left text-xs font-mono space-y-2">
              <div className="text-center pb-2 border-b border-zinc-800">
                <div className="font-bold text-zinc-200">PROINSIGHT HARDWARE STORE</div>
                <div className="text-[10px] text-zinc-500">Gaborone West Industrial, Botswana</div>
              </div>

              <div className="space-y-1">
                {completedSale.items?.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span className="truncate max-w-[180px]">{it.productName} ×{it.quantity}</span>
                    <span>{formatUSD(it.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-emerald-400">
                <span>TOTAL (USD):</span>
                <span>{formatUSD(completedSale.totalAmount)}</span>
              </div>
              <div className="text-[10px] text-zinc-500 pt-1">
                Paid via {completedSale.paymentMethod} • Cashier: {completedSale.cashierName}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  <label className="text-[10px] text-zinc-400 block mb-1">Actual Closing Cash (USD):</label>
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
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCloseShift}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    Close Shift
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">Record the starting cash float in the cash drawer.</p>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Opening Cash Float (USD):</label>
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
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
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
