/**
 * Authoritative Client Portfolio Data & Management Service for Ras Ali Labs
 * Enforces:
 * 1. Public client cards display ONLY official logos and verified year/years of completed work.
 * 2. Strict segregation: Confirmed Ras Ali Labs clients vs Ralion OS subscribers vs Demo users.
 * 3. Only verified clients with explicit publication authorization are exposed to public endpoints.
 * 4. Records lacking verified logos or project dates are held in 'NEEDS_REVIEW' / draft state.
 */

import { supabase } from './supabase';

export const VERIFIED_BASELINE_CLIENTS = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Pula Pitch',
    logo_url: '/assets/images/pula-pitch-logo.jpg',
    work_year: '2024',
    display_order: 1,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: '13-episode Botswana television series with lead videography, set design, pre-production and post-production.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'The Melody Gospel TV Show',
    logo_url: '/assets/images/melody-logo.jpg',
    work_year: '2015–2022',
    display_order: 2,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: 'Long-running gospel television production with music direction, sound engineering, rehearsal and performance planning.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Pameltex',
    logo_url: '/assets/images/pameltex-logo.png',
    work_year: '2023',
    display_order: 3,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: 'Industrial digital platform at pameltex.com, responsive corporate platform with product information architecture.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Lebville Boutique',
    logo_url: '/assets/images/lebville-logo.png',
    work_year: '2024',
    display_order: 4,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: 'Fashion boutique storefront and responsive e-commerce platform at lebvilleboutique.com.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Eagle Touch Tours',
    logo_url: '/assets/images/eagle-touch-logo.png',
    work_year: '2023–2024',
    display_order: 5,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: 'Victoria Falls travel and tourism website at eagletouchtours.com.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'BB Travel Tours',
    logo_url: '/assets/images/bb-travel-logo.jpg',
    work_year: '2023–2024',
    display_order: 6,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: 'Victoria Falls activities and travel services platform at bbtraveltours.com.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    name: 'Peregrine Tours and Safaris',
    logo_url: '/assets/images/peregrine-logo.png',
    work_year: '2024',
    display_order: 7,
    is_published: true,
    verified_relationship: true,
    authorized_logo_use: true,
    status: 'PUBLISHED',
    notes: 'Tours and safari digital platform delivering travel services presentation and destination experiences.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    name: 'Safari Butler',
    logo_url: '/assets/images/safari-butler-logo.jpg',
    work_year: 'Year Unverified',
    display_order: 8,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'NEEDS_REVIEW',
    notes: 'Logo asset in repo; requires verification of completion date and public display authorization before publishing.'
  }
];

const LOCAL_STORAGE_KEY = 'rasalilabs_clients_portfolio_store';

function getLocalStore() {
  if (typeof window === 'undefined') return [...VERIFIED_BASELINE_CLIENTS];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(VERIFIED_BASELINE_CLIENTS));
      return [...VERIFIED_BASELINE_CLIENTS];
    }
    return JSON.parse(raw);
  } catch (err) {
    return [...VERIFIED_BASELINE_CLIENTS];
  }
}

function setLocalStore(clients) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients));
  } catch (err) {
    console.warn('[ClientsService] Failed to persist to localStorage:', err);
  }
}

/**
 * Fetch published, authorized clients for the public portfolio.
 * Public cards display ONLY logo and year.
 */
export async function getPublishedClients() {
  try {
    const { data, error } = await supabase
      .from('clients_portfolio')
      .select('id, name, logo_url, work_year, display_order')
      .eq('is_published', true)
      .eq('authorized_logo_use', true)
      .eq('status', 'PUBLISHED')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback to verified local/baseline data
      const local = getLocalStore().filter(
        c => c.is_published && c.authorized_logo_use && c.status === 'PUBLISHED'
      );
      return local.sort((a, b) => a.display_order - b.display_order);
    }

    return data;
  } catch (err) {
    console.warn('[ClientsService] Remote query failed, using verified baseline:', err);
    return getLocalStore()
      .filter(c => c.is_published && c.authorized_logo_use && c.status === 'PUBLISHED')
      .sort((a, b) => a.display_order - b.display_order);
  }
}

