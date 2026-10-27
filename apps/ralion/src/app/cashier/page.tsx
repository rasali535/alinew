'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  KeyRound,
  FileText,
  X,
  Send,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  Layers,
  Coins,
  Receipt,
  RotateCcw,
  Tag,
  Check,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import { AuthService } from '@/lib/services/auth.service';
import { RetailCashierShift, RetailSale } from '@ralion/database';
import {
  normalizeProducts,
  formatPrice,
  safeLowerCase,
  type NormalizedProduct,
} from '@/lib/retail/adapters';

interface CartItem {
  product: NormalizedProduct;
  quantity: number;
  unitPrice: number;
  discountRate: number;
}

interface QuotationDraftItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  taxRate: number;
  lineTotal: number;
}

interface QuotationDraft {
  id?: string;
  customerName: string;
  items: QuotationDraftItem[];
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  currency: string;
}

interface Disambiguation {
  queryTerm: string;
  matches: Array<{ id: string; name: string; sku: string; price: number }>;
}

export default function CashierWorkstationPage() {
  // Authentication & Session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [isStationLocked, setIsStationLocked] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Terminal & POS State
  const [terminalId] = useState('POS-T1');
  const [currency, setCurrency] = useState('USD');
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeShift, setActiveShift] = useState<RetailCashierShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Tender & Checkout
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [processingSale, setProcessingSale] = useState(false);
  const [completedSale, setCompletedSale] = useState<RetailSale | null>(null);
  const [saleChangeDue, setSaleChangeDue] = useState<number>(0);

  // Modals
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState('100.00');
  const [shiftClosingCash, setShiftClosingCash] = useState('0.00');
  const [shiftNotes, setShiftNotes] = useState('');

  // Lock / Unlock Screen State
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Manager Approval Modal (Server-Verified & Action-Bound)
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [managerApprovalToken, setManagerApprovalToken] = useState<string | null>(null);
  const [managerPin, setManagerPin] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerAuthMode, setManagerAuthMode] = useState<'pin' | 'credentials'>('pin');
  const [pendingAction, setPendingAction] = useState<'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND'>('DISCOUNT_OVERRIDE');
  const [pendingDiscountValue, setPendingDiscountValue] = useState<number>(0);
  const [managerApproving, setManagerApproving] = useState(false);
  const [managerPinAction, setManagerPinAction] = useState<(() => void) | null>(null);
  const [managerPinReason, setManagerPinReason] = useState('');
  const [managerPinError, setManagerPinError] = useState<string | null>(null);

  // Mari Assistant Drawer
  const [isMariOpen, setIsMariOpen] = useState(false);
  const [mariMessages, setMariMessages] = useState<Array<{ sender: 'user' | 'mari'; text: string; draft?: QuotationDraft; disambiguations?: Disambiguation[] }>>([
    {
      sender: 'mari',
      text: 'Hello! I am Mari, your Retail Cashier Assistant. I can check current stock, verify approved prices, and prepare walk-in quotations that load directly into your cart.',
    },
  ]);
  const [mariInput, setMariInput] = useState('');
  const [mariLoading, setMariLoading] = useState(false);

  // Focus ref for fast barcode scanning
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const mariMessagesEndRef = useRef<HTMLDivElement>(null);

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener for barcode auto-focus and Mari
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/modals
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape' && target === barcodeInputRef.current) {
          setBarcodeInput('');
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        setIsMariOpen(prev => !prev);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsStationLocked(prev => !prev);
      } else if (e.key === 'F9') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial Auth & Data Load
  const checkAuthAndLoad = useCallback(async () => {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      // Verify session via auth endpoint
      const contextRes = await authFetch('/api/auth/context', { cache: 'no-store' });
      if (!contextRes.ok) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const contextData = await contextRes.json();
      if (!contextData.user || !contextData.organization || !contextData.workspace) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setCurrentUser(contextData.user);
      setCurrentOrg(contextData.organization);
      setCurrentWorkspace(contextData.workspace);

      // Verify retail entitlement and POS capability
      const entUrl = `/api/retail/entitlement?workspaceId=${encodeURIComponent(contextData.workspace.id)}&organizationId=${encodeURIComponent(contextData.organization.id)}`;
      const entRes = await authFetch(entUrl, { cache: 'no-store' });
      const entData = await entRes.json().catch(() => null);

      if (!entRes.ok || !entData?.isEntitled || !entData?.canAccessPOS) {
        setAccessDeniedMessage(
          entData?.reason || entData?.error || 'Your staff account is not authorized for Point of Sale operations in this workspace.'
        );
        setLoading(false);
        return;
      }

      if (entData.defaultCurrency) {
        setCurrency(entData.defaultCurrency);
      }

      // Load products and shift status in parallel
      const [prodRes, shiftRes] = await Promise.all([
        authFetch(`/api/retail/products?workspaceId=${encodeURIComponent(contextData.workspace.id)}`),
        authFetch(`/api/retail/pos/shifts?workspaceId=${encodeURIComponent(contextData.workspace.id)}`),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          setProducts(normalizeProducts(prodData.products));
        }
      }

      if (shiftRes.ok) {
        const shiftData = await shiftRes.json();
        if (shiftData.success) {
          setActiveShift(shiftData.activeShift || null);
        }
      }
    } catch (err: any) {
      console.error('Failed to initialize Cashier Workstation:', err);
      setAccessDeniedMessage('Network error connecting to workstation services. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuthAndLoad();
  }, [checkAuthAndLoad]);

  // Handle Login from dedicated workstation screen
  const handleCashierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both staff email and password.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await AuthService.login(loginEmail.trim(), loginPassword.trim());
      if (res.user) {
        setLoginEmail('');
        setLoginPassword('');
        await checkAuthAndLoad();
      } else {
        setLoginError('Invalid credentials. Please verify your staff email and password.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check network connection.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Secure Workstation Unlock
  const handleUnlockWorkstation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      setUnlockError('Staff password is required to unlock terminal.');
      return;
    }
    setUnlockLoading(true);
    setUnlockError(null);
    try {
      const email = currentUser?.email;
      if (!email) {
        setIsStationLocked(false);
        return;
      }
      const res = await AuthService.login(email, unlockPassword.trim());
      if (res.user) {
        setIsStationLocked(false);
        setUnlockPassword('');
        setUnlockError(null);
      } else {
        setUnlockError('Incorrect password. Terminal remains securely locked.');
      }
    } catch {
      setUnlockError('Incorrect password. Terminal remains securely locked.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleCashierLogout = async () => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCart([]);
      setActiveShift(null);
      setManagerApprovalToken(null);
    } catch {
      window.location.reload();
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Currency Formatter
  const formatMoney = (val: number) => {
    const symbol = currency === 'BWP' ? 'P' : currency === 'ZAR' ? 'R' : '$';
    return `${symbol}${(val || 0).toFixed(2)}`;
  };

  // Cart operations
  const addToCart = (product: NormalizedProduct) => {
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
    // Auto-refocus scanner
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
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

  // Manager-Controlled Discount check (Server-enforced)
  const requestDiscountUpdate = (productId: string, requestedDiscount: number) => {
    const productItem = cart.find(i => i.product.id === productId);
    if (!productItem) return;

    if (requestedDiscount > 50) {
      alert('STORE POLICY LIMIT: Maximum allowable discount under store policy is 50%. Cannot request discount exceeding store ceiling.');
      return;
    }

    // Over 10% discount requires manager approval
    if (requestedDiscount > 10) {
      setPendingAction('DISCOUNT_OVERRIDE');
      setPendingDiscountValue(requestedDiscount);
      setManagerPinReason(`Manager approval required for ${requestedDiscount}% discount on "${productItem.product.name}" (Policy Limit: 10%).`);
      setManagerPinAction(() => () => {
        setCart(prev => prev.map(item => item.product.id === productId ? { ...item, discountRate: requestedDiscount } : item));
      });
      setShowManagerPinModal(true);
    } else {
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, discountRate: requestedDiscount } : item));
    }
  };

  const requestVoidCart = () => {
    if (cart.length === 0) return;
    setPendingAction('CART_VOID');
    setManagerPinReason('Manager approval required to void active cart transaction.');
    setManagerPinAction(() => () => {
      setCart([]);
      setTenderAmount('');
      setManagerApprovalToken(null);
    });
    setShowManagerPinModal(true);
  };

  // Server-Verified Manager Approval Submit (Zero Client Hardcoded PINs)
  const handleManagerApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManagerApproving(true);
    setManagerPinError(null);

    const projectedCartItems = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      discountRate: pendingAction === 'DISCOUNT_OVERRIDE' && pendingDiscountValue !== null ? pendingDiscountValue : item.discountRate || 0,
    }));

    try {
      const res = await authFetch('/api/retail/pos/manager-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: pendingAction,
          pin: managerAuthMode === 'pin' ? managerPin : undefined,
          managerEmail: managerAuthMode === 'credentials' ? managerEmail : undefined,
          managerPassword: managerAuthMode === 'credentials' ? managerPassword : undefined,
          details: {
            discountRate: pendingDiscountValue,
            terminalId,
            cartItems: projectedCartItems,
          },
          reason: managerPinReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.approvalToken) {
        setManagerApprovalToken(data.approvalToken);
        if (managerPinAction) managerPinAction();
        setShowManagerPinModal(false);
        setManagerPin('');
        setManagerEmail('');
        setManagerPassword('');
        setManagerPinError(null);
      } else {
        setManagerPinError(data.error || 'Server rejected manager authorization.');
      }
    } catch (err: any) {
      setManagerPinError(err.message || 'Error communicating with manager approval service.');
    } finally {
      setManagerApproving(false);
    }
  };

  // Barcode Submission
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const barcode = barcodeInput.trim();
    setBarcodeInput('');

    // Check local catalogue
    const matched = products.find(
      (p) => (p.barcode && p.barcode === barcode) || safeLowerCase(p.sku) === barcode.toLowerCase()
    );
    if (matched) {
      addToCart(matched);
      return;
    }

    // Try server search
    try {
      const res = await authFetch(`/api/retail/products?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (data.success && data.product) {
        const normalized = normalizeProducts([data.product])[0];
        addToCart(normalized);
      } else {
        alert(`No product found for barcode or SKU: ${barcode}`);
      }
    } catch {
      alert('Error querying barcode database.');
    }
  };

  // Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.discountRate / 100),
    0
  );
  const taxTotal = cart.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discountRate / 100)) * ((item.product.vatRate || 0) / 100),
    0
  );
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);

  const numericTender = parseFloat(tenderAmount) || 0;
  const changeDue = Math.max(0, numericTender - grandTotal);

  // Fast Checkout
  const handleCheckout = async (paymentMethod: 'CASH' | 'CARD_EXTERNAL' | 'BANK_TRANSFER') => {
    if (cart.length === 0) {
      alert('Cannot checkout with an empty cart.');
      return;
    }

    if (!activeShift) {
      alert('Please open a cashier shift before processing transactions.');
      setShowShiftModal(true);
      return;
    }

    if (paymentMethod === 'CASH' && numericTender < grandTotal && numericTender > 0) {
      alert(`Tendered cash (${formatMoney(numericTender)}) is less than total due (${formatMoney(grandTotal)}).`);
      return;
    }

    try {
      setProcessingSale(true);
      const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        saleNumber: `POS-${Date.now().toString().slice(-6)}`,
        customerName: customerName || 'Walk-in Customer',
        shiftId: activeShift.id,
        terminalId,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          discountRate: item.discountRate || 0,
        })),
        payments: [
          {
            paymentMethod,
            amount: grandTotal,
            reference: `${paymentMethod} POS Payment (Terminal ${terminalId})`,
          },
        ],
        managerApprovalToken: managerApprovalToken || undefined,
        idempotencyKey,
      };

      const res = await authFetch('/api/retail/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          ...(managerApprovalToken ? { 'x-manager-approval-token': managerApprovalToken } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.sale) {
        setCompletedSale(data.sale);
        setSaleChangeDue(paymentMethod === 'CASH' ? changeDue : 0);
        setCart([]);
        setTenderAmount('');
        setManagerApprovalToken(null);
        // Refresh catalogue stock
        void checkAuthAndLoad();
      } else {
        alert(data.error || 'Checkout failed. Please check product stock or manager approval.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error processing checkout.');
    } finally {
      setProcessingSale(false);
    }
  };

  // Shift Management
  const handleOpenShift = async () => {
    try {
      const res = await authFetch('/api/retail/pos/shifts', {
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
      } else {
        alert(data.error || 'Failed to open shift.');
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
          notes: shiftNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          `Shift closed successfully.\nExpected Cash: ${formatMoney(data.shift.expectedCash)}\nActual Cash: ${formatMoney(data.shift.closingCashActual)}\nVariance: ${formatMoney(data.shift.variance)}`
        );
        setActiveShift(null);
        setShowShiftModal(false);
      } else {
        alert(data.error || 'Failed to close shift.');
      }
    } catch (e: any) {
      alert(e.message || 'Error closing shift');
    }
  };

  // Mari Chat & Walk-in Quotation Handlers
  const handleSendMariMessage = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || mariInput;
    if (!query.trim() || mariLoading) return;

    const userText = query.trim();
    if (!customQuery) setMariInput('');

    setMariMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setMariLoading(true);

    try {
      const res = await authFetch('/api/mari/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          context: {
            source: 'retail_cashier_terminal',
            terminalId,
            activeShiftId: activeShift?.id,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMariMessages(prev => [
          ...prev,
          {
            sender: 'mari',
            text: data.answer,
            draft: data.quotationDraft,
            disambiguations: data.disambiguations,
          },
        ]);
      } else {
        setMariMessages(prev => [
          ...prev,
          { sender: 'mari', text: data.error || 'Could not complete retail query. Please try again.' },
        ]);
      }
    } catch {
      setMariMessages(prev => [
        ...prev,
        { sender: 'mari', text: 'Network connection interrupted. Please verify connection.' },
      ]);
    } finally {
      setMariLoading(false);
      setTimeout(() => mariMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Convert Quotation Draft into Cart items
  const handleLoadDraftIntoCart = (draft: QuotationDraft) => {
    const newItems: CartItem[] = [];
    for (const dItem of draft.items) {
      const matched = products.find(p => p.id === dItem.productId || p.sku === dItem.sku);
      if (matched) {
        newItems.push({
          product: matched,
          quantity: dItem.quantity,
          unitPrice: dItem.unitPrice || matched.sellingPrice,
          discountRate: dItem.discountRate || 0,
        });
      }
    }

    if (newItems.length > 0) {
      setCart(newItems);
      setCustomerName(draft.customerName || 'Walk-in Customer');
      setIsMariOpen(false);
      alert(`Loaded ${newItems.length} products from quotation draft for "${draft.customerName}" into active cart.`);
    } else {
      alert('Could not match products from quotation draft into active store catalogue.');
    }
  };

  // Save Quotation to server
  const handleSaveQuotation = async (draft: QuotationDraft) => {
    try {
      const res = await authFetch('/api/retail/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: draft.customerName,
          items: draft.items.map(it => ({
            productId: it.productId,
            productName: it.productName,
            sku: it.sku,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountRate: it.discountRate,
            taxRate: it.taxRate,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Quotation ${data.quotation?.quotation_number || data.quotation?.quoteNumber || ''} saved successfully!`);
      } else {
        alert(data.error || 'Failed to save quotation.');
      }
    } catch {
      alert('Network error saving quotation.');
    }
  };

  // Convert Quotation to Instant Sale
  const handleConvertQuotationToSale = async (draft: QuotationDraft) => {
    if (!activeShift) {
      alert('Please open a cashier shift before converting quotation into a sale.');
      setShowShiftModal(true);
      return;
    }

    // First save quotation
    try {
      const saveRes = await authFetch('/api/retail/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: draft.customerName,
          items: draft.items.map(it => ({
            productId: it.productId,
            productName: it.productName,
            sku: it.sku,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountRate: it.discountRate,
            taxRate: it.taxRate,
          })),
        }),
      });

      const saveData = await saveRes.json();
      if (!saveData.success || !saveData.quotation?.id) {
        alert(saveData.error || 'Could not persist quotation before conversion.');
        return;
      }

      const quoteId = saveData.quotation.id;
      const convRes = await authFetch(`/api/retail/quotations/${encodeURIComponent(quoteId)}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'CASH',
          shiftId: activeShift.id,
        }),
      });

      const convData = await convRes.json();
      if (convData.success && convData.sale) {
        setCompletedSale(convData.sale);
        setSaleChangeDue(0);
        setIsMariOpen(false);
        void checkAuthAndLoad();
      } else {
        alert(convData.error || 'Failed to convert quotation to sale.');
      }
    } catch (err: any) {
      alert(err.message || 'Error converting quotation.');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      safeLowerCase(p.name).includes(q) ||
      safeLowerCase(p.sku).includes(q) ||
      Boolean(p.barcode && p.barcode.includes(q)) ||
      safeLowerCase(p.brand).includes(q) ||
      safeLowerCase(p.supplierName).includes(q) ||
      safeLowerCase(p.category).includes(q) ||
      safeLowerCase(p.subcategory).includes(q);
    return matchesCat && matchesQuery;
  });

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // 1. Unauthenticated State: Dedicated Cashier Sign-In
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl">
              🛒
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Ralion Retail POS</h1>
              <p className="text-xs text-zinc-400">Terminal {terminalId} • Authorized Cashier Login</p>
            </div>
          </div>

          {loginError && (
            <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleCashierLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Staff Email / Username</label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="cashier@store.ralion.com"
                required
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Password or Staff PIN</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing Terminal...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Terminal</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Terminal: {terminalId}</span>
            <span>Security: Server-Enforced</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Access Denied State (e.g. Unentitled workspace)
  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-100">
        <div role="alert" className="max-w-md w-full rounded-2xl border border-red-500/30 bg-zinc-900 p-8 text-white shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-center">Cashier Access Unavailable</h1>
          <p className="text-xs text-zinc-300 mt-3 text-center leading-relaxed">{accessDeniedMessage}</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold"
              onClick={() => void checkAuthAndLoad()}
            >
              Retry Connection
            </button>
            <button
              type="button"
              className="w-full py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-400"
              onClick={handleCashierLogout}
            >
              Switch Cashier Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Station Locked Overlay
  if (isStationLocked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 font-sans">
        <div className="w-full max-w-sm bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Workstation Locked</h2>
          <p className="text-xs text-zinc-400 mt-1">Terminal {terminalId} • {currentUser?.displayName || currentUser?.email}</p>
          <p className="text-[11px] text-zinc-500 mt-2">Enter staff password to resume secure checkout session.</p>

          {unlockError && (
            <div role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-2 text-xs text-red-300">
              {unlockError}
            </div>
          )}

          <form onSubmit={handleUnlockWorkstation} className="mt-4 space-y-3">
            <input
              type="password"
              autoFocus
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Enter password to unlock..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-center"
            />

            <button
              type="submit"
              disabled={unlockLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {unlockLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Workstation</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCashierLogout}
              className="w-full py-1 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Sign Out Cashier
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none overflow-hidden font-sans">
      {/* =========================================================================
          TOP WORKSTATION HEADER (Store Branding, Terminal Info, Status, Actions)
         ========================================================================= */}
      <header className="h-14 bg-zinc-900/95 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
            🛒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-100 tracking-tight">
                {currentOrg?.name || 'Ralion Retail Store'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {terminalId}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate max-w-[220px]">
              {currentWorkspace?.name || 'Main Hardware POS'}
            </p>
          </div>
        </div>

        {/* Center Indicators: Currency, Shift Status, Clock */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          {/* Currency */}
          <div className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 font-mono text-[11px] text-zinc-300 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Currency:</span>
            <strong className="text-emerald-400">{currency}</strong>
          </div>

          {/* Shift Button */}
          <button
            type="button"
            onClick={() => {
              setIsClosingShift(Boolean(activeShift));
              setShowShiftModal(true);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeShift
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Shift: {activeShift ? 'Open' : 'Closed'}</span>
          </button>

          {/* Clock */}
          <div className="font-mono text-[11px] text-zinc-400 bg-zinc-800/40 px-2 py-1 rounded border border-zinc-800">
            {currentTime}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Ask Mari AI Button */}
          <button
            type="button"
            onClick={() => setIsMariOpen(prev => !prev)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-indigo-950 to-purple-950 hover:from-indigo-900 hover:to-purple-900 text-indigo-300 hover:text-white border border-indigo-500/40 transition-all shadow-sm cursor-pointer"
            title="Ask Mari Quotations & Stock Assistant (F4 / Ctrl+M)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Ask Mari</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
            title="Toggle Fullscreen (F9)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Lock Station */}
          <button
            type="button"
            onClick={() => setIsStationLocked(true)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
            title="Lock Terminal (F8)"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Staff Info Pill */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs">
            <div className="text-right">
              <div className="font-semibold text-zinc-200 leading-none">{currentUser?.displayName || currentUser?.email?.split('@')[0]}</div>
              <div className="text-[10px] text-emerald-400">Cashier</div>
            </div>
            <button
              type="button"
              onClick={handleCashierLogout}
              className="text-[11px] text-zinc-400 hover:text-red-400 underline ml-1 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKSTATION LAYOUT (Catalog Left, Cart & Tender Right)
         ========================================================================= */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Catalog, Fast Barcode Scanner, Categories, Product Touch Grid */}
        <section className="flex-1 flex flex-col p-3 overflow-hidden gap-3 border-r border-zinc-800">
          {/* Top Search & Barcode Row */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2 shrink-0">
            {/* Barcode input with autofocus */}
            <form onSubmit={handleBarcodeSubmit} className="flex-1 min-w-[260px] flex items-center gap-2">
              <div className="relative flex-1">
                <Scan className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or enter SKU (F2)..."
                  className="w-full bg-zinc-800/90 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 cursor-pointer"
              >
                Scan (Enter)
              </button>
            </form>

            {/* Product text filter */}
            <div className="relative min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, brand, supplier, department, SKU..."
                className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Category Chips Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Touch Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pr-1">
            {filteredProducts.map((p) => {
              const inStock = (p.currentStock || 0) > 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={!inStock}
                  className={`p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/50 flex flex-col justify-between text-left transition-all group min-h-[100px] cursor-pointer ${
                    !inStock ? 'opacity-40 cursor-not-allowed bg-zinc-950' : 'hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 mb-1 font-mono">
                      <span className="font-semibold text-zinc-400">{p.sku}</span>
                      <span className="truncate">{p.unitOfMeasure}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                      {p.name}
                    </div>
                    {(p.brand || p.supplierName || p.subcategory) && (
                      <div className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                        {[p.brand, p.subcategory, p.supplierName].filter(Boolean).join(' · ')}
                      </div>
                    )
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatMoney(p.sellingPrice)}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        inStock ? 'text-zinc-400 bg-zinc-800' : 'text-red-400 bg-red-950/40'
                      }`}
                    >
                      {inStock ? `${p.currentStock} left` : 'Out of stock'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* RIGHT COLUMN: Customer, Interactive Cart, Tender & Payment Controls */}
        <section className="w-full lg:w-[420px] bg-zinc-900/60 flex flex-col p-3 overflow-hidden gap-3 shrink-0">
          {/* Customer Input Row */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer or Contractor Name"
                className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none placeholder-zinc-500"
              />
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={requestVoidCart}
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                title="Void Cart (Requires Manager PIN)"
              >
                <Trash2 className="w-3 h-3" />
                <span>Void</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-y-auto p-2 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-12">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
                <span>Cart is empty</span>
                <span className="text-[10px] mt-1">Scan barcode or touch catalogue items</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 line-clamp-1">{item.product.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {item.product.sku} • {formatMoney(item.unitPrice)} each
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      {formatMoney(item.quantity * item.unitPrice * (1 - item.discountRate / 100))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-xs">
                    {/* Stepper */}
                    <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs font-mono">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Discount Control */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <Tag className="w-3 h-3 text-zinc-500" />
                      <button
                        type="button"
                        onClick={() => {
                          const current = item.discountRate;
                          const next = current === 0 ? 5 : current === 5 ? 10 : current === 10 ? 15 : 0;
                          requestDiscountUpdate(item.product.id, next);
                        }}
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] cursor-pointer border ${
                          item.discountRate > 0
                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {item.discountRate > 0 ? `${item.discountRate}% off` : 'Discount'}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Fast Tender Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shrink-0 flex flex-col gap-2.5">
            {/* Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono text-zinc-200">{formatMoney(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discounts</span>
                  <span className="font-mono">-{formatMoney(discountTotal)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>VAT / Tax</span>
                  <span className="font-mono text-zinc-200">{formatMoney(taxTotal)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Grand Total</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {formatMoney(grandTotal)}
                </span>
              </div>
            </div>

            {/* Quick Cash Tender Shortcuts */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="text-[10px] font-semibold text-zinc-400 mb-1.5 flex justify-between">
                <span>Cash Tendered</span>
                {numericTender >= grandTotal && grandTotal > 0 && (
                  <span className="text-emerald-400 font-bold">Change Due: {formatMoney(changeDue)}</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTenderAmount(grandTotal.toFixed(2))}
                  className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700 cursor-pointer"
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => setTenderAmount('20.00')}
                  className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700 cursor-pointer"
                >
                  $20
                </button>
                <button
                  type="button"
                  onClick={() => setTenderAmount('50.00')}
                  className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700 cursor-pointer"
                >
                  $50
                </button>
                <button
                  type="button"
                  onClick={() => setTenderAmount('100.00')}
                  className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700 cursor-pointer"
                >
                  $100
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                value={tenderAmount}
                onChange={(e) => setTenderAmount(e.target.value)}
                placeholder="Custom tender amount..."
                className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Payment Method Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={cart.length === 0 || processingSale}
                onClick={() => handleCheckout('CASH')}
                className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0 || processingSale}
                onClick={() => handleCheckout('CARD_EXTERNAL')}
                className="py-3 px-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>Card (POS)</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0 || processingSale}
                onClick={() => handleCheckout('BANK_TRANSFER')}
                className="py-3 px-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border border-zinc-700 transition-all cursor-pointer active:scale-95"
              >
                <Building className="w-4 h-4" />
                <span>EFT / Trans</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CASHIER MARI ASSISTANT DRAWER (Quotation Builder & Stock Inquiries)
           ========================================================================= */}
        {isMariOpen && (
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[450px] bg-zinc-900 border-l border-indigo-500/30 shadow-2xl z-40 flex flex-col">
            {/* Mari Header */}
            <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Mari AI Cashier Partner</h3>
                  <p className="text-[10px] text-zinc-400">Stock Checks & Walk-in Quotations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMariOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mari Conversation History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mariMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/70 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                    {/* Interactive Quotation Draft Card */}
                    {msg.draft && (
                      <div className="mt-3 pt-3 border-t border-zinc-700/80 bg-zinc-950/50 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-2">
                          <span>Quotation for {msg.draft.customerName}</span>
                          <span className="font-mono">{formatMoney(msg.draft.totalAmount)}</span>
                        </div>

                        <div className="space-y-1 mb-3">
                          {msg.draft.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-[11px] text-zinc-300">
                              <span>
                                {it.quantity}x {it.productName}
                              </span>
                              <span className="font-mono">{formatMoney(it.lineTotal)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Direct Quotation Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleLoadDraftIntoCart(msg.draft!)}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Load to Cart</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConvertQuotationToSale(msg.draft!)}
                            className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Convert to Sale</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveQuotation(msg.draft!)}
                            className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold border border-zinc-700 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Save Quote</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Disambiguation choices */}
                    {msg.disambiguations && msg.disambiguations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-700 text-[11px]">
                        <span className="text-zinc-400 font-semibold">Multiple options found:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {msg.disambiguations[0].matches.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSendMariMessage(undefined, `Prepare quotation for 1 ${m.name}`)}
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-700 text-emerald-300 border border-zinc-700 text-[10px] cursor-pointer"
                            >
                              {m.name} (${m.price})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {mariLoading && (
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mari is checking catalogue stock & approved prices...</span>
                </div>
              )}
              <div ref={mariMessagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-1.5 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center gap-1 overflow-x-auto scrollbar-none text-[10px]">
              <button
                type="button"
                onClick={() => handleSendMariMessage(undefined, 'Check stock for copper pipe')}
                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap cursor-pointer"
              >
                Check Copper Pipe Stock
              </button>
              <button
                type="button"
                onClick={() => handleSendMariMessage(undefined, 'Prepare quotation for 10 copper pipes and 5 elbows for customer Sipho')}
                className="px-2 py-1 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 whitespace-nowrap cursor-pointer"
              >
                Draft Walk-in Quotation
              </button>
            </div>

            {/* Mari Input Bar */}
            <form onSubmit={handleSendMariMessage} className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2">
              <input
                type="text"
                value={mariInput}
                onChange={(e) => setMariInput(e.target.value)}
                placeholder="Ask stock, prices or 'Prepare quotation for 5 copper pipes'..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={mariLoading || !mariInput.trim()}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}
      </main>

      {/* =========================================================================
          THERMAL 80MM RECEIPT MODAL (Printable on physical POS receipt printers)
         ========================================================================= */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-zinc-950 max-w-sm w-full rounded-xl p-6 shadow-2xl flex flex-col font-mono text-xs">
            <div className="text-center border-b border-zinc-300 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider">{currentOrg?.name || 'RALION RETAIL'}</h2>
              <p className="text-[11px] text-zinc-600">{currentWorkspace?.name || 'Hardware & Building Supplies'}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Terminal: {terminalId} • Cashier: {currentUser?.displayName || 'Authorized Staff'}</p>
              <p className="text-[10px] text-zinc-500">{new Date().toLocaleString()}</p>
              <p className="text-[11px] font-bold mt-1">Sale #{completedSale.saleNumber || completedSale.id}</p>
            </div>

            <div className="py-3 border-b border-zinc-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-200 pb-1">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {completedSale.items?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate max-w-[190px]">
                    {it.quantity}x {it.productName || it.product_name}
                  </span>
                  <span>{formatMoney(it.lineTotal || it.line_total || (it.quantity * it.unitPrice))}</span>
                </div>
              ))}
            </div>

            <div className="py-2.5 border-b border-zinc-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMoney(completedSale.subtotal)}</span>
              </div>
              {completedSale.taxTotal > 0 && (
                <div className="flex justify-between">
                  <span>VAT / Tax:</span>
                  <span>{formatMoney(completedSale.taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-200">
                <span>TOTAL PAID:</span>
                <span>{formatMoney(completedSale.totalAmount)}</span>
              </div>
              {saleChangeDue > 0 && (
                <div className="flex justify-between text-zinc-700 font-bold">
                  <span>Change Given:</span>
                  <span>{formatMoney(saleChangeDue)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-3 text-[10px] text-zinc-500">
              <p>Thank you for your business!</p>
              <p className="mt-0.5">Goods returned within 7 days with valid slip.</p>
            </div>

            {/* Modal Action Buttons */}
            <div className="mt-5 flex gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip (80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANAGER PIN APPROVAL MODAL (Discounts > 10%, Voids, Exception overrides)
         ========================================================================= */}
      {showManagerPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Manager Approval Required</h3>
                <p className="text-[11px] text-zinc-400">Security exception override</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
              {managerPinReason}
            </p>

            {managerPinError && (
              <div role="alert" className="mb-3 text-xs text-red-400 font-semibold bg-red-950/40 p-2.5 rounded-lg border border-red-500/30">
                {managerPinError}
              </div>
            )}

            {/* Auth Mode Toggle */}
            <div className="flex rounded-lg bg-zinc-950 p-1 mb-4 border border-zinc-800">
              <button
                type="button"
                onClick={() => setManagerAuthMode('pin')}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  managerAuthMode === 'pin' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Manager PIN
              </button>
              <button
                type="button"
                onClick={() => setManagerAuthMode('credentials')}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  managerAuthMode === 'credentials' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Manager Password
              </button>
            </div>

            <form onSubmit={handleManagerApprovalSubmit} className="space-y-4">
              {managerAuthMode === 'pin' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Enter 4-6 Digit Manager PIN</label>
                  <input
                    type="password"
                    autoFocus
                    maxLength={6}
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div className="space-y-2.5 text-left">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Manager Email</label>
                    <input
                      type="email"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="manager@store.ralion.com"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Manager Password</label>
                    <input
                      type="password"
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowManagerPinModal(false);
                    setManagerPin('');
                    setManagerEmail('');
                    setManagerPassword('');
                    setManagerPinError(null);
                  }}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={managerApproving}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {managerApproving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Approve Exception</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SHIFT RECONCILIATION MODAL (Open / Close Cashier Shift)
         ========================================================================= */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {isClosingShift ? 'Reconcile & Close Cashier Shift' : 'Open Cashier Shift'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isClosingShift ? (
              <div className="space-y-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Shift Opened:</span>
                    <span className="text-zinc-200">
                      {activeShift?.startedAt ? new Date(activeShift.startedAt).toLocaleTimeString() : 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Opening Cash Float:</span>
                    <span className="font-mono text-emerald-400">{formatMoney(activeShift?.openingCash || 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Counted Closing Cash ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shiftClosingCash}
                    onChange={(e) => setShiftClosingCash(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Count physical cash notes and coins inside drawer. Variance will be calculated atomically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Shift Notes / Variance Explanation</label>
                  <textarea
                    rows={2}
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    placeholder="Optional notes on cash count..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseShift}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow"
                  >
                    Close Shift
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Enter the opening cash float in the drawer to begin this cashier session.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Opening Cash Float ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shiftOpeningCash}
                    onChange={(e) => setShiftOpeningCash(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenShift}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow"
                  >
                    Open Shift & Start Checkout
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
