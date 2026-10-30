-- Migration: 20261030140000_expand_clients_portfolio_with_new_candidates.sql
-- Description: Expand clients_portfolio with newly audited historical candidates (Foundations Academy, Doves Funeral Parlour Rebranding, Talent Centre, Pameltech Labs) and enforce duplicate prevention.

-- Duplicate prevention unique index on client name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portfolio_unique_name 
  ON public.clients_portfolio (LOWER(TRIM(name)));

-- Seed candidates 9 through 12 in DRAFT status, unpublished, unauthorized pending administrative approval
INSERT INTO public.clients_portfolio (id, name, logo_url, work_year, display_order, is_published, verified_relationship, authorized_logo_use, status, notes)
VALUES
  ('c1000000-0000-0000-0000-000000000009', 'Foundations Academy', '/assets/images/foundations-academy-logo.jpg', '2024–2025', 9, false, true, false, 'DRAFT', 'Counselling and educational platform development (academyfoundations.com). Completed client engagement with verified online presence and counselling workflow architecture. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000010', 'Doves Funeral Parlour — Rebranding', '/assets/images/doves-funeral-logo.png', '2022–2023', 10, false, true, false, 'DRAFT', 'Historical client engagement via Themaplin Inc Group for corporate rebranding and visual identity design. Strictly distinguished from ongoing Ralion OS SaaS software subscriptions. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000011', 'Talent Centre', '/assets/images/talent-centre-logo.png', '2024', 11, false, true, false, 'DRAFT', 'Training and management consultancy online presence and corporate platform at talentcentre.co.za. Verified completed engagement. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000012', 'Pameltech Labs', '/assets/images/pameltech-labs-logo.png', '2026', 12, false, true, false, 'DRAFT', 'Enterprise systems engineering and technology innovation platform at pameltechlabs.com. Verified completed engagement. Awaiting admin logo use signoff and publishing approval.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  work_year = EXCLUDED.work_year,
  display_order = EXCLUDED.display_order,
  is_published = EXCLUDED.is_published,
  verified_relationship = EXCLUDED.verified_relationship,
  authorized_logo_use = EXCLUDED.authorized_logo_use,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();
