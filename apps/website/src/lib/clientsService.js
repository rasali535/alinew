/**
 * Authoritative Client Portfolio Data & Management Service for Ras Ali Labs
 * Enforces:
 * 1. Public client cards display ONLY official logos and verified year/years of completed work.
 * 2. Strict segregation: Confirmed Ras Ali Labs clients vs Ralion OS subscribers vs Demo users.
 * 3. Only database records that are verified, authorized, and actively published are returned.
 * 4. Fail-closed: No localStorage persistence or fallback mock data in production retrieval.
 * 5. Durable storage: Logo uploads use Supabase Storage; no base64 fallback.
 */

import { supabase } from './supabase';

/**
 * Discovered client candidates catalog (Reference only).
 * All discovered clients are held in DRAFT or NEEDS_REVIEW in the database
 * until explicitly authorized and approved by an administrator.
 */
export const DISCOVERED_CLIENT_CANDIDATES = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Pula Pitch',
    logo_url: '/assets/images/pula-pitch-logo.jpg',
    work_year: '2024',
    display_order: 1,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: '13-episode Botswana television series with lead videography, set design, pre-production and post-production. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'The Melody Gospel TV Show',
    logo_url: '/assets/images/melody-logo.jpg',
    work_year: '2015–2022',
    display_order: 2,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Long-running gospel television production with music direction, sound engineering, rehearsal and performance planning. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Pameltex',
    logo_url: '/assets/images/pameltex-logo.png',
    work_year: '2023',
    display_order: 3,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Industrial digital platform at pameltex.com, responsive corporate platform with product information architecture. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Lebville Boutique',
    logo_url: '/assets/images/lebville-logo.png',
    work_year: '2024',
    display_order: 4,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Fashion boutique storefront and responsive e-commerce platform at lebvilleboutique.com. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Eagle Touch Tours',
    logo_url: '/assets/images/eagle-touch-logo.png',
    work_year: '2023–2024',
    display_order: 5,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Victoria Falls travel and tourism website at eagletouchtours.com. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'BB Travel Tours',
    logo_url: '/assets/images/bb-travel-logo.jpg',
    work_year: '2023–2024',
    display_order: 6,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Victoria Falls activities and travel services platform at bbtraveltours.com. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    name: 'Peregrine Tours and Safaris',
    logo_url: '/assets/images/peregrine-logo.png',
    work_year: '2024',
    display_order: 7,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Tours and safari digital platform delivering travel services presentation and destination experiences. Awaiting admin logo use signoff and publishing approval.'
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
  },
  {
    id: 'c1000000-0000-0000-0000-000000000009',
    name: 'Foundations Academy',
    logo_url: '/assets/images/foundations-academy-logo.jpg',
    work_year: '2024–2025',
    display_order: 9,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Counselling and educational platform development (academyfoundations.com). Completed client engagement with verified online presence and counselling workflow architecture. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000010',
    name: 'Doves Funeral Parlour — Rebranding',
    logo_url: '/assets/images/doves-funeral-logo.png',
    work_year: '2022–2023',
    display_order: 10,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Historical client engagement via Themaplin Inc Group for corporate rebranding and visual identity design. Strictly distinguished from ongoing Ralion OS SaaS software subscriptions. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000011',
    name: 'Talent Centre',
    logo_url: '/assets/images/talent-centre-logo.png',
    work_year: '2024',
    display_order: 11,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Training and management consultancy online presence and corporate platform at talentcentre.co.za. Verified completed engagement. Awaiting admin logo use signoff and publishing approval.'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000012',
    name: 'Pameltech Labs',
    logo_url: '/assets/images/pameltech-labs-logo.png',
    work_year: '2026',
    display_order: 12,
    is_published: false,
    verified_relationship: true,
    authorized_logo_use: false,
    status: 'DRAFT',
    notes: 'Enterprise systems engineering and technology innovation platform at pameltechlabs.com. Verified completed engagement. Awaiting admin logo use signoff and publishing approval.'
  }
];

/**
 * Fetch published, authorized clients for the public portfolio.
 * Strict fail-closed: Queries database only.
 * No localStorage fallback, no automatic republishing of mock data.
 */
