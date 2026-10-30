import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import {
  getAllClientsForAdmin,
  createClientEntry,
  updateClientEntry,
  deleteClientEntry,
  uploadClientLogo,
  DISCOVERED_CLIENT_CANDIDATES
} from '../lib/clientsService';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  AlertTriangle,
  Upload,
  Save,
  Lock,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
  FileCheck,
  X,
  ShieldCheck,
  Filter,
  Sparkles
} from 'lucide-react';

const AdminClients = () => {
  const { user, openAuthModal } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'preview'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT' | 'NEEDS_REVIEW'
  const [editingClient, setEditingClient] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [workYear, setWorkYear] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isPublished, setIsPublished] = useState(false);
  const [authorizedLogoUse, setAuthorizedLogoUse] = useState(false);
  const [verifiedRelationship, setVerifiedRelationship] = useState(true);
  const [status, setStatus] = useState('DRAFT');
  const [notes, setNotes] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await getAllClientsForAdmin();
      setClients(data);
    } catch (err) {
      console.error('Failed to load admin clients:', err);
      setErrorMsg(err.message || 'Failed to fetch clients from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const resetForm = () => {
    setEditingClient(null);
    setName('');
    setLogoUrl('');
    setWorkYear('');
    setDisplayOrder(clients.length + 1);
    setIsPublished(false);
    setAuthorizedLogoUse(false);
    setVerifiedRelationship(true);
    setStatus('DRAFT');
    setNotes('');
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleStartEdit = (client) => {
    setEditingClient(client);
    setName(client.name);
    setLogoUrl(client.logo_url);
    setWorkYear(client.work_year);
    setDisplayOrder(client.display_order);
    setIsPublished(client.is_published);
    setAuthorizedLogoUse(client.authorized_logo_use);
    setVerifiedRelationship(client.verified_relationship);
    setStatus(client.status);
    setNotes(client.notes || '');
    setLogoPreview(client.logo_url);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg(null);
      setSaving(true);
      const uploadedUrl = await uploadClientLogo(file);
      setLogoUrl(uploadedUrl);
      setLogoPreview(uploadedUrl);
      setSuccessMsg('Logo uploaded and ready.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Client name is required.');
      return;
    }
    if (!logoUrl.trim()) {
      setErrorMsg('Client logo is required.');
      return;
    }
    if (!workYear.trim()) {
      setErrorMsg('Work year or verified year range is required.');
      return;
    }
    if (isPublished && !authorizedLogoUse) {
      setErrorMsg('Confirmation of public logo usage authorization is mandatory before publishing.');
      return;
    }

    // Client-side duplicate record check
    const isDuplicate = clients.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && (!editingClient || c.id !== editingClient.id)
    );
    if (isDuplicate) {
      setErrorMsg(`A client record with the name "${trimmedName}" already exists. Please edit the existing entry instead.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        logo_url: logoUrl.trim(),
        work_year: workYear.trim(),
        display_order: Number(displayOrder),
        is_published: isPublished,
        authorized_logo_use: authorizedLogoUse,
        verified_relationship: verifiedRelationship,
        status: isPublished && authorizedLogoUse ? 'PUBLISHED' : status,
        notes: notes.trim()
      };

      if (editingClient) {
        await updateClientEntry(editingClient.id, payload);
        setSuccessMsg(`Successfully updated client: ${trimmedName}`);
      } else {
        await createClientEntry(payload);
        setSuccessMsg(`Successfully created client entry: ${trimmedName}`);
      }

      await fetchClients();
      resetForm();
      setActiveTab('list');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAuthorizeLogo = async (client) => {
    try {
      const newAuth = !client.authorized_logo_use;
      const updates = {
        authorized_logo_use: newAuth
      };
      if (!newAuth) {
        // If revoking logo authorization, must immediately unpublish
        updates.is_published = false;
        updates.status = 'DRAFT';
      }
      await updateClientEntry(client.id, updates);
      await fetchClients();
      setSuccessMsg(
        newAuth
          ? `Authorized logo usage for ${client.name}. Ready for publication.`
          : `Revoked logo usage authorization for ${client.name}. Record moved to Draft.`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update logo authorization.');
    }
  };

  const handleImportCandidate = (candidate) => {
    setName(candidate.name);
    setLogoUrl(candidate.logo_url);
    setWorkYear(candidate.work_year === 'Year Unverified' ? '' : candidate.work_year);
    setDisplayOrder(candidate.display_order || clients.length + 1);
    setIsPublished(false);
    setAuthorizedLogoUse(false);
    setVerifiedRelationship(candidate.verified_relationship ?? true);
    setStatus(candidate.status || 'DRAFT');
    setNotes(candidate.notes || '');
    setLogoPreview(candidate.logo_url);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSuccessMsg(`Candidate "${candidate.name}" loaded into editor for administrative review.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleTogglePublish = async (client) => {
    if (!client.is_published && !client.authorized_logo_use) {
      setErrorMsg(`Cannot publish ${client.name}: Public logo authorization must be confirmed first.`);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    try {
      const newPublishedState = !client.is_published;
      await updateClientEntry(client.id, {
        is_published: newPublishedState,
        status: newPublishedState ? 'PUBLISHED' : 'DRAFT'
      });
      await fetchClients();
      setSuccessMsg(`Updated publication state for ${client.name}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to toggle publication state.');
    }
  };

  const handleDeleteClient = async (id) => {
    try {
      await deleteClientEntry(id);
      await fetchClients();
      setDeleteConfirmId(null);
      setSuccessMsg('Client entry removed successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete client entry.');
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-24 px-6 lg:px-12">
      <SEO title="Admin Clients Portfolio Management | Ras Ali Labs" />

      <div className="max-w-7xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">
              <Building2 size={14} /> Corporate Brand Assets
            </div>
            <h1 className="text-3xl font-extrabold text-white">Clients Portfolio Management</h1>
            <p className="text-white/50 text-xs mt-1">
              Maintain verified Ras Ali Labs client relationships, official logos, engagement dates, and publication status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <button
                onClick={() => openAuthModal('login')}
                className="py-2.5 px-5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-brand-gold/20"
              >
                <Lock size={14} /> Admin SSO Sign In
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-mono px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  {user.email} (Admin Authenticated)
                </span>
              </div>
            )}
            <button
              onClick={fetchClients}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 shadow-lg">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 shadow-lg">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
          <button
            onClick={() => {
              setActiveTab('list');
              resetForm();
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'list'
                ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20'
                : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Layers size={14} /> All Clients ({clients.length})
          </button>

          <button
            onClick={() => {
              resetForm();
              setActiveTab('create');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'create' && !editingClient
                ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20'
                : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Plus size={14} /> Add New Client
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20'
                : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Eye size={14} /> Live Public Preview
          </button>
        </div>

        {/* TAB 1: Clients List */}
        {activeTab === 'list' && (
          <div className="space-y-8">
            <div className="bg-[#242424] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck size={18} className="text-brand-gold" /> Registered Client Portfolio Entries
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    Manage client verification, public logo usage signoff, and live publication.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      statusFilter === 'ALL'
                        ? 'bg-brand-gold text-black font-bold'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    All ({clients.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('PUBLISHED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      statusFilter === 'PUBLISHED'
                        ? 'bg-blue-500 text-white font-bold'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    Published ({clients.filter((c) => c.is_published).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('DRAFT')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      statusFilter === 'DRAFT'
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    Drafts ({clients.filter((c) => !c.is_published && c.status !== 'NEEDS_REVIEW').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('NEEDS_REVIEW')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      statusFilter === 'NEEDS_REVIEW'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    Needs Review ({clients.filter((c) => c.status === 'NEEDS_REVIEW').length})
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-white/50 text-xs">Loading client records...</div>
              ) : clients.length === 0 ? (
                <div className="py-16 text-center text-white/50 text-xs">
                  No clients registered yet. Click "+ Add New Client" to create the first record or import from discovered candidates below.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Order</th>
                        <th className="py-3 px-4">Logo</th>
                        <th className="py-3 px-4">Client Name</th>
                        <th className="py-3 px-4">Work Year</th>
                        <th className="py-3 px-4">Relationship</th>
                        <th className="py-3 px-4">Logo Authorization</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clients
                        .filter((client) => {
                          if (statusFilter === 'PUBLISHED') return client.is_published;
                          if (statusFilter === 'DRAFT') return !client.is_published && client.status !== 'NEEDS_REVIEW';
                          if (statusFilter === 'NEEDS_REVIEW') return client.status === 'NEEDS_REVIEW';
                          return true;
                        })
                        .map((client) => (
                          <tr key={client.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-white/70">
                              #{client.display_order}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="w-12 h-10 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                                <img
                                  src={client.logo_url}
                                  alt={client.name}
                                  className="max-h-8 max-w-full object-contain"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<span class="text-[9px] text-white/30 text-center font-mono">No Logo</span>';
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-white block">{client.name}</span>
                              {client.notes && (
                                <span className="text-[10px] text-white/40 truncate max-w-xs block">
                                  {client.notes}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-white/80">{client.work_year}</td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Confirmed Client
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => handleToggleAuthorizeLogo(client)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                                  client.authorized_logo_use
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30'
                                }`}
                                title={client.authorized_logo_use ? 'Click to revoke logo usage authorization' : 'Click to authorize public logo usage'}
                              >
                                {client.authorized_logo_use ? (
                                  <>
                                    <Check size={11} /> Authorized
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle size={11} /> Authorize Logo
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              {client.is_published ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  Published
                                </span>
                              ) : client.status === 'NEEDS_REVIEW' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Needs Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/60">
                                  Draft
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleTogglePublish(client)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                                    client.is_published
                                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                  }`}
                                >
                                  {client.is_published ? 'Unpublish' : 'Publish'}
                                </button>
                                <button
                                  onClick={() => handleStartEdit(client)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
                                  title="Edit Client"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(client.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                                  title="Delete Client"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Discovered Candidates Catalog (Review & Onboarding Pipeline) */}
            <div className="bg-[#242424] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-brand-gold" /> Discovered Candidates Catalog (Historical Audit Pipeline)
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    12 identified client relationships across Ras Ali Labs and historical Themaplin Inc Group engagements.
                  </p>
                </div>
                <span className="text-xs text-brand-gold font-mono font-bold">
                  {DISCOVERED_CLIENT_CANDIDATES.length} Total Candidates
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {DISCOVERED_CLIENT_CANDIDATES.map((candidate) => {
                  const existing = clients.find(
                    (c) => c.name.toLowerCase() === candidate.name.toLowerCase()
                  );
                  return (
                    <div
                      key={candidate.id}
                      className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-10 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={candidate.logo_url}
                            alt={candidate.name}
                            className="max-h-8 max-w-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<span class="text-[8px] text-white/30 text-center font-mono">Logo</span>';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{candidate.name}</h4>
                          <span className="text-[10px] text-brand-gold font-mono block">
                            {candidate.work_year}
                          </span>
                          <p className="text-[10px] text-white/50 line-clamp-2 mt-1">
                            {candidate.notes}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        {existing ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            existing.is_published
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-white/10 text-white/60'
                          }`}>
                            {existing.is_published ? '✓ Live on Site' : 'In Database (Unpublished)'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                            Candidate in Catalog
                          </span>
                        )}

                        <button
                          onClick={() => handleImportCandidate(candidate)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-colors"
                        >
                          {existing ? 'Edit / Review' : 'Load into Editor'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Add or Edit Form */}
        {activeTab === 'create' && (
          <div className="bg-[#242424] border border-white/10 rounded-3xl p-8 shadow-2xl max-w-3xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingClient ? <Edit2 size={20} className="text-brand-gold" /> : <Plus size={20} className="text-brand-gold" />}
                {editingClient ? `Edit Client: ${editingClient.name}` : 'Register Confirmed Client'}
              </h2>
              {editingClient && (
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  className="text-white/50 hover:text-white text-xs flex items-center gap-1"
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveClient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-xs font-semibold mb-2">
                    Client Organization Name <span className="text-brand-gold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pula Pitch or Pameltex"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-semibold mb-2">
                    Verified Engagement Year or Range <span className="text-brand-gold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={workYear}
                    onChange={(e) => setWorkYear(e.target.value)}
                    placeholder="e.g. 2024 or 2015–2022"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Public card displays only the logo and this year specification.
                  </span>
                </div>
              </div>

              {/* Logo Upload & URL */}
              <div>
                <label className="block text-white/80 text-xs font-semibold mb-2">
                  Official Client Logo <span className="text-brand-gold">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      required
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoPreview(e.target.value);
                      }}
                      placeholder="e.g. /assets/images/pula-pitch-logo.jpg or storage URL"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold font-mono"
                    />
                  </div>
                  <div>
                    <label className="w-full cursor-pointer flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-colors">
                      <Upload size={14} className="text-brand-gold" /> Upload Logo File
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {logoPreview && (
                  <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-4">
                    <div className="w-20 h-16 rounded-xl bg-white/5 p-2 flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-xs text-white/60">Logo preview (object-contain verified)</span>
                  </div>
                )}
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-xs font-semibold mb-2">
                    Display Order (Ascending)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-semibold mb-2">
                    Internal Lifecycle Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold"
                  >
                    <option value="DRAFT">DRAFT (Unpublished)</option>
                    <option value="PUBLISHED">PUBLISHED (Live on Public Portfolio)</option>
                    <option value="NEEDS_REVIEW">NEEDS_REVIEW (Missing Info / Signoff)</option>
                    <option value="ARCHIVED">ARCHIVED (Historical)</option>
                  </select>
                </div>
              </div>

              {/* Data Integrity Checks */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-brand-gold uppercase tracking-wider">
                  Client Data Integrity & Publication Governance
                </h4>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedRelationship}
                    onChange={(e) => setVerifiedRelationship(e.target.checked)}
                    className="mt-0.5 rounded bg-black/50 border-white/20 text-brand-gold focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Confirmed Ras Ali Labs Client Relationship
                    </span>
                    <span className="text-[10px] text-white/50 block">
                      Distinguishes direct corporate service clients from ordinary software subscribers or demo users.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authorizedLogoUse}
                    onChange={(e) => setAuthorizedLogoUse(e.target.checked)}
                    className="mt-0.5 rounded bg-black/50 border-white/20 text-brand-gold focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Public Logo Usage Explicitly Authorized <span className="text-rose-400">*</span>
                    </span>
                    <span className="text-[10px] text-white/50 block">
                      Required before publishing. Confirms client permits public portfolio display of their brand.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer pt-1 border-t border-white/10">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => {
                      if (e.target.checked && !authorizedLogoUse) {
                        setErrorMsg('You must check "Public Logo Usage Explicitly Authorized" to publish.');
                        return;
                      }
                      setIsPublished(e.target.checked);
                    }}
                    className="mt-0.5 rounded bg-black/50 border-white/20 text-brand-gold focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Publish to Live Public Portfolio (`/clients`)
                    </span>
                    <span className="text-[10px] text-white/50 block">
                      When enabled, this client appears on `https://rasalilabs.com/clients`.
                    </span>
                  </div>
                </label>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-white/80 text-xs font-semibold mb-2">
                  Internal Verification Notes (Not shown publicly)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Engagement details, contact person, or signoff date"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold"
                />
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-3 px-6 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-brand-gold/20 disabled:opacity-50"
                >
                  <Save size={14} /> {saving ? 'Saving...' : editingClient ? 'Update Client Record' : 'Save Client Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Live Public Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye size={16} /> Live Public Page Preview Mode: Rendering exactly as prospective visitors will see at `/clients`.
              </span>
              <span className="text-white/60 text-[10px]">
                Only published entries ({clients.filter((c) => c.is_published).length}) are shown.
              </span>
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-10 shadow-2xl">
              <div className="max-w-3xl mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-5">
                  Proven Relationships
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
                  Our Clients
                </h1>
                <p className="text-xl text-white/70 font-light">
                  Trusted relationships. Meaningful work.
                </p>
                <div className="w-16 h-1 bg-brand-gold mt-6 rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clients
                  .filter((c) => c.is_published)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((client) => (
                    <div
                      key={client.id}
                      className="group bg-[#181818] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-between h-72 shadow-xl"
                    >
                      <div className="w-full flex-1 flex items-center justify-center p-4">
                        <div className="w-full h-32 flex items-center justify-center rounded-2xl bg-black/20 p-3">
                          <img
                            src={client.logo_url}
                            alt={`${client.name} Official Logo`}
                            className="max-h-24 max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<span class="text-[10px] text-white/30 text-center font-mono">Logo asset unavailable</span>';
                            }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10 w-full flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-white/70 font-mono">
                          <Calendar size={13} className="text-brand-gold" />
                          {client.work_year}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#242424] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Confirm Client Removal</h3>
              <p className="text-white/60 text-xs mb-6 leading-relaxed">
                Are you sure you want to remove this client from the portfolio? This action will remove it from both the admin directory and public pages.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteClient(deleteConfirmId)}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors"
                >
                  Yes, Remove Client
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClients;
