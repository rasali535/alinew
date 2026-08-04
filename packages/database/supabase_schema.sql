-- =====================================================================
-- Ralion OS — Supabase Cloud Backbone DDL & Row Level Security (RLS) Schema
-- Developed by Ras Ali Labs
-- PostgreSQL Schema with Multi-Workspace Isolation, pgvector, and OAuth Vault
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Organizations & Workspaces
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'PROFESSIONAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    industry TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMINISTRATOR', 'MARKETING_MANAGER', 'SALES', 'HR', 'FINANCE', 'DEVELOPER', 'VIEWER')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 3. Business Profile & Intelligence Store
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    registration_number TEXT,
    industry TEXT,
    country TEXT,
    address TEXT,
    mission TEXT,
    vision TEXT,
    brand_voice TEXT,
    brand_colors TEXT[],
    target_audience TEXT,
    languages TEXT[],
    website_url TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    competitors TEXT[],
    business_goals TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Social Integration OAuth Token Vault
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    account_id TEXT NOT NULL,
    account_name TEXT,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    permissions TEXT[],
    expires_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'CONNECTED',
    connection_health TEXT DEFAULT 'HEALTHY',
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, provider, account_id)
);

-- 5. CRM Engine (Customers, Deals, Tasks, Activities)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    category TEXT DEFAULT 'SMB',
    deal_value NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company_name TEXT,
    value NUMERIC(12,2) NOT NULL DEFAULT 0,
    stage TEXT DEFAULT 'LEAD',
    probability INT DEFAULT 50,
    expected_close_date DATE,
    assigned_to TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    project TEXT DEFAULT 'General',
    status TEXT DEFAULT 'TODO',
    priority TEXT DEFAULT 'MEDIUM',
    assigned_to TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Marketing Engine (Campaigns, Posts, Media)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_platform TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    budget NUMERIC(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MARI AI Memory & Vector Knowledge Graph
CREATE TABLE IF NOT EXISTS ai_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    confidence NUMERIC(3,2) DEFAULT 0.95,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'QUEUED',
    input_prompt TEXT NOT NULL,
    output_result TEXT,
    media_url TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- 9. Row Level Security Policies (Workspace Isolation)
CREATE POLICY "Users access member workspaces" ON workspaces
    FOR ALL USING (
        id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Workspace data isolation" ON customers
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Social OAuth Vault isolation" ON social_accounts
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "AI Memory isolation" ON ai_memory
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );
