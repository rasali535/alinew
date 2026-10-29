'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  X,
  PackageCheck,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  RefreshCw,
  Clock,
  Layers,
  UploadCloud,
  FileText,
  Check,
  AlertTriangle,
  AlertCircle,
  Eye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';
import {
  normalizePurchaseOrders,
  normalizeSuppliers,
  normalizeProducts,
  normalizeSmartReceiptDraft,
  NormalizedRetailPurchaseOrder,
  NormalizedRetailSupplier,
  NormalizedRetailProduct,
  NormalizedSmartReceiptDraft,
  NormalizedSmartReceiptItem,
  formatPrice,
  safeLowerCase,
} from '@/lib/retail/adapters';

export default function RetailPurchasingPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers' | 'receiving'>('orders');
  const [orders, setOrders] = useState<NormalizedRetailPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<NormalizedRetailSupplier[]>([]);
  const [products, setProducts] = useState<NormalizedRetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');

  // Smart Goods Receiving State
  const [drafts, setDrafts] = useState<NormalizedSmartReceiptDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<NormalizedSmartReceiptDraft | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<'INVOICE' | 'PACKING_LIST'>('INVOICE');
  const [uploadSupplierId, setUploadSupplierId] = useState('');
  const [uploadPOId, setUploadPOId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isPostingDraft, setIsPostingDraft] = useState(false);
  const [reviewItems, setReviewItems] = useState<{
    [itemId: string]: {
      received_quantity: number;
      damaged_quantity: number;
      missing_quantity: number;
      pack_size: number;
      unit_cost?: number;
      matched_product_id?: string;
      matched_package_id?: string;
    };
  }>({});

  // Merchandising metadata
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [taxCodes, setTaxCodes] = useState<Array<{ id: string; code: string; rate: number }>>([]);

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<NormalizedRetailPurchaseOrder | null>(null);
  const [receivingItems, setReceivingItems] = useState<{ [key: string]: number }>({});
  const [receivingLoading, setReceivingLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Forms
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    payment_terms: 'Net 30',
    lead_time_days: 7,
  });

  const [newPO, setNewPO] = useState<{
    supplier_id: string;
    expected_delivery: string;
    items: {
      product_id: string;
      product_name: string;
      quantity: number;
      unit_cost: number;
      package_id?: string;
      pack_label?: string;
      pack_size?: number;
      base_quantity?: number;
    }[];
  }>({
    supplier_id: '',
    expected_delivery: '',
    items: [],
  });

  // Create Product In PO Form (Zero opening stock)
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    unitOfMeasure: 'each',
    sellingPrice: '',
    purchaseCost: '',
    departmentId: '',
    brandId: '',
    taxCodeId: '',
    supplierSku: '',
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Catalogue Search Picker in PO
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poSearchResults, setPoSearchResults] = useState<NormalizedRetailProduct[]>([]);
  const [isSearchingCatalogue, setIsSearchingCatalogue] = useState(false);

  const fetchDrafts = async () => {
    try {
      const res = await authFetch('/api/retail/purchasing/smart-receiving/drafts');
      if (res.ok) {
        const data = await res.json();
        if (data.drafts) {
          setDrafts(data.drafts.map(normalizeSmartReceiptDraft));
        }
      }
    } catch (err) {
      console.error('Failed to fetch smart receiving drafts:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const [resOrders, resSuppliers, resProducts, resHierarchy, resBrands, resTaxCodes] = await Promise.all([
        authFetch('/api/retail/purchasing/orders'),
        authFetch('/api/retail/suppliers'),
        authFetch('/api/retail/catalogue/search?channel=PURCHASE&limit=50'),
        authFetch('/api/retail/catalogue/hierarchy'),
        authFetch('/api/retail/catalogue/brands'),
        authFetch('/api/retail/catalogue/tax-codes'),
      ]);

      if (!resOrders.ok) {
        let errJson: any = null;
        try { errJson = await resOrders.json(); } catch {}
        setErrorState({
          status: resOrders.status,
          code: errJson?.code || errJson?.error || (resOrders.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load purchasing orders: HTTP ${resOrders.status}`,
        });
        return;
      }

      const dataOrders = await resOrders.json();
      const dataSuppliers = await resSuppliers.json();
      const dataProducts = await resProducts.json();

      if (dataOrders.success) setOrders(normalizePurchaseOrders(dataOrders.orders || []));
      if (dataSuppliers.success) setSuppliers(normalizeSuppliers(dataSuppliers.suppliers || []));
      if (dataProducts.products) setProducts(normalizeProducts(dataProducts.products));

      if (resHierarchy.ok) {
        const d = await resHierarchy.json();
        if (d.departments) setDepartments(d.departments);
      }
      if (resBrands.ok) {
        const b = await resBrands.json();
        if (b.brands) setBrands(b.brands);
      }
      if (resTaxCodes.ok) {
        const t = await resTaxCodes.json();
        if (t.taxCodes) setTaxCodes(t.taxCodes);
      }

      await fetchDrafts();
    } catch (e: any) {
      console.error('Failed to fetch purchasing data', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail purchasing services.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', uploadDocType);
      if (uploadSupplierId) formData.append('supplier_id', uploadSupplierId);
      if (uploadPOId) formData.append('purchase_order_id', uploadPOId);

      const res = await authFetch('/api/retail/purchasing/smart-receiving/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to upload document');
        return;
      }

      setNotification(`Document "${file.name}" uploaded. Reviewable draft created without modifying stock.`);
      setTimeout(() => setNotification(null), 4500);
      await fetchDrafts();

      // Automatically trigger extraction
      if (data.draft?.id) {
        await handleExtractDraft(data.draft.id);
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading document');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleExtractDraft = async (draftId: string) => {
    try {
      setIsExtracting(true);
      const res = await authFetch(`/api/retail/purchasing/smart-receiving/drafts/${draftId}/extract`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDrafts();
        if (selectedDraft?.id === draftId && data.draft) {
          openReviewModal(normalizeSmartReceiptDraft(data.draft));
        }
      } else {
        alert(data.error || 'Extraction failed');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to extract draft');
    } finally {
      setIsExtracting(false);
    }
  };

  const openReviewModal = (draft: NormalizedSmartReceiptDraft) => {
    setSelectedDraft(draft);
    const initialReviewState: any = {};
    draft.items?.forEach((item) => {
      initialReviewState[item.id] = {
        received_quantity: item.receivedQuantity,
        damaged_quantity: item.damagedQuantity,
        missing_quantity: item.missingQuantity,
        pack_size: item.packSize,
        unit_cost: item.unitCost,
        matched_product_id: item.matchedProductId,
        matched_package_id: item.matchedPackageId,
      };
    });
    setReviewItems(initialReviewState);
    setShowReviewModal(true);
  };

  const handlePostDraft = async () => {
    if (!selectedDraft) return;

    try {
      setIsPostingDraft(true);
      const itemsPayload = Object.entries(reviewItems).map(([itemId, values]) => ({
        item_id: itemId,
        product_id: values.matched_product_id,
        package_id: values.matched_package_id,
        received_quantity: values.received_quantity,
        damaged_quantity: values.damaged_quantity,
        missing_quantity: values.missing_quantity,
        pack_size: values.pack_size,
        unit_cost: values.unit_cost,
      }));

      const res = await authFetch(`/api/retail/purchasing/smart-receiving/drafts/${selectedDraft.id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          notes: `Posted from MARI Smart Stock Receiving: Draft ${selectedDraft.id}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to post goods receipt');
        return;
      }

      setShowReviewModal(false);
      setSelectedDraft(null);
      setNotification(`Goods receipt #${data.receipt?.receipt_number || 'posted'} approved and posted! Stock and ledger updated.`);
      setTimeout(() => setNotification(null), 5000);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error posting draft');
    } finally {
      setIsPostingDraft(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/retail/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplier.name,
          contactPerson: newSupplier.contact_person,
          contact_person: newSupplier.contact_person,
          phone: newSupplier.phone,
          email: newSupplier.email,
          paymentTerms: newSupplier.payment_terms,
          payment_terms: newSupplier.payment_terms,
          leadTimeDays: newSupplier.lead_time_days,
          lead_time_days: newSupplier.lead_time_days,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSupplierModal(false);
        setNotification(`Supplier "${newSupplier.name}" added successfully.`);
        setTimeout(() => setNotification(null), 3500);
        setNewSupplier({
          name: '',
          contact_person: '',
          phone: '',
          email: '',
          payment_terms: 'Net 30',
          lead_time_days: 7,
        });
        fetchData();
      } else {
        alert(data.error || 'Failed to add supplier');
      }
    } catch (e: any) {
      alert(e.message || 'Error adding supplier');
    }
  };

  const handleSearchCatalogue = async (q: string) => {
    setPoSearchQuery(q);
    if (!q.trim()) {
      setPoSearchResults([]);
      return;
    }
    try {
      setIsSearchingCatalogue(true);
      const res = await authFetch(`/api/retail/catalogue/search?channel=PURCHASE&q=${encodeURIComponent(q.trim())}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          setPoSearchResults(normalizeProducts(data.products));
        }
      }
    } catch (err) {
      console.error('Catalogue search error:', err);
    } finally {
      setIsSearchingCatalogue(false);
    }
  };

  const handleCreateProductInPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !newProductForm.sku.trim()) {
      alert('Product Name and SKU are required.');
      return;
    }

    try {
      setCreatingProduct(true);
      const res = await authFetch('/api/retail/purchasing/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductForm.name.trim(),
          sku: newProductForm.sku.trim(),
          barcode: newProductForm.barcode.trim() || undefined,
          unitOfMeasure: newProductForm.unitOfMeasure || 'each',
          sellingPrice: parseFloat(newProductForm.sellingPrice) || 0,
          purchaseCost: parseFloat(newProductForm.purchaseCost) || 0,
          departmentId: newProductForm.departmentId || undefined,
          brandId: newProductForm.brandId || undefined,
          taxCodeId: newProductForm.taxCodeId || undefined,
          supplierId: newPO.supplier_id || undefined,
          supplierSku: newProductForm.supplierSku.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.product) {
        const created = data.product;
        setShowCreateProductModal(false);
        setNotification(`Product "${created.name}" created with 0 opening stock (ready for PO).`);
        setTimeout(() => setNotification(null), 4000);

        // Auto-add line item to PO
        const cost = parseFloat(newProductForm.purchaseCost) || 0;
        setNewPO((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            {
              product_id: created.id,
              product_name: created.name,
              quantity: 1,
              unit_cost: cost,
              pack_size: 1,
              base_quantity: 1,
            },
          ],
        }));

        setNewProductForm({
          name: '',
          sku: '',
          barcode: '',
          unitOfMeasure: 'each',
          sellingPrice: '',
          purchaseCost: '',
          departmentId: '',
          brandId: '',
          taxCodeId: '',
          supplierSku: '',
        });

        void fetchData();
      } else {
        alert(data.error || 'Failed to create product.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating product.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.supplier_id) {
      alert('Please select a supplier.');
      return;
    }
    if (newPO.items.length === 0) {
      alert('Please add at least one item to purchase.');
      return;
    }

    try {
      const payload = {
        supplierId: newPO.supplier_id,
        supplier_id: newPO.supplier_id,
        expectedDelivery: newPO.expected_delivery || undefined,
        expected_delivery: newPO.expected_delivery || undefined,
        items: newPO.items.map((it) => ({
          productId: it.product_id,
          product_id: it.product_id,
          productName: it.product_name,
          product_name: it.product_name,
          quantity: it.quantity,
          quantityOrdered: it.quantity,
          quantity_ordered: it.quantity,
          unitCost: it.unit_cost,
          unit_cost: it.unit_cost,
          packageId: it.package_id,
          package_id: it.package_id,
          packLabel: it.pack_label,
          pack_label: it.pack_label,
          packSize: it.pack_size || 1,
          pack_size: it.pack_size || 1,
          baseQuantity: it.base_quantity || (it.quantity * (it.pack_size || 1)),
          base_quantity: it.base_quantity || (it.quantity * (it.pack_size || 1)),
        })),
      };

      const res = await authFetch('/api/retail/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreatePOModal(false);
        const orderNum = data.order?.order_number || data.order?.orderNumber || '';
        setNotification(`Purchase Order #${orderNum} created in USD ($).`);
        setTimeout(() => setNotification(null), 4000);
        setNewPO({ supplier_id: '', expected_delivery: '', items: [] });
        fetchData();
      } else {
        alert(data.error || 'Failed to create PO');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating PO');
    }
  };

  const openReceiveModal = (po: NormalizedRetailPurchaseOrder) => {
    setSelectedPO(po);
    const initialMap: { [key: string]: number } = {};
    if (po.items) {
      po.items.forEach((item) => {
        const key = item.id || `${item.productId || item.product_id}_${item.packageId || 'base'}`;
        const ordered = item.quantityOrdered ?? item.quantity_ordered ?? 0;
        const received = item.quantityReceived ?? item.quantity_received ?? 0;
        initialMap[key] = Math.max(0, ordered - received);
      });
    }
    setReceivingItems(initialMap);
    setShowReceiveModal(true);
  };

  const handlePostReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    try {
      setReceivingLoading(true);
      const itemsToReceive = Object.entries(receivingItems)
        .filter(([_, qty]) => qty > 0)
        .map(([key, qty]) => {
          const poItem = selectedPO.items?.find(
            (it) => it.id === key || `${it.productId || it.product_id}_${it.packageId || 'base'}` === key || (it.productId || it.product_id) === key
          );
          return {
            poItemId: poItem?.id,
            po_item_id: poItem?.id,
            productId: poItem ? (poItem.productId || poItem.product_id) : key,
            product_id: poItem ? (poItem.productId || poItem.product_id) : key,
            quantityReceived: qty,
            quantityReceivedNow: qty,
            quantity_received: qty,
          };
        });

      if (itemsToReceive.length === 0) {
        alert('Please specify quantity received for at least one item.');
        setReceivingLoading(false);
        return;
      }

      const res = await authFetch('/api/retail/purchasing/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: selectedPO.id,
          orderId: selectedPO.id,
          items: itemsToReceive,
          receivedItems: itemsToReceive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowReceiveModal(false);
        setNotification('Goods received! Inventory stock and balance sheet asset capitalized in USD.');
        setTimeout(() => setNotification(null), 4500);
        fetchData();
      } else {
        alert(data.error || 'Failed to post receiving');
      }
    } catch (e: any) {
      alert(e.message || 'Error receiving goods');
    } finally {
      setReceivingLoading(false);
    }
  };

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchData} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchData} />

      <div role="region" aria-label="Purchasing and Supplier Management" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {notification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              Purchasing & Supplier Management
            </h2>
            <p className="text-sm text-zinc-400">
              Procure stock from manufacturers, track lead times, and post atomic goods receipt in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'orders' ? (
              <button
                onClick={() => setShowCreatePOModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Purchase Order
              </button>
            ) : (
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
          </div>
        </div>

        {/* Tab Switching */}
        <div className="flex border-b border-zinc-800 gap-6 text-sm">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Purchase Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'suppliers'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Suppliers Directory ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('receiving')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'receiving'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Smart Goods Receiving ({drafts.length})
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">
              MARI
            </span>
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                    <th className="py-3.5 px-4">PO Number</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4 text-right">Total Cost (USD)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        No purchase orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((po) => (
                      <tr key={po.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                          {po.order_number || po.orderNumber || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-zinc-100">
                          {po.supplier_name || po.supplierName || 'Hardware Distributor'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                          {formatPrice(po.total_cost ?? po.totalCost ?? po.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              po.status === 'received'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : po.status === 'ordered'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          {po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {po.status !== 'received' && (
                            <button
                              onClick={() => openReceiveModal(po)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5 ml-auto"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Receive Goods
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPPLIERS TAB */}
        {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl space-y-3 backdrop-blur-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-zinc-100 text-base">{s.name}</h4>
                    {s.contact_person && (
                      <p className="text-xs text-zinc-400 mt-0.5">Attn: {s.contact_person}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{s.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Lead Time: {s.lead_time_days || 7} days</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 flex justify-between items-center">
                  <span>Terms: <strong>{s.payment_terms || 'Net 30'}</strong></span>
                  <span className="text-emerald-400 font-mono font-bold">USD Account</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SMART GOODS RECEIVING TAB */}
        {activeTab === 'receiving' && (
          <div className="space-y-6">
            {/* Upload Zone Card */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/80 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    MARI Smart Stock Receiving
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Upload supplier invoices or packing lists. Automated OCR parsing, catalogue matching, and pack conversions.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Draft First — Zero Automatic Stock Increase</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Document Type *</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="INVOICE">Supplier Commercial Invoice (with prices)</option>
                    <option value="PACKING_LIST">Delivery Packing List (quantity only)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Associated Supplier (Optional)</label>
                  <select
                    value={uploadSupplierId}
                    onChange={(e) => setUploadSupplierId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Auto-detect from document --</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Link Purchase Order (Optional)</label>
                  <select
                    value={uploadPOId}
                    onChange={(e) => setUploadPOId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Direct receiving / Auto PO --</option>
                    {orders
                      .filter((o) => o.status !== 'received')
                      .map((po) => (
                        <option key={po.id} value={po.id}>
                          #{po.order_number || po.orderNumber} ({po.supplier_name || 'Supplier'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div className="relative border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-colors bg-zinc-950/40">
                <input
                  type="file"
                  id="smart-stock-file-input"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,application/pdf,image/png,image/jpeg,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400">
                    <UploadCloud className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {isUploading ? 'Uploading & parsing document...' : 'Click or drag invoice / packing list to upload'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Supported formats: PDF, Scanned PNG/JPG, XLSX, CSV (Max 25MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Receiving Drafts List */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Receiving Drafts
                </h4>
                <button
                  onClick={fetchDrafts}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                      <th className="py-3.5 px-4">Document / File</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Supplier</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Items</th>
                      <th className="py-3.5 px-4 text-right">Total (USD)</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {drafts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500">
                          No receiving drafts uploaded yet. Upload an invoice or packing list above to get started.
                        </td>
                      </tr>
                    ) : (
                      drafts.map((draft) => {
                        const statusColors: Record<string, string> = {
                          PENDING_EXTRACTION: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                          PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          READY_FOR_REVIEW: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          POSTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                        };

                        return (
                          <tr key={draft.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-zinc-200">{draft.fileName}</div>
                              <div className="text-xs text-zinc-500 font-mono">
                                {draft.extractedDocumentNumber ? `Doc #${draft.extractedDocumentNumber}` : 'Pending parse'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {draft.documentType}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-zinc-200">
                              {draft.supplierName || draft.extractedSupplierName || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                                  statusColors[draft.status] || 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {draft.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                              {draft.items?.length || 0}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                              {draft.documentType === 'PACKING_LIST' && !draft.totalAmount
                                ? '—'
                                : formatPrice(draft.totalAmount)}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              {draft.status === 'READY_FOR_REVIEW' && (
                                <button
                                  onClick={() => openReviewModal(draft)}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition inline-flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Review & Approve
                                </button>
                              )}
                              {draft.status === 'PENDING_EXTRACTION' && (
                                <button
                                  onClick={() => handleExtractDraft(draft.id)}
                                  disabled={isExtracting}
                                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Extract
                                </button>
                              )}
                              {draft.status === 'POSTED' && (
                                <span className="text-xs text-emerald-400 font-mono flex items-center justify-end gap-1">
                                  <Check className="w-3.5 h-3.5" /> Posted
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW AND POST DRAFT MODAL */}
        {showReviewModal && selectedDraft && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Review Smart Stock Receipt: {selectedDraft.fileName}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Doc Type: <strong>{selectedDraft.documentType}</strong> • Supplier:{' '}
                    <strong>{selectedDraft.supplierName || selectedDraft.extractedSupplierName || 'Unknown'}</strong> •
                    Authorized approval required to update stock.
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedDraft.documentType === 'PACKING_LIST' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Packing List Rule:</strong> Unit costs are not stated in packing slips. Costs will be linked from the Purchase Order or Catalogue. No prices will be fabricated.
                  </span>
                </div>
              )}

              {/* Line Items Table */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase font-semibold">
                        <th className="py-2.5 px-3">Item / Description</th>
                        <th className="py-2.5 px-3">Matched Product</th>
                        <th className="py-2.5 px-3 text-center">Stated</th>
                        <th className="py-2.5 px-3 text-center">Received</th>
                        <th className="py-2.5 px-3 text-center">Damaged</th>
                        <th className="py-2.5 px-3 text-center">Missing</th>
                        <th className="py-2.5 px-3 text-center">Pack Multiplier</th>
                        <th className="py-2.5 px-3 text-right">Base Units</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {selectedDraft.items?.map((item) => {
                        const itemState = reviewItems[item.id] || {
                          received_quantity: item.receivedQuantity,
                          damaged_quantity: item.damagedQuantity,
                          missing_quantity: item.missingQuantity,
                          pack_size: item.packSize,
                          unit_cost: item.unitCost,
                          matched_product_id: item.matchedProductId,
                          matched_package_id: item.matchedPackageId,
                        };

                        const baseUnits = Math.round(itemState.received_quantity * itemState.pack_size * 100) / 100;
                        const hasShortage = itemState.missing_quantity > 0 || itemState.damaged_quantity > 0;

                        return (
                          <tr key={item.id} className="hover:bg-zinc-800/20">
                            <td className="py-2 px-3 font-sans">
                              <div className="font-medium text-zinc-200">{item.rawDescription}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                {item.rawSku ? `SKU: ${item.rawSku}` : ''} {item.rawBarcode ? `Barcode: ${item.rawBarcode}` : ''}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-sans">
                              <select
                                value={itemState.matched_product_id || ''}
                                onChange={(e) =>
                                  setReviewItems({
                                    ...reviewItems,
                                    [item.id]: { ...itemState, matched_product_id: e.target.value || undefined },
                                  })
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100"
                              >
                                <option value="">-- Unmatched --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-center text-zinc-400">
                              {item.statedQuantity}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={itemState.received_quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const missing = Math.max(0, item.statedQuantity - val - itemState.damaged_quantity);
                                  setReviewItems({
                                    ...reviewItems,
                                    [item.id]: {
                                      ...itemState,
                                      received_quantity: val,
                                      missing_quantity: missing,
                                    },
                                  });
                                }}
                                className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-emerald-400 font-bold"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={itemState.damaged_quantity}
                                onChange={(e) => {
                                  const dmg = parseFloat(e.target.value) || 0;
                                  setReviewItems({
                                    ...reviewItems,
                                    [item.id]: { ...itemState, damaged_quantity: dmg },
                                  });
                                }}
                                className="w-14 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-amber-400"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-rose-400 font-bold">
                              {itemState.missing_quantity}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={itemState.pack_size}
                                onChange={(e) =>
                                  setReviewItems({
                                    ...reviewItems,
                                    [item.id]: {
                                      ...itemState,
                                      pack_size: parseFloat(e.target.value) || 1,
                                    },
                                  })
                                }
                                className="w-14 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-zinc-200"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400">
                              +{baseUnits}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {itemState.unit_cost !== undefined ? (
                                formatPrice(itemState.unit_cost)
                              ) : (
                                <span className="text-zinc-500 italic">PO / Ref</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approval & Post Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="text-xs text-zinc-400">
                  <span className="text-emerald-400 font-medium">Approval Policy:</span> Posting executes single-transaction stock ledger update.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePostDraft}
                    disabled={isPostingDraft}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isPostingDraft ? 'Posting Goods Receipt...' : 'Approve & Post Goods Receipt'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE PURCHASE ORDER MODAL */}
        {showCreatePOModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  Create Purchase Order (USD)
                </h3>
                <button
                  onClick={() => setShowCreatePOModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePO} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Select Supplier *</label>
                    <select
                      required
                      value={newPO.supplier_id}
                      onChange={(e) => setNewPO({ ...newPO, supplier_id: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={newPO.expected_delivery}
                      onChange={(e) => setNewPO({ ...newPO, expected_delivery: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Add Product Line Items with Unified Search & Create Product Modal */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-xl space-y-2.5">
                  <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Add Inventory Items to PO</span>
                    <button
                      type="button"
                      onClick={() => setShowCreateProductModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create New Product</span>
                    </button>
                  </div>

                  {/* Catalogue Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={poSearchQuery}
                      onChange={(e) => handleSearchCatalogue(e.target.value)}
                      placeholder="Search existing products by name, SKU, brand to add..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                    {isSearchingCatalogue && (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-2.5 animate-spin" />
                    )}
                  </div>

                  {/* Product Cards & Packaging Variants */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {(poSearchQuery.trim() ? poSearchResults : products.slice(0, 8)).map((prod) => {
                      const baseCost = prod.purchaseCost ?? prod.unit_cost ?? 0;
                      const hasPacks = Array.isArray(prod.packs) && prod.packs.length > 0;

                      return (
                        <div
                          key={prod.id}
                          className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between text-xs space-y-1.5"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                              <span>{prod.sku}</span>
                              {prod.brand && <span className="text-zinc-400">{prod.brand}</span>}
                            </div>
                            <div className="font-medium text-zinc-200 truncate mt-0.5">{prod.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono flex justify-between mt-0.5">
                              <span>Base Cost: {formatPrice(baseCost)}</span>
                              <span>Stock: {prod.currentStock ?? prod.current_stock ?? 0}</span>
                            </div>
                          </div>

                          <div className="pt-1 border-t border-zinc-800 flex flex-wrap gap-1">
                            {/* Add Base Unit */}
                            <button
                              type="button"
                              onClick={() => {
                                const existingIdx = newPO.items.findIndex(
                                  (it) => it.product_id === prod.id && !it.package_id
                                );
                                if (existingIdx >= 0) {
                                  const updated = [...newPO.items];
                                  updated[existingIdx].quantity += 1;
                                  updated[existingIdx].base_quantity = updated[existingIdx].quantity;
                                  setNewPO({ ...newPO, items: updated });
                                } else {
                                  setNewPO({
                                    ...newPO,
                                    items: [
                                      ...newPO.items,
                                      {
                                        product_id: prod.id,
                                        product_name: prod.name,
                                        quantity: 1,
                                        unit_cost: baseCost,
                                        pack_size: 1,
                                        base_quantity: 1,
                                      },
                                    ],
                                  });
                                }
                              }}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-medium transition cursor-pointer"
                            >
                              + Base Unit ({formatPrice(baseCost)})
                            </button>

                            {/* Add Packaging Variants */}
                            {hasPacks &&
                              prod.packs!.map((pk) => {
                                const packCost =
                                  pk.purchaseCost ?? Math.round(baseCost * pk.baseUnitsPerPack * 100) / 100;
                                return (
                                  <button
                                    key={pk.id}
                                    type="button"
                                    onClick={() => {
                                      const existingIdx = newPO.items.findIndex(
                                        (it) => it.product_id === prod.id && it.package_id === pk.id
                                      );
                                      if (existingIdx >= 0) {
                                        const updated = [...newPO.items];
                                        updated[existingIdx].quantity += 1;
                                        updated[existingIdx].base_quantity =
                                          updated[existingIdx].quantity * pk.baseUnitsPerPack;
                                        setNewPO({ ...newPO, items: updated });
                                      } else {
                                        setNewPO({
                                          ...newPO,
                                          items: [
                                            ...newPO.items,
                                            {
                                              product_id: prod.id,
                                              product_name: prod.name,
                                              quantity: 1,
                                              unit_cost: packCost,
                                              package_id: pk.id,
                                              pack_label: pk.label,
                                              pack_size: pk.baseUnitsPerPack,
                                              base_quantity: pk.baseUnitsPerPack,
                                            },
                                          ],
                                        });
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-[10px] text-emerald-300 font-medium transition cursor-pointer"
                                    title={`Add ${pk.label} (${pk.baseUnitsPerPack} base units)`}
                                  >
                                    + {pk.label} ({formatPrice(packCost)})
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PO Line Items List */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Packaging</th>
                        <th className="p-2.5 text-center w-20">Order Qty</th>
                        <th className="p-2.5 text-center w-24">Base Units</th>
                        <th className="p-2.5 text-right w-24">Cost ($)</th>
                        <th className="p-2.5 text-right w-24">Total ($)</th>
                        <th className="p-2.5 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {newPO.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-zinc-500">
                            No items added yet. Search or click catalogue items above to add to this PO.
                          </td>
                        </tr>
                      ) : (
                        newPO.items.map((item, idx) => {
                          const baseUnits = item.quantity * (item.pack_size || 1);
                          return (
                            <tr key={idx} className="hover:bg-zinc-800/20">
                              <td className="p-2.5 font-medium text-zinc-200">{item.product_name}</td>
                              <td className="p-2.5 text-center">
                                {item.pack_label ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold">
                                    {item.pack_label} (x{item.pack_size})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-zinc-500">Base Unit</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 0;
                                    const updated = [...newPO.items];
                                    if (qty <= 0) {
                                      updated.splice(idx, 1);
                                    } else {
                                      updated[idx].quantity = qty;
                                      updated[idx].base_quantity = qty * (updated[idx].pack_size || 1);
                                    }
                                    setNewPO({ ...newPO, items: updated });
                                  }}
                                  className="w-16 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-center font-mono text-zinc-100"
                                />
                              </td>
                              <td className="p-2.5 text-center font-mono text-zinc-400">
                                {baseUnits} units
                              </td>
                              <td className="p-2.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.unit_cost}
                                  onChange={(e) => {
                                    const cost = parseFloat(e.target.value) || 0;
                                    const updated = [...newPO.items];
                                    updated[idx].unit_cost = cost;
                                    setNewPO({ ...newPO, items: updated });
                                  }}
                                  className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right font-mono text-zinc-100"
                                />
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                {formatPrice(item.quantity * item.unit_cost)}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newPO.items];
                                    updated.splice(idx, 1);
                                    setNewPO({ ...newPO, items: updated });
                                  }}
                                  className="text-zinc-500 hover:text-rose-400 p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between font-bold text-sm text-zinc-100">
                      <span>Total Cost:</span>
                      <span className="text-emerald-400">
                        {formatPrice(newPO.items.reduce((s, it) => s + it.quantity * it.unit_cost, 0))} USD
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowCreatePOModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Place Purchase Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RECEIVE GOODS MODAL */}
        {showReceiveModal && selectedPO && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                    Receive Inventory: PO #{selectedPO.order_number || selectedPO.orderNumber || '—'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Supplier: {selectedPO.supplier_name || selectedPO.supplierName || 'Hardware Supplier'} • Capitalize inventory asset (USD)
                  </p>
                </div>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300">
                <strong>Accounting Rule:</strong> Receiving goods updates physical stock and balance sheet inventory valuation. It does NOT generate an operating expense.
              </div>

              <form onSubmit={handlePostReceiving} className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPO.items && selectedPO.items.length > 0 ? (
                    selectedPO.items.map((item) => {
                      const lineKey =
                        item.id || `${item.productId || item.product_id}_${item.packageId || 'base'}`;
                      const ordered = item.quantityOrdered ?? item.quantity_ordered ?? 0;
                      const alreadyReceived = item.quantityReceived ?? item.quantity_received ?? 0;
                      const remaining = Math.max(0, ordered - alreadyReceived);
                      const cost = item.unitCost ?? item.unit_cost;
                      const packLabel = item.packLabel;
                      const packSize = item.packSize || 1;
                      const currentQtyVal =
                        receivingItems[lineKey] !== undefined ? receivingItems[lineKey] : remaining;

                      return (
                        <div
                          key={lineKey}
                          className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-200">{item.productName || item.product_name}</span>
                              {packLabel && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold">
                                  {packLabel} (x{packSize})
                                </span>
                              )}
                            </div>
                            <div className="text-zinc-500 font-mono mt-0.5">
                              Ordered: {ordered} • Received: {alreadyReceived} • Cost: {formatPrice(cost)}
                            </div>
                            {packSize > 1 && (
                              <div className="text-[10px] text-zinc-400 mt-0.5">
                                Base Units to receive: {currentQtyVal * packSize} units
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-zinc-400 text-xs">Packs to Receive:</label>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={currentQtyVal}
                              onChange={(e) =>
                                setReceivingItems({
                                  ...receivingItems,
                                  [lineKey]: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-mono text-zinc-100"
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-zinc-500">
                      Standard hardware shipment receiving.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={receivingLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {receivingLoading ? 'Posting Goods...' : 'Confirm Goods Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE PRODUCT IN PO FLOW MODAL (Zero Opening Stock) */}
        {showCreateProductModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-zinc-100">Create New Catalogue Product</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateProductModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-300">
                <strong>Zero Opening Stock Invariant:</strong> New products start with 0 physical stock. Inventory will only increase after you receive goods on this Purchase Order.
              </div>

              <form onSubmit={handleCreateProductInPO} className="space-y-3 text-xs flex-1 overflow-y-auto pr-1">
                <div>
                  <label className="text-zinc-400 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    placeholder="e.g. Copper Pipe 15mm x 5.5m"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-400 block mb-1">SKU *</label>
                    <input
                      type="text"
                      required
                      value={newProductForm.sku}
                      onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                      placeholder="e.g. CP-15MM"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Barcode (Optional)</label>
                    <input
                      type="text"
                      value={newProductForm.barcode}
                      onChange={(e) => setNewProductForm({ ...newProductForm, barcode: e.target.value })}
                      placeholder="e.g. 6001234567890"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-zinc-400 block mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={newProductForm.unitOfMeasure}
                      onChange={(e) => setNewProductForm({ ...newProductForm, unitOfMeasure: e.target.value })}
                      placeholder="each / m / kg"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Purchase Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProductForm.purchaseCost}
                      onChange={(e) => setNewProductForm({ ...newProductForm, purchaseCost: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Selling Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProductForm.sellingPrice}
                      onChange={(e) => setNewProductForm({ ...newProductForm, sellingPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-400 block mb-1">Department</label>
                    <select
                      value={newProductForm.departmentId}
                      onChange={(e) => setNewProductForm({ ...newProductForm, departmentId: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- None --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Brand</label>
                    <select
                      value={newProductForm.brandId}
                      onChange={(e) => setNewProductForm({ ...newProductForm, brandId: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- None --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-400 block mb-1">Tax Code</label>
                    <select
                      value={newProductForm.taxCodeId}
                      onChange={(e) => setNewProductForm({ ...newProductForm, taxCodeId: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Standard VAT --</option>
                      {taxCodes.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.code} ({tc.rate}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Supplier SKU</label>
                    <input
                      type="text"
                      value={newProductForm.supplierSku}
                      onChange={(e) => setNewProductForm({ ...newProductForm, supplierSku: e.target.value })}
                      placeholder="Supplier part #"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateProductModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProduct}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                  >
                    {creatingProduct ? 'Creating...' : 'Create & Add to PO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD SUPPLIER MODAL */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Add Hardware Supplier
                </h3>
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSupplier} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Company / Supplier Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. National Cement Mills"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newSupplier.contact_person}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 123-4567"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      value={newSupplier.lead_time_days}
                      onChange={(e) => setNewSupplier({ ...newSupplier, lead_time_days: parseInt(e.target.value) || 7 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