export async function getPublishedClients() {
  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('Database connection unconfigured: Supabase client unavailable.');
  }

  const { data, error } = await supabase
    .from('clients_portfolio')
    .select('id, name, logo_url, work_year, display_order')
    .eq('is_published', true)
    .eq('authorized_logo_use', true)
    .eq('verified_relationship', true)
    .eq('status', 'PUBLISHED')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[ClientsService] Database query error fetching published clients:', error);
    throw new Error(`Database query error: ${error.message || 'Failed to fetch public clients'}`);
  }

  return data || [];
}

/**
 * Fetch all client entries (drafts, review, published) for authorized administrators.
 * Strict fail-closed: Queries database only.
 */
export async function getAllClientsForAdmin() {
  const { data, error } = await supabase
    .from('clients_portfolio')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[ClientsService] Database error fetching admin clients:', error);
    throw new Error(`Database error: ${error.message || 'Failed to fetch clients list'}`);
  }

  return data || [];
}

/**
 * Save / Create a new client entry.
 * Direct database write. Reports actual database success or failure.
 * Includes automated duplicate prevention.
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

  // Strict invariant: cannot be published without explicit logo authorization
  if (newClient.is_published && !newClient.authorized_logo_use) {
    throw new Error('Public logo authorization must be confirmed before publishing.');
  }

  // Duplicate client record prevention
  const { data: existingClients, error: checkError } = await supabase
    .from('clients_portfolio')
    .select('id, name');

  if (!checkError && Array.isArray(existingClients)) {
    const duplicate = existingClients.find(
      (c) => c.name.trim().toLowerCase() === newClient.name.toLowerCase() && c.id !== newClient.id
    );
    if (duplicate) {
      throw new Error(`A client record with the name "${newClient.name}" already exists.`);
    }
  }

  const { data, error } = await supabase
    .from('clients_portfolio')
    .insert(newClient)
    .select()
    .single();

  if (error) {
    console.error('[ClientsService] Database error inserting client:', error);
    throw new Error(`Failed to create client entry in database: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing client entry.
 * Direct database update. Reports actual database success or failure.
 */
export async function updateClientEntry(id, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Duplicate name check if name is being changed
  if (payload.name) {
    const trimmedName = payload.name.trim();
    payload.name = trimmedName;
    const { data: existingClients, error: checkError } = await supabase
      .from('clients_portfolio')
      .select('id, name');

    if (!checkError && Array.isArray(existingClients)) {
      const duplicate = existingClients.find(
        (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== id
      );
      if (duplicate) {
        throw new Error(`A client record with the name "${trimmedName}" already exists.`);
      }
    }
  }

  // Enforce policy: cannot be published without authorization
  if (payload.is_published && !payload.authorized_logo_use) {
    throw new Error('Public logo authorization must be confirmed before publishing.');
  }

  if (payload.is_published !== undefined) {
    payload.status = payload.is_published && payload.authorized_logo_use ? 'PUBLISHED' : (payload.status || 'DRAFT');
  }

  const { data, error } = await supabase
    .from('clients_portfolio')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ClientsService] Database error updating client:', error);
    throw new Error(`Failed to update client entry in database: ${error.message}`);
  }

  return data;
}

/**
 * Remove a client entry.
 * Direct database delete. Reports actual database success or failure.
 */
export async function deleteClientEntry(id) {
  const { error } = await supabase
    .from('clients_portfolio')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[ClientsService] Database error deleting client:', error);
    throw new Error(`Failed to delete client entry from database: ${error.message}`);
  }

  return true;
}

/**
 * Validate and upload a client logo image.
 * Uses durable Supabase Storage bucket 'client-logos'.
 * Supported formats: PNG, JPG, JPEG, SVG, WEBP.
 * Maximum size: 5MB.
 * Fails closed on error: NO base64 data URL substitution.
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

  const { data, error } = await supabase.storage
    .from('client-logos')
    .upload(`logos/${safeFileName}`, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('[ClientsService] Storage upload failed:', error);
    throw new Error(`Durable logo upload failed: ${error.message || 'Unable to store file'}`);
  }

  if (!data?.path) {
    throw new Error('Storage upload failed: No storage object path returned.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('client-logos')
    .getPublicUrl(data.path);

  if (!publicUrlData?.publicUrl) {
    throw new Error('Failed to resolve durable storage public URL for uploaded logo.');
  }

  return publicUrlData.publicUrl;
}