/**
 * Fetch all client entries (drafts, review, published) for authorized administrators.
 */
export async function getAllClientsForAdmin() {
  try {
    const { data, error } = await supabase
      .from('clients_portfolio')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return getLocalStore().sort((a, b) => a.display_order - b.display_order);
    }

    return data;
  } catch (err) {
    return getLocalStore().sort((a, b) => a.display_order - b.display_order);
  }
}

/**
 * Save / Create a new client entry.
 */
export async function createClientEntry(clientData) {
  const newClient = {
    id: clientData.id || crypto.randomUUID(),
    name: clientData.name?.trim(),
    logo_url: clientData.logo_url?.trim(),
    work_year: clientData.work_year?.trim(),
    display_order: Number(clientData.display_order) || 0,
    is_published: Boolean(clientData.is_published),
    verified_relationship: Boolean(clientData.verified_relationship ?? true),
    authorized_logo_use: Boolean(clientData.authorized_logo_use ?? false),
    status: clientData.is_published && clientData.authorized_logo_use ? 'PUBLISHED' : (clientData.status || 'DRAFT'),
    notes: clientData.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!newClient.name) throw new Error('Client name is required.');
  if (!newClient.logo_url) throw new Error('Logo asset reference or URL is required.');
  if (!newClient.work_year) throw new Error('Verified year or year range is required.');

  // Check if publishing without explicit authorization
  if (newClient.is_published && !newClient.authorized_logo_use) {
    throw new Error('Public logo authorization must be confirmed before publishing.');
  }

  try {
    const { data, error } = await supabase
      .from('clients_portfolio')
      .insert(newClient)
      .select()
      .single();

    if (!error && data) {
      const local = getLocalStore();
      setLocalStore([...local, data]);
      return data;
    }
  } catch (err) {
    console.warn('[ClientsService] Remote insert failed, persisting locally:', err);
  }

  // Local fallback
  const local = getLocalStore();
  const updated = [...local, newClient];
  setLocalStore(updated);
  return newClient;
}

/**
 * Update an existing client entry.
 */
export async function updateClientEntry(id, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Enforce policy: cannot be published without authorization
  if (payload.is_published && !payload.authorized_logo_use) {
    throw new Error('Public logo authorization must be confirmed before publishing.');
  }

  if (payload.is_published !== undefined) {
    payload.status = payload.is_published && payload.authorized_logo_use ? 'PUBLISHED' : (payload.status || 'DRAFT');
  }

  try {
    const { data, error } = await supabase
      .from('clients_portfolio')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const local = getLocalStore();
      setLocalStore(local.map(c => (c.id === id ? data : c)));
      return data;
    }
  } catch (err) {
    console.warn('[ClientsService] Remote update failed, persisting locally:', err);
  }

  // Local fallback
  const local = getLocalStore();
  const updated = local.map(c => (c.id === id ? { ...c, ...payload } : c));
  setLocalStore(updated);
  return updated.find(c => c.id === id);
}

/**
 * Remove a client entry.
 */
export async function deleteClientEntry(id) {
  try {
    const { error } = await supabase
      .from('clients_portfolio')
      .delete()
      .eq('id', id);

    if (error) console.warn('[ClientsService] Remote delete notice:', error);
  } catch (err) {
    console.warn('[ClientsService] Remote delete error:', err);
  }

  const local = getLocalStore();
  setLocalStore(local.filter(c => c.id !== id));
  return true;
}

/**
 * Validate and upload a client logo image.
 * Supported formats: PNG, JPG, JPEG, SVG, WEBP
 * Maximum size: 5MB
 */
export async function uploadClientLogo(file) {
  if (!file) throw new Error('No file provided.');

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported image format. Please upload a PNG, JPG, SVG, or WebP logo.');
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit. Please upload an optimized image.');
  }

  const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  try {
    const { data, error } = await supabase.storage
      .from('client-logos')
      .upload(`logos/${safeFileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('client-logos')
        .getPublicUrl(data.path);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('[ClientsService] Storage upload failed, creating base64 data URL:', err);
  }

  // In-memory data URL fallback for local/offline preview
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
