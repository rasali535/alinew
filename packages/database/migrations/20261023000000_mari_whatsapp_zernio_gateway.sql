-- =====================================================================
-- Ralion OS — Mari Central WhatsApp Gateway & Conversation Engine
-- Migration: 20261023000000_mari_whatsapp_zernio_gateway.sql
-- Ras Ali Labs (Pty) Ltd
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. WhatsApp Conversations (Durable Multi-Tenant Conversation Context)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL UNIQUE,             -- Provider conversation ID or sender phone number
    sender_phone TEXT NOT NULL,                        -- Sender E.164 phone number
    sender_name TEXT,                                  -- Sender profile name
    mode TEXT NOT NULL DEFAULT 'PUBLIC_ASSISTANT' CHECK (mode IN ('PUBLIC_ASSISTANT', 'REGISTERED_USER', 'BUSINESS_CUSTOMER')),
    
    -- Scoping for Mode B (Registered User) & Mode C (Business Customer)
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Scoping for Mode C (Business Customer Enquiry Reference)
    enquiry_reference_code TEXT,
    
    -- Session & Conversation State
    current_intent TEXT,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON public.whatsapp_conversations(sender_phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_ws ON public.whatsapp_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org ON public.whatsapp_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_user ON public.whatsapp_conversations(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_mode ON public.whatsapp_conversations(mode);

-- =====================================================================
-- 3. WhatsApp Messages Ledger (Immutable Inbound / Outbound Records)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_ref UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    provider_message_id TEXT NOT NULL UNIQUE,         -- Idempotency key to deduplicate incoming webhooks
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    sender_phone TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    status TEXT NOT NULL DEFAULT 'DELIVERED' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
    delivery_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.whatsapp_messages(conversation_ref);
CREATE INDEX IF NOT EXISTS idx_wa_msg_prov_id ON public.whatsapp_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON public.whatsapp_messages(created_at DESC);

-- =====================================================================
-- 4. WhatsApp Account Linking Challenges (Secure User Account Linking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_account_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REVOKED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_links_user ON public.whatsapp_account_links(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_links_phone ON public.whatsapp_account_links(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_links_code ON public.whatsapp_account_links(verification_code);

-- =====================================================================
-- 5. Business Customer Enquiry References (Mode C Routing Identifiers)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_business_enquiry_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    reference_code TEXT NOT NULL UNIQUE,             -- e.g. "REF-PRO123"
    business_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_quotations BOOLEAN NOT NULL DEFAULT true,
    welcome_message TEXT,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_enquiry_code ON public.whatsapp_business_enquiry_refs(reference_code);
CREATE INDEX IF NOT EXISTS idx_wa_enquiry_ws ON public.whatsapp_business_enquiry_refs(workspace_id);

-- =====================================================================
-- 6. WhatsApp Retail Quotation Drafts (Incoming WhatsApp RFQ Inbox)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_quotation_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    raw_enquiry_text TEXT NOT NULL,
    source_media_url TEXT,
    extracted_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    retail_quotation_id UUID REFERENCES public.retail_quotations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'AWAITING_REVIEW' CHECK (status IN ('AWAITING_REVIEW', 'APPROVED', 'SENT', 'REJECTED')),
    reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_quotes_ws ON public.whatsapp_quotation_drafts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wa_quotes_status ON public.whatsapp_quotation_drafts(status);

-- =====================================================================
-- 7. Row Level Security (RLS) Configuration
-- =====================================================================
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_business_enquiry_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_quotation_drafts ENABLE ROW LEVEL SECURITY;

-- 7.1 Service role has full access
CREATE POLICY "wa_conv_service_role" ON public.whatsapp_conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "wa_msg_service_role" ON public.whatsapp_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "wa_links_service_role" ON public.whatsapp_account_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "wa_refs_service_role" ON public.whatsapp_business_enquiry_refs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "wa_quotes_service_role" ON public.whatsapp_quotation_drafts FOR ALL USING (auth.role() = 'service_role');

-- 7.2 Authenticated workspace members can view their workspace-scoped records
CREATE POLICY "wa_links_user_own" ON public.whatsapp_account_links FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "wa_refs_ws_members" ON public.whatsapp_business_enquiry_refs FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "wa_quotes_ws_members" ON public.whatsapp_quotation_drafts FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

GRANT ALL ON public.whatsapp_conversations TO service_role;
GRANT ALL ON public.whatsapp_messages TO service_role;
GRANT ALL ON public.whatsapp_account_links TO service_role;
GRANT ALL ON public.whatsapp_business_enquiry_refs TO service_role;
GRANT ALL ON public.whatsapp_quotation_drafts TO service_role;

GRANT SELECT ON public.whatsapp_account_links TO authenticated;
GRANT SELECT ON public.whatsapp_business_enquiry_refs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_quotation_drafts TO authenticated;
