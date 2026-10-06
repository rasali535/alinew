-- Schema-only prerequisite baseline captured from production on 2026-10-06.
-- Runs before the first recorded September migration so clean previews can replay.
-- Contains no customer rows, auth users, credentials, or provider seed data.
-- Existing objects are preserved; this is not a production schema reset.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public."ai_jobs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid,
  "job_type" text NOT NULL,
  "status" text DEFAULT 'QUEUED'::text,
  "input_prompt" text NOT NULL,
  "output_result" text,
  "media_url" text,
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone
);
ALTER TABLE public."ai_jobs" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ai_memory" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid,
  "category" text NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1536),
  "confidence" numeric(3,2) DEFAULT 0.95,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."ai_memory" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."audit_logs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid,
  "user_id" uuid,
  "action" text NOT NULL,
  "module" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "workspace_id" uuid
);
ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."billing_checkout_references" (
  "reference" text NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" text,
  "user_id" text,
  "plan_id" text NOT NULL,
  "billing_cycle" text DEFAULT 'monthly'::text NOT NULL,
  "provider" text DEFAULT 'paypal'::text NOT NULL,
  "provider_subscription_id" text,
  "status" text DEFAULT 'PENDING'::text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."billing_checkout_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."billing_checkout_references" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."billing_webhook_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "resource_id" text,
  "organization_id" uuid,
  "status" text NOT NULL,
  "signature_valid" boolean DEFAULT false NOT NULL,
  "payload_hash" text,
  "error" text,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE public."billing_webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."billing_webhook_events" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."business_profiles" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid,
  "business_name" text NOT NULL,
  "registration_number" text,
  "industry" text,
  "country" text,
  "address" text,
  "mission" text,
  "vision" text,
  "brand_voice" text,
  "brand_colors" text[],
  "target_audience" text,
  "languages" text[],
  "website_url" text,
  "social_links" jsonb DEFAULT '{}'::jsonb,
  "competitors" text[],
  "business_goals" text[],
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."business_profiles" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."calendar_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "organization_id" uuid,
  "title" text NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone,
  "category" text DEFAULT 'MEETING'::text NOT NULL,
  "attendees" text[] DEFAULT '{}'::text[] NOT NULL,
  "location" text,
  "notes" text,
  "related_customer_id" uuid,
  "related_deal_id" uuid,
  "related_task_id" uuid,
  "reminder_minutes" integer,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."calendar_events" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."customers" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "company" text,
  "email" text NOT NULL,
  "phone" text,
  "address" text,
  "category" text DEFAULT 'SMB'::text,
  "deal_value" numeric(12,2) DEFAULT 0,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."deals" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "title" text NOT NULL,
  "company_name" text,
  "value" numeric(12,2) DEFAULT 0 NOT NULL,
  "stage" text DEFAULT 'LEAD'::text,
  "probability" integer DEFAULT 50,
  "expected_close_date" date,
  "assigned_to" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "customer_id" uuid,
  "contact_name" text,
  "email" text,
  "phone" text,
  "deal_type" text DEFAULT 'LEAD'::text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "ai_score" integer DEFAULT 50 NOT NULL,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."deals" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."desktop_events" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "device_id" text NOT NULL,
  "organization_id" uuid,
  "user_id" uuid,
  "event_type" text NOT NULL,
  "app_version" text,
  "platform" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."desktop_events" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."developer_api_key_rate_limits" (
  "api_key_id" uuid NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL
);
ALTER TABLE public."developer_api_key_rate_limits" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."developer_api_keys" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL,
  "scopes" text[] DEFAULT ARRAY['read'::text],
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "revoked_at" timestamp with time zone,
  "rotated_at" timestamp with time zone,
  "environment" text DEFAULT 'live'::text NOT NULL,
  "rate_limit_per_minute" integer DEFAULT 60 NOT NULL,
  "workspace_id" uuid NOT NULL
);
ALTER TABLE public."developer_api_keys" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."devices" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "organization_id" uuid,
  "device_id" text NOT NULL,
  "platform" text,
  "version" text,
  "last_seen" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."devices" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."document_chunks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE(content, ''::text))) STORED,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."document_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."document_chunks" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "organization_id" uuid,
  "name" text NOT NULL,
  "file_path" text NOT NULL,
  "category" text DEFAULT 'GENERAL'::text NOT NULL,
  "mime_type" text,
  "size_bytes" bigint DEFAULT 0 NOT NULL,
  "rag_status" text DEFAULT 'PENDING'::text NOT NULL,
  "extracted_text" text,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."documents" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."download_releases" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "product_id" uuid NOT NULL,
  "version" text NOT NULL,
  "platform" text NOT NULL,
  "download_url" text NOT NULL,
  "file_size_mb" numeric(10,2),
  "checksum" text,
  "release_notes" text,
  "is_latest" boolean DEFAULT false,
  "released_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."download_releases" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."downloads" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "release_id" uuid,
  "user_id" uuid,
  "platform" text,
  "ip_hash" text,
  "downloaded_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."downloads" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."enterprise_sso_configs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "metadata_url" text,
  "domain_allowlist" text[],
  "enabled" boolean DEFAULT false,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."enterprise_sso_configs" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."features" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "module" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."features" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."government_citizen_cases" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "reference_no" text DEFAULT ('GOV-CASE-'::text || "substring"((uuid_generate_v4())::text, 1, 8)),
  "citizen_name" text NOT NULL,
  "national_id" text,
  "contact_phone" text,
  "ministry" text DEFAULT 'Ministry of Infrastructure'::text,
  "case_type" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'submitted'::text,
  "assigned_officer_id" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."government_citizen_cases" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."growth_campaigns" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "objective" text,
  "target_audience" jsonb DEFAULT '{}'::jsonb,
  "platforms" text[],
  "start_date" date,
  "end_date" date,
  "budget" numeric(12,2),
  "status" text DEFAULT 'planning'::text,
  "ai_generated" boolean DEFAULT false,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."growth_campaigns" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."growth_content" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "platform" text NOT NULL,
  "media_urls" text[],
  "hashtags" text[],
  "campaign_id" uuid,
  "status" text DEFAULT 'draft'::text,
  "scheduled_at" timestamp with time zone,
  "published_at" timestamp with time zone,
  "engagement_likes" integer DEFAULT 0,
  "engagement_comments" integer DEFAULT 0,
  "engagement_shares" integer DEFAULT 0,
  "engagement_reach" integer DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."growth_content" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."health_appointments" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "professional_id" uuid,
  "appointment_date" timestamp with time zone NOT NULL,
  "duration_minutes" integer DEFAULT 60,
  "type" text DEFAULT 'session'::text,
  "status" text DEFAULT 'scheduled'::text,
  "notes" text,
  "reminder_sent" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."health_appointments" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."health_cases" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "assigned_professional_id" uuid,
  "title" text NOT NULL,
  "presenting_issue" text,
  "case_notes" text,
  "progress" text,
  "status" text DEFAULT 'open'::text,
  "opened_at" date DEFAULT CURRENT_DATE,
  "closed_at" date,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."health_cases" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."health_clients" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "date_of_birth" date,
  "gender" text,
  "phone" text,
  "email" text,
  "address" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "intake_date" date,
  "status" text DEFAULT 'active'::text,
  "assigned_professional_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."health_clients" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."licenses" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "license_key" text NOT NULL,
  "status" text DEFAULT 'active'::text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "user_id" uuid,
  "license_type" text DEFAULT 'standard'::text,
  "plan" text DEFAULT 'community'::text
);
ALTER TABLE public."licenses" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."logistics_drivers" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "phone" text,
  "email" text,
  "license_number" text,
  "license_expiry" date,
  "status" text DEFAULT 'active'::text,
  "performance_rating" numeric(3,1),
  "total_deliveries" integer DEFAULT 0,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."logistics_drivers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."logistics_shipments" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "tracking_number" text DEFAULT ('SHP-'::text || "substring"((uuid_generate_v4())::text, 1, 8)) NOT NULL,
  "customer_id" uuid,
  "vehicle_id" uuid,
  "driver_id" uuid,
  "origin" text NOT NULL,
  "destination" text NOT NULL,
  "status" text DEFAULT 'created'::text,
  "weight_kg" numeric(10,2),
  "customs_cleared" boolean DEFAULT false,
  "documents" jsonb DEFAULT '[]'::jsonb,
  "estimated_delivery" date,
  "actual_delivery" timestamp with time zone,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."logistics_shipments" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."logistics_tracking_events" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "shipment_id" uuid NOT NULL,
  "status" text NOT NULL,
  "location" text,
  "notes" text,
  "recorded_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."logistics_tracking_events" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."logistics_vehicles" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "registration" text NOT NULL,
  "make" text,
  "model" text,
  "year" integer,
  "vehicle_type" text,
  "status" text DEFAULT 'active'::text,
  "assigned_driver_id" uuid,
  "last_maintenance_date" date,
  "next_maintenance_due" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."logistics_vehicles" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_activity_logs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid,
  "query" text NOT NULL,
  "agent_used" text,
  "data_sources_accessed" text[],
  "response_summary" text,
  "tokens_used" integer DEFAULT 0,
  "duration_ms" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."mari_activity_logs" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_api_keys" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_by" uuid,
  "name" text NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL,
  "scopes" text[] DEFAULT ARRAY['intelligence:read'::text, 'knowledge:read'::text] NOT NULL,
  "status" text DEFAULT 'ACTIVE'::text NOT NULL,
  "monthly_request_limit" integer DEFAULT 1000 NOT NULL,
  "monthly_credit_limit" integer DEFAULT 1000 NOT NULL,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "last_used_ip_hash" text,
  "request_count" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_api_keys" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_api_usage" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "request_id" text NOT NULL,
  "endpoint" text NOT NULL,
  "status_code" integer NOT NULL,
  "prompt_tokens" integer DEFAULT 0 NOT NULL,
  "completion_tokens" integer DEFAULT 0 NOT NULL,
  "total_tokens" integer DEFAULT 0 NOT NULL,
  "credits_used" integer DEFAULT 0 NOT NULL,
  "rag_chunks" integer DEFAULT 0 NOT NULL,
  "model" text,
  "latency_ms" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_api_usage" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_competitor_briefings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "summary" text NOT NULL,
  "market_moves" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "market_gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "recommended_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_observation_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_competitor_briefings" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_competitor_observations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "competitor_id" uuid NOT NULL,
  "source_type" text NOT NULL,
  "source_url" text NOT NULL,
  "observation_type" text NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "evidence_excerpt" text,
  "content_hash" text NOT NULL,
  "confidence" numeric(4,3) NOT NULL,
  "is_inference" boolean DEFAULT false NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_competitor_observations" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_competitor_watchlist" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "name" text NOT NULL,
  "website_url" text NOT NULL,
  "meta_ad_library_url" text,
  "google_business_url" text,
  "notes" text,
  "status" text DEFAULT 'ACTIVE'::text NOT NULL,
  "scan_frequency" text DEFAULT 'WEEKLY'::text NOT NULL,
  "last_scanned_at" timestamp with time zone,
  "next_scan_at" timestamp with time zone,
  "last_scan_status" text,
  "last_scan_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_competitor_watchlist" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_conversations" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text DEFAULT 'New Conversation'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."mari_conversations" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_embed_widgets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_by" uuid,
  "name" text NOT NULL,
  "public_token" text NOT NULL,
  "allowed_domains" text[] NOT NULL,
  "assistant_name" text DEFAULT 'Mari'::text NOT NULL,
  "welcome_message" text DEFAULT 'Hi! I’m Mari. How can I help?'::text NOT NULL,
  "accent_color" text DEFAULT '#7c3aed'::text NOT NULL,
  "position" text DEFAULT 'bottom-right'::text NOT NULL,
  "status" text DEFAULT 'ACTIVE'::text NOT NULL,
  "monthly_request_limit" integer DEFAULT 1000 NOT NULL,
  "request_count" bigint DEFAULT 0 NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_embed_widgets" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_knowledge" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "source_type" text NOT NULL,
  "source_id" uuid,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1536),
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."mari_knowledge" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_marketing_experiments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_by" uuid,
  "source_type" text NOT NULL,
  "source_id" text,
  "hypothesis" text NOT NULL,
  "content_type" text,
  "objective" text,
  "audience" text,
  "variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'OBSERVED'::text NOT NULL,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_marketing_experiments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mari_marketing_experiments" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_marketing_learnings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "learning_key" text NOT NULL,
  "category" text NOT NULL,
  "claim" text NOT NULL,
  "evidence_summary" text NOT NULL,
  "confidence" numeric(4,3) NOT NULL,
  "evidence_count" integer DEFAULT 0 NOT NULL,
  "supporting_experiment_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "contradicting_experiment_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "status" text DEFAULT 'EMERGING'::text NOT NULL,
  "first_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_marketing_learnings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mari_marketing_learnings" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_marketing_outcomes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "experiment_id" uuid NOT NULL,
  "metric_window_days" integer DEFAULT 30 NOT NULL,
  "impressions" bigint,
  "reach" bigint,
  "reactions" bigint DEFAULT 0 NOT NULL,
  "comments" bigint DEFAULT 0 NOT NULL,
  "shares" bigint DEFAULT 0 NOT NULL,
  "clicks" bigint,
  "leads" bigint,
  "conversions" bigint,
  "spend" numeric(14,2),
  "revenue" numeric(14,2),
  "engagement" bigint DEFAULT 0 NOT NULL,
  "engagement_rate_pct" numeric(10,4),
  "raw_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metrics_hash" text
);
ALTER TABLE public."mari_marketing_outcomes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mari_marketing_outcomes" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_messages" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "tokens_used" integer DEFAULT 0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."mari_messages" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_settings" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "ai_enabled" boolean DEFAULT true,
  "data_sources" jsonb DEFAULT '{"tasks": true, "reports": true, "customers": true, "documents": true}'::jsonb,
  "privacy_mode" boolean DEFAULT false,
  "usage_limit_daily" integer DEFAULT 1000,
  "model_preference" text DEFAULT 'gemini/gemini-2.0-flash'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."mari_settings" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_voice_usage_sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid,
  "user_id" text,
  "session_id" text NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "ended_at" timestamp with time zone NOT NULL,
  "duration_ms" bigint DEFAULT 0 NOT NULL,
  "user_turns" integer DEFAULT 0 NOT NULL,
  "assistant_turns" integer DEFAULT 0 NOT NULL,
  "input_tokens" bigint DEFAULT 0 NOT NULL,
  "output_tokens" bigint DEFAULT 0 NOT NULL,
  "input_audio_tokens" bigint DEFAULT 0 NOT NULL,
  "output_audio_tokens" bigint DEFAULT 0 NOT NULL,
  "model" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_voice_usage_sessions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_widget_sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "widget_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "origin" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "request_count" bigint DEFAULT 0 NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_widget_sessions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_widget_usage" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "widget_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "request_id" text NOT NULL,
  "session_fingerprint" text NOT NULL,
  "status_code" integer NOT NULL,
  "prompt_tokens" integer DEFAULT 0 NOT NULL,
  "completion_tokens" integer DEFAULT 0 NOT NULL,
  "total_tokens" integer DEFAULT 0 NOT NULL,
  "credits_used" integer DEFAULT 0 NOT NULL,
  "model" text,
  "latency_ms" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."mari_widget_usage" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."mari_workflows" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "trigger" text NOT NULL,
  "conditions" jsonb DEFAULT '{}'::jsonb,
  "actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'active'::text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."mari_workflows" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."marketing_campaigns" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid,
  "title" text NOT NULL,
  "target_platform" text NOT NULL,
  "status" text DEFAULT 'DRAFT'::text,
  "budget" numeric(10,2) DEFAULT 0,
  "start_date" date,
  "end_date" date,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."marketing_campaigns" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."marketplace_items" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "type" text NOT NULL,
  "category" text DEFAULT 'general'::text,
  "description" text,
  "author" text DEFAULT 'Ras Ali Labs'::text,
  "price" numeric(10,2) DEFAULT 0.00,
  "currency" text DEFAULT 'BWP'::text,
  "rating" numeric(3,2) DEFAULT 5.0,
  "downloads_count" integer DEFAULT 0,
  "icon" text,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."marketplace_items" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."modules" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "version" text DEFAULT '1.0.0'::text,
  "icon" text,
  "category" text DEFAULT 'industry'::text,
  "required_edition" text DEFAULT 'professional'::text,
  "status" text DEFAULT 'available'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."modules" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."notifications" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "message" text,
  "type" text DEFAULT 'system'::text,
  "read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."organization_members" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role_id" uuid,
  "status" text DEFAULT 'active'::text,
  "joined_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."organization_members" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."organization_modules" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "module_id" uuid NOT NULL,
  "activated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "activated_by" uuid,
  "status" text DEFAULT 'active'::text
);
ALTER TABLE public."organization_modules" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."organizations" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo_url" text,
  "industry" text,
  "company_size" text,
  "country" text,
  "owner_id" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."payments" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "subscription_id" uuid,
  "amount" numeric(12,2) NOT NULL,
  "currency" text DEFAULT 'BWP'::text,
  "payment_provider" text NOT NULL,
  "transaction_id" text,
  "status" text DEFAULT 'pending'::text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payments" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."permissions" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "module" text NOT NULL,
  "description" text
);
ALTER TABLE public."permissions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."plan_features" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "plan_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "limit_value" integer DEFAULT '-1'::integer,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."plan_features" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."platform_admins" (
  "user_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "role" text DEFAULT 'PLATFORM_ADMIN'::text NOT NULL,
  "status" text DEFAULT 'ACTIVE'::text NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."platform_admins" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."products" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."products" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."profiles" (
  "id" uuid NOT NULL,
  "full_name" text,
  "avatar_url" text,
  "phone" text,
  "country" text,
  "timezone" text,
  "language" text DEFAULT 'en'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "email" text
);
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ralion_customers" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "company" text,
  "category" text,
  "status" text DEFAULT 'active'::text,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."ralion_customers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ralion_documents" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "file_path" text NOT NULL,
  "category" text,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."ralion_documents" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ralion_events" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "start_time" timestamp with time zone NOT NULL,
  "end_time" timestamp with time zone NOT NULL,
  "type" text DEFAULT 'Meeting'::text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."ralion_events" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ralion_leads" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "source" text,
  "status" text DEFAULT 'New'::text,
  "priority" text DEFAULT 'Medium'::text,
  "assigned_user" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."ralion_leads" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ralion_projects" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'Planning'::text,
  "start_date" date,
  "end_date" date,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."ralion_projects" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."ralion_tasks" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "project_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "assigned_to" uuid,
  "priority" text DEFAULT 'Medium'::text,
  "status" text DEFAULT 'Pending'::text,
  "due_date" date,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."ralion_tasks" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."registered_devices" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "license_id" uuid NOT NULL,
  "device_name" text NOT NULL,
  "device_identifier" text NOT NULL,
  "platform" text,
  "last_seen" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "device_id" text,
  "last_active" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "is_active" boolean DEFAULT true
);
ALTER TABLE public."registered_devices" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."releases" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "product_name" text DEFAULT 'Ralion'::text,
  "version" text NOT NULL,
  "platform" text NOT NULL,
  "architecture" text DEFAULT 'x64'::text,
  "release_type" text DEFAULT 'community'::text,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "file_size" bigint DEFAULT 0,
  "checksum" text,
  "release_notes" text,
  "is_latest" boolean DEFAULT false,
  "status" text DEFAULT 'published'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."releases" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."role_permissions" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL
);
ALTER TABLE public."role_permissions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."roles" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."roles" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_account_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "encrypted_access_token" text NOT NULL,
  "encrypted_refresh_token" text,
  "expires_at" timestamp with time zone,
  "scopes" text[],
  "account_handle" text,
  "account_label" text,
  "followers_count" bigint DEFAULT 0,
  "avatar_url" text,
  "page_id" text,
  "extra_meta" jsonb DEFAULT '{}'::jsonb,
  "status" text DEFAULT 'connected'::text NOT NULL,
  "connected_at" timestamp with time zone DEFAULT now(),
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "account_id" text,
  "access_token" text,
  "refresh_token" text,
  "token_expires_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public."social_account_tokens" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_accounts" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid,
  "provider" text NOT NULL,
  "account_id" text NOT NULL,
  "account_name" text,
  "encrypted_access_token" text NOT NULL,
  "encrypted_refresh_token" text,
  "permissions" text[],
  "expires_at" timestamp with time zone,
  "sync_status" text DEFAULT 'CONNECTED'::text,
  "connection_health" text DEFAULT 'HEALTHY'::text,
  "last_sync_at" timestamp with time zone DEFAULT now(),
  "infrastructure_provider" text DEFAULT 'native'::text NOT NULL,
  "zernio_account_id" text,
  "zernio_profile_id" text
);
ALTER TABLE public."social_accounts" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_connections" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "organization_id" uuid,
  "workspace_id" uuid,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "account_name" text NOT NULL,
  "username" text,
  "profile_image_url" text,
  "account_type" text DEFAULT 'PERSONAL'::text NOT NULL,
  "connection_status" text DEFAULT 'CONNECTED'::text NOT NULL,
  "token_status" text DEFAULT 'TOKEN_VALID'::text NOT NULL,
  "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "followers_count" bigint DEFAULT 0,
  "infrastructure_provider" text DEFAULT 'native'::text NOT NULL,
  "zernio_account_id" text,
  "zernio_profile_id" text,
  "last_sync_at" timestamp with time zone DEFAULT now(),
  "last_health_check_at" timestamp with time zone DEFAULT now(),
  "health_error_message" text,
  "connected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "disconnected_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."social_connections" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workspace_id" uuid,
  "title" text,
  "body" text NOT NULL,
  "media_urls" text[] DEFAULT '{}'::text[],
  "media_types" text[] DEFAULT '{}'::text[],
  "platforms" text[] NOT NULL,
  "status" text DEFAULT 'DRAFT'::text NOT NULL,
  "platform_post_ids" jsonb DEFAULT '{}'::jsonb,
  "platform_results" jsonb DEFAULT '{}'::jsonb,
  "scheduled_for" timestamp with time zone,
  "published_at" timestamp with time zone,
  "author_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "organization_id" text,
  "content_id" uuid,
  "social_connection_id" uuid
);
ALTER TABLE public."social_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."social_posts" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_provider_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "workspace_id" uuid,
  "user_id" uuid NOT NULL,
  "provider" text DEFAULT 'zernio'::text NOT NULL,
  "provider_profile_id" text NOT NULL,
  "profile_name" text NOT NULL,
  "status" text DEFAULT 'ACTIVE'::text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "account_id" text
);
ALTER TABLE public."social_provider_profiles" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_provider_routing" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid,
  "organization_id" uuid,
  "platform" text NOT NULL,
  "provider" text DEFAULT 'zernio'::text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 1 NOT NULL,
  "fallback_provider" text DEFAULT 'native'::text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."social_provider_routing" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_publish_idempotency" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "workspace_id" text NOT NULL,
  "destination" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "body_hash" text NOT NULL,
  "status" text DEFAULT 'CLAIMED'::text NOT NULL,
  "lease_token" text,
  "post_id" uuid,
  "external_receipt_id" text,
  "platform_results" jsonb DEFAULT '{}'::jsonb,
  "error_message" text,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "expires_at" timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."social_publish_idempotency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."social_publish_idempotency" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."social_webhook_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider" text DEFAULT 'zernio'::text NOT NULL,
  "event_type" text NOT NULL,
  "event_id" text,
  "provider_profile_id" text,
  "provider_account_id" text,
  "organization_id" uuid,
  "workspace_id" uuid,
  "signature_valid" boolean DEFAULT true NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "processed" boolean DEFAULT false NOT NULL,
  "processed_at" timestamp with time zone,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."social_webhook_events" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."subscription_plans" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric NOT NULL,
  "billing_cycle" text,
  "features" jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "slug" text,
  "currency" text DEFAULT 'BWP'::text,
  "limits" jsonb DEFAULT '{}'::jsonb,
  "is_public" boolean DEFAULT true,
  "trial_days" integer DEFAULT 0,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public."subscription_plans" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."subscriptions" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "plan_id" uuid NOT NULL,
  "status" text DEFAULT 'active'::text,
  "start_date" date NOT NULL,
  "end_date" date,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "edition" text DEFAULT 'community'::text,
  "trial_start" date,
  "trial_end" date,
  "subscription_start" date,
  "subscription_end" date,
  "payment_provider" text,
  "external_subscription_id" text,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "billing_cycle" text DEFAULT 'monthly'::text NOT NULL,
  "provider_customer_id" text,
  "provider_plan_id" text,
  "current_period_start" timestamp with time zone NOT NULL,
  "current_period_end" timestamp with time zone NOT NULL,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "canceled_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE public."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscriptions" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."tasks" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "title" text NOT NULL,
  "project" text DEFAULT 'General'::text,
  "status" text DEFAULT 'TODO'::text,
  "priority" text DEFAULT 'MEDIUM'::text,
  "assigned_to" text,
  "due_date" date,
  "created_at" timestamp with time zone DEFAULT now(),
  "description" text,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tasks" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."tenant_admin_state" (
  "organization_id" uuid NOT NULL,
  "status" text DEFAULT 'ACTIVE'::text NOT NULL,
  "suspension_reason" text,
  "suspended_at" timestamp with time zone,
  "suspended_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."tenant_admin_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_admin_state" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."tenant_credit_ledger" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid,
  "amount" integer NOT NULL,
  "balance_before" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "plan_credits_before" integer NOT NULL,
  "plan_credits_after" integer NOT NULL,
  "bonus_credits_before" integer NOT NULL,
  "bonus_credits_after" integer NOT NULL,
  "type" text NOT NULL,
  "source_feature" text,
  "provider" text,
  "model" text,
  "correlation_id" text,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."tenant_credit_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_credit_ledger" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."tenant_credit_reservations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid,
  "correlation_id" text NOT NULL,
  "amount" integer NOT NULL,
  "status" text NOT NULL,
  "source_feature" text NOT NULL,
  "provider" text,
  "model" text,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finalized_at" timestamp with time zone
);
ALTER TABLE public."tenant_credit_reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_credit_reservations" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."tenant_credit_wallets" (
  "organization_id" uuid NOT NULL,
  "plan_id" text NOT NULL,
  "monthly_quota" integer NOT NULL,
  "remaining_plan_credits" integer NOT NULL,
  "remaining_bonus_credits" integer DEFAULT 0 NOT NULL,
  "reserved_credits" integer DEFAULT 0 NOT NULL,
  "lifetime_credits_granted" bigint DEFAULT 0 NOT NULL,
  "lifetime_credits_consumed" bigint DEFAULT 0 NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "last_renewal_at" timestamp with time zone DEFAULT now() NOT NULL,
  "next_renewal_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."tenant_credit_wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_credit_wallets" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."trade_order_items" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "order_id" uuid NOT NULL,
  "product_id" uuid,
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" numeric(12,2) NOT NULL,
  "total_price" numeric(14,2) GENERATED ALWAYS AS (((quantity)::numeric * unit_price)) STORED,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."trade_order_items" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."trade_orders" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "supplier_id" uuid,
  "order_number" text DEFAULT ('ORD-'::text || "substring"((uuid_generate_v4())::text, 1, 8)),
  "status" text DEFAULT 'draft'::text,
  "total_amount" numeric(14,2),
  "currency" text DEFAULT 'BWP'::text,
  "notes" text,
  "expected_delivery" date,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."trade_orders" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."trade_products" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "supplier_id" uuid,
  "name" text NOT NULL,
  "sku" text,
  "description" text,
  "category" text,
  "unit_price" numeric(12,2),
  "currency" text DEFAULT 'BWP'::text,
  "unit" text DEFAULT 'unit'::text,
  "stock_quantity" integer DEFAULT 0,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."trade_products" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."trade_suppliers" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "contact_name" text,
  "email" text,
  "phone" text,
  "country" text,
  "category" text,
  "status" text DEFAULT 'active'::text,
  "rating" numeric(3,1),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."trade_suppliers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."usage_metrics" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "metric_name" text NOT NULL,
  "value" bigint DEFAULT 0,
  "period" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."usage_metrics" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."user_products" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "product_id" uuid NOT NULL,
  "organization_id" uuid,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."user_products" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."webhooks" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL,
  "url" text NOT NULL,
  "secret" text NOT NULL,
  "events" text[] NOT NULL,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."webhooks" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."workflow_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "trigger_event" text NOT NULL,
  "status" text DEFAULT 'RUNNING'::text NOT NULL,
  "input" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "output" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "error" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone
);
ALTER TABLE public."workflow_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."workflow_runs" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."workflows" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "organization_id" uuid,
  "name" text NOT NULL,
  "trigger_event" text NOT NULL,
  "actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "executions_count" integer DEFAULT 0 NOT NULL,
  "last_executed_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."workflows" FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."workspace_members" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "workspace_id" uuid,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."workspace_members" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public."workspaces" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "organization_id" uuid,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "industry" text,
  "owner_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."workspaces" ENABLE ROW LEVEL SECURITY;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ai_jobs'::regclass AND conname = 'ai_jobs_pkey') THEN ALTER TABLE public."ai_jobs" ADD CONSTRAINT "ai_jobs_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ai_memory'::regclass AND conname = 'ai_memory_pkey') THEN ALTER TABLE public."ai_memory" ADD CONSTRAINT "ai_memory_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND conname = 'audit_logs_pkey') THEN ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_reference_shape') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_reference_shape" CHECK (((reference ~~ 'ral_sub_%'::text) AND (char_length(reference) <= 64))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_references_billing_cycle_check') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_references_billing_cycle_check" CHECK ((billing_cycle = 'monthly'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_references_pkey') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_references_pkey" PRIMARY KEY (reference); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_references_plan_id_check') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_references_plan_id_check" CHECK ((plan_id = ANY (ARRAY['starter'::text, 'professional'::text, 'enterprise'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_references_provider_check') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_references_provider_check" CHECK ((provider = 'paypal'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_references_status_check') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_references_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'BOUND'::text, 'CONSUMED'::text, 'EXPIRED'::text, 'FAILED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_webhook_events'::regclass AND conname = 'billing_webhook_events_pkey') THEN ALTER TABLE public."billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_webhook_events'::regclass AND conname = 'billing_webhook_events_provider_event_id_key') THEN ALTER TABLE public."billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_provider_event_id_key" UNIQUE (provider, event_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_webhook_events'::regclass AND conname = 'billing_webhook_events_status_check') THEN ALTER TABLE public."billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_status_check" CHECK ((status = ANY (ARRAY['PROCESSING'::text, 'PROCESSED'::text, 'FAILED'::text, 'IGNORED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.business_profiles'::regclass AND conname = 'business_profiles_pkey') THEN ALTER TABLE public."business_profiles" ADD CONSTRAINT "business_profiles_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.business_profiles'::regclass AND conname = 'business_profiles_workspace_id_key') THEN ALTER TABLE public."business_profiles" ADD CONSTRAINT "business_profiles_workspace_id_key" UNIQUE (workspace_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_category_check') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_category_check" CHECK ((category = ANY (ARRAY['MEETING'::text, 'APPOINTMENT'::text, 'REMINDER'::text, 'DISPATCH'::text, 'DEADLINE'::text, 'OTHER'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_end_check') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_end_check" CHECK (((end_at IS NULL) OR (end_at >= start_at))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_pkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_reminder_check') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_reminder_check" CHECK (((reminder_minutes IS NULL) OR (reminder_minutes >= 0))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_pkey') THEN ALTER TABLE public."customers" ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.deals'::regclass AND conname = 'deals_ai_score_check') THEN ALTER TABLE public."deals" ADD CONSTRAINT "deals_ai_score_check" CHECK (((ai_score >= 0) AND (ai_score <= 100))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.deals'::regclass AND conname = 'deals_deal_type_check') THEN ALTER TABLE public."deals" ADD CONSTRAINT "deals_deal_type_check" CHECK ((deal_type = ANY (ARRAY['LEAD'::text, 'CUSTOMER'::text, 'SUPPLIER'::text, 'PARTNER'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.deals'::regclass AND conname = 'deals_pkey') THEN ALTER TABLE public."deals" ADD CONSTRAINT "deals_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.desktop_events'::regclass AND conname = 'desktop_events_event_type_check') THEN ALTER TABLE public."desktop_events" ADD CONSTRAINT "desktop_events_event_type_check" CHECK ((event_type = ANY (ARRAY['app_launched'::text, 'login'::text, 'logout'::text, 'sync_completed'::text, 'update_installed'::text, 'license_activated'::text, 'error'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.desktop_events'::regclass AND conname = 'desktop_events_pkey') THEN ALTER TABLE public."desktop_events" ADD CONSTRAINT "desktop_events_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_key_rate_limits'::regclass AND conname = 'developer_api_key_rate_limits_pkey') THEN ALTER TABLE public."developer_api_key_rate_limits" ADD CONSTRAINT "developer_api_key_rate_limits_pkey" PRIMARY KEY (api_key_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_key_rate_limits'::regclass AND conname = 'developer_api_key_rate_limits_request_count_check') THEN ALTER TABLE public."developer_api_key_rate_limits" ADD CONSTRAINT "developer_api_key_rate_limits_request_count_check" CHECK ((request_count >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_keys'::regclass AND conname = 'developer_api_keys_environment_check') THEN ALTER TABLE public."developer_api_keys" ADD CONSTRAINT "developer_api_keys_environment_check" CHECK ((environment = 'live'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_keys'::regclass AND conname = 'developer_api_keys_pkey') THEN ALTER TABLE public."developer_api_keys" ADD CONSTRAINT "developer_api_keys_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_keys'::regclass AND conname = 'developer_api_keys_rate_limit_check') THEN ALTER TABLE public."developer_api_keys" ADD CONSTRAINT "developer_api_keys_rate_limit_check" CHECK (((rate_limit_per_minute >= 1) AND (rate_limit_per_minute <= 10000))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.devices'::regclass AND conname = 'devices_device_id_key') THEN ALTER TABLE public."devices" ADD CONSTRAINT "devices_device_id_key" UNIQUE (device_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.devices'::regclass AND conname = 'devices_pkey') THEN ALTER TABLE public."devices" ADD CONSTRAINT "devices_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.document_chunks'::regclass AND conname = 'document_chunks_document_id_chunk_index_key') THEN ALTER TABLE public."document_chunks" ADD CONSTRAINT "document_chunks_document_id_chunk_index_key" UNIQUE (document_id, chunk_index); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.document_chunks'::regclass AND conname = 'document_chunks_pkey') THEN ALTER TABLE public."document_chunks" ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.documents'::regclass AND conname = 'documents_pkey') THEN ALTER TABLE public."documents" ADD CONSTRAINT "documents_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.documents'::regclass AND conname = 'documents_rag_status_check') THEN ALTER TABLE public."documents" ADD CONSTRAINT "documents_rag_status_check" CHECK ((rag_status = ANY (ARRAY['PENDING'::text, 'READY'::text, 'UNSUPPORTED'::text, 'FAILED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.download_releases'::regclass AND conname = 'download_releases_pkey') THEN ALTER TABLE public."download_releases" ADD CONSTRAINT "download_releases_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.download_releases'::regclass AND conname = 'download_releases_platform_check') THEN ALTER TABLE public."download_releases" ADD CONSTRAINT "download_releases_platform_check" CHECK ((platform = ANY (ARRAY['windows'::text, 'macos'::text, 'linux'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.download_releases'::regclass AND conname = 'download_releases_product_id_version_platform_key') THEN ALTER TABLE public."download_releases" ADD CONSTRAINT "download_releases_product_id_version_platform_key" UNIQUE (product_id, version, platform); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.downloads'::regclass AND conname = 'downloads_pkey') THEN ALTER TABLE public."downloads" ADD CONSTRAINT "downloads_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.enterprise_sso_configs'::regclass AND conname = 'enterprise_sso_configs_organization_id_key') THEN ALTER TABLE public."enterprise_sso_configs" ADD CONSTRAINT "enterprise_sso_configs_organization_id_key" UNIQUE (organization_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.enterprise_sso_configs'::regclass AND conname = 'enterprise_sso_configs_pkey') THEN ALTER TABLE public."enterprise_sso_configs" ADD CONSTRAINT "enterprise_sso_configs_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.enterprise_sso_configs'::regclass AND conname = 'enterprise_sso_configs_provider_check') THEN ALTER TABLE public."enterprise_sso_configs" ADD CONSTRAINT "enterprise_sso_configs_provider_check" CHECK ((provider = ANY (ARRAY['azure_ad'::text, 'okta'::text, 'google_workspace'::text, 'saml_custom'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.features'::regclass AND conname = 'features_name_key') THEN ALTER TABLE public."features" ADD CONSTRAINT "features_name_key" UNIQUE (name); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.features'::regclass AND conname = 'features_pkey') THEN ALTER TABLE public."features" ADD CONSTRAINT "features_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.features'::regclass AND conname = 'features_slug_key') THEN ALTER TABLE public."features" ADD CONSTRAINT "features_slug_key" UNIQUE (slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.government_citizen_cases'::regclass AND conname = 'government_citizen_cases_pkey') THEN ALTER TABLE public."government_citizen_cases" ADD CONSTRAINT "government_citizen_cases_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.government_citizen_cases'::regclass AND conname = 'government_citizen_cases_reference_no_key') THEN ALTER TABLE public."government_citizen_cases" ADD CONSTRAINT "government_citizen_cases_reference_no_key" UNIQUE (reference_no); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.government_citizen_cases'::regclass AND conname = 'government_citizen_cases_status_check') THEN ALTER TABLE public."government_citizen_cases" ADD CONSTRAINT "government_citizen_cases_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'escalated'::text, 'closed'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_campaigns'::regclass AND conname = 'growth_campaigns_pkey') THEN ALTER TABLE public."growth_campaigns" ADD CONSTRAINT "growth_campaigns_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_campaigns'::regclass AND conname = 'growth_campaigns_status_check') THEN ALTER TABLE public."growth_campaigns" ADD CONSTRAINT "growth_campaigns_status_check" CHECK ((status = ANY (ARRAY['planning'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_content'::regclass AND conname = 'growth_content_pkey') THEN ALTER TABLE public."growth_content" ADD CONSTRAINT "growth_content_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_content'::regclass AND conname = 'growth_content_platform_check') THEN ALTER TABLE public."growth_content" ADD CONSTRAINT "growth_content_platform_check" CHECK ((platform = ANY (ARRAY['facebook'::text, 'instagram'::text, 'linkedin'::text, 'twitter'::text, 'tiktok'::text, 'youtube'::text, 'email'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_content'::regclass AND conname = 'growth_content_status_check') THEN ALTER TABLE public."growth_content" ADD CONSTRAINT "growth_content_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text, 'failed'::text, 'archived'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_appointments'::regclass AND conname = 'health_appointments_pkey') THEN ALTER TABLE public."health_appointments" ADD CONSTRAINT "health_appointments_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_appointments'::regclass AND conname = 'health_appointments_status_check') THEN ALTER TABLE public."health_appointments" ADD CONSTRAINT "health_appointments_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_appointments'::regclass AND conname = 'health_appointments_type_check') THEN ALTER TABLE public."health_appointments" ADD CONSTRAINT "health_appointments_type_check" CHECK ((type = ANY (ARRAY['intake'::text, 'session'::text, 'follow_up'::text, 'group'::text, 'assessment'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_cases'::regclass AND conname = 'health_cases_pkey') THEN ALTER TABLE public."health_cases" ADD CONSTRAINT "health_cases_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_cases'::regclass AND conname = 'health_cases_status_check') THEN ALTER TABLE public."health_cases" ADD CONSTRAINT "health_cases_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'closed'::text, 'referred'::text, 'on_hold'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_clients'::regclass AND conname = 'health_clients_pkey') THEN ALTER TABLE public."health_clients" ADD CONSTRAINT "health_clients_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_clients'::regclass AND conname = 'health_clients_status_check') THEN ALTER TABLE public."health_clients" ADD CONSTRAINT "health_clients_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'discharged'::text, 'referred'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_license_key_key') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_license_key_key" UNIQUE (license_key); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_pkey') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_plan_check') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_plan_check" CHECK ((plan = ANY (ARRAY['community'::text, 'professional'::text, 'enterprise'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_status_check') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_drivers'::regclass AND conname = 'logistics_drivers_pkey') THEN ALTER TABLE public."logistics_drivers" ADD CONSTRAINT "logistics_drivers_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_drivers'::regclass AND conname = 'logistics_drivers_status_check') THEN ALTER TABLE public."logistics_drivers" ADD CONSTRAINT "logistics_drivers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'off_duty'::text, 'suspended'::text, 'terminated'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_pkey') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_status_check') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_status_check" CHECK ((status = ANY (ARRAY['created'::text, 'collected'::text, 'in_transit'::text, 'at_customs'::text, 'customs_cleared'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_tracking_number_key') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_tracking_number_key" UNIQUE (tracking_number); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_tracking_events'::regclass AND conname = 'logistics_tracking_events_pkey') THEN ALTER TABLE public."logistics_tracking_events" ADD CONSTRAINT "logistics_tracking_events_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_vehicles'::regclass AND conname = 'logistics_vehicles_pkey') THEN ALTER TABLE public."logistics_vehicles" ADD CONSTRAINT "logistics_vehicles_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_vehicles'::regclass AND conname = 'logistics_vehicles_status_check') THEN ALTER TABLE public."logistics_vehicles" ADD CONSTRAINT "logistics_vehicles_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'retired'::text, 'unavailable'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_vehicles'::regclass AND conname = 'logistics_vehicles_vehicle_type_check') THEN ALTER TABLE public."logistics_vehicles" ADD CONSTRAINT "logistics_vehicles_vehicle_type_check" CHECK ((vehicle_type = ANY (ARRAY['truck'::text, 'van'::text, 'motorcycle'::text, 'car'::text, 'bus'::text, 'other'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_activity_logs'::regclass AND conname = 'mari_activity_logs_pkey') THEN ALTER TABLE public."mari_activity_logs" ADD CONSTRAINT "mari_activity_logs_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_expiry_after_creation') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_expiry_after_creation" CHECK (((expires_at IS NULL) OR (expires_at > created_at))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_key_hash_key') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_key_hash_key" UNIQUE (key_hash); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_monthly_credit_limit_check') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_monthly_credit_limit_check" CHECK ((monthly_credit_limit > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_monthly_request_limit_check') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_monthly_request_limit_check" CHECK ((monthly_request_limit > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_name_check') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_pkey') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_request_count_check') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_request_count_check" CHECK ((request_count >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_status_check') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'REVOKED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_api_key_id_request_id_key') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_api_key_id_request_id_key" UNIQUE (api_key_id, request_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_completion_tokens_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_completion_tokens_check" CHECK ((completion_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_credits_used_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_credits_used_check" CHECK ((credits_used >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_latency_ms_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_latency_ms_check" CHECK ((latency_ms >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_pkey') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_prompt_tokens_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_prompt_tokens_check" CHECK ((prompt_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_rag_chunks_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_rag_chunks_check" CHECK ((rag_chunks >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_status_code_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_status_code_check" CHECK (((status_code >= 100) AND (status_code <= 599))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_total_tokens_check') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_total_tokens_check" CHECK ((total_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_briefings'::regclass AND conname = 'mari_competitor_briefings_pkey') THEN ALTER TABLE public."mari_competitor_briefings" ADD CONSTRAINT "mari_competitor_briefings_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_observations'::regclass AND conname = 'mari_competitor_observations_competitor_id_source_type_obse_key') THEN ALTER TABLE public."mari_competitor_observations" ADD CONSTRAINT "mari_competitor_observations_competitor_id_source_type_obse_key" UNIQUE (competitor_id, source_type, observation_type, content_hash); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_observations'::regclass AND conname = 'mari_competitor_observations_confidence_check') THEN ALTER TABLE public."mari_competitor_observations" ADD CONSTRAINT "mari_competitor_observations_confidence_check" CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_observations'::regclass AND conname = 'mari_competitor_observations_observation_type_check') THEN ALTER TABLE public."mari_competitor_observations" ADD CONSTRAINT "mari_competitor_observations_observation_type_check" CHECK ((observation_type = ANY (ARRAY['PAGE_SNAPSHOT'::text, 'POSITIONING'::text, 'PRICING'::text, 'OFFER'::text, 'SERVICE'::text, 'PROMOTION'::text, 'CONTENT_THEME'::text, 'CTA'::text, 'CHANGE'::text, 'OTHER'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_observations'::regclass AND conname = 'mari_competitor_observations_pkey') THEN ALTER TABLE public."mari_competitor_observations" ADD CONSTRAINT "mari_competitor_observations_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_observations'::regclass AND conname = 'mari_competitor_observations_source_type_check') THEN ALTER TABLE public."mari_competitor_observations" ADD CONSTRAINT "mari_competitor_observations_source_type_check" CHECK ((source_type = ANY (ARRAY['WEBSITE'::text, 'META_AD_LIBRARY'::text, 'GOOGLE_BUSINESS'::text, 'FACEBOOK_PUBLIC'::text, 'INSTAGRAM_PUBLIC'::text, 'OTHER_PUBLIC'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_watchlist'::regclass AND conname = 'mari_competitor_watchlist_name_check') THEN ALTER TABLE public."mari_competitor_watchlist" ADD CONSTRAINT "mari_competitor_watchlist_name_check" CHECK (((char_length(TRIM(BOTH FROM name)) >= 2) AND (char_length(TRIM(BOTH FROM name)) <= 160))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_watchlist'::regclass AND conname = 'mari_competitor_watchlist_organization_id_website_url_key') THEN ALTER TABLE public."mari_competitor_watchlist" ADD CONSTRAINT "mari_competitor_watchlist_organization_id_website_url_key" UNIQUE (organization_id, website_url); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_watchlist'::regclass AND conname = 'mari_competitor_watchlist_pkey') THEN ALTER TABLE public."mari_competitor_watchlist" ADD CONSTRAINT "mari_competitor_watchlist_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_watchlist'::regclass AND conname = 'mari_competitor_watchlist_scan_frequency_check') THEN ALTER TABLE public."mari_competitor_watchlist" ADD CONSTRAINT "mari_competitor_watchlist_scan_frequency_check" CHECK ((scan_frequency = ANY (ARRAY['WEEKLY'::text, 'ON_DEMAND'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_watchlist'::regclass AND conname = 'mari_competitor_watchlist_status_check') THEN ALTER TABLE public."mari_competitor_watchlist" ADD CONSTRAINT "mari_competitor_watchlist_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_conversations'::regclass AND conname = 'mari_conversations_pkey') THEN ALTER TABLE public."mari_conversations" ADD CONSTRAINT "mari_conversations_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_allowed_domains_check') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_allowed_domains_check" CHECK ((cardinality(allowed_domains) > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_monthly_limit_check') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_monthly_limit_check" CHECK ((monthly_request_limit > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_name_check') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_pkey') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_position_check') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_position_check" CHECK (("position" = ANY (ARRAY['bottom-right'::text, 'bottom-left'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_public_token_check') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_public_token_check" CHECK ((public_token ~~ 'mw_public_%'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_public_token_key') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_public_token_key" UNIQUE (public_token); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_status_check') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'REVOKED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_knowledge'::regclass AND conname = 'mari_knowledge_pkey') THEN ALTER TABLE public."mari_knowledge" ADD CONSTRAINT "mari_knowledge_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_knowledge'::regclass AND conname = 'mari_knowledge_source_type_check') THEN ALTER TABLE public."mari_knowledge" ADD CONSTRAINT "mari_knowledge_source_type_check" CHECK ((source_type = ANY (ARRAY['document'::text, 'customer'::text, 'project'::text, 'report'::text, 'manual'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_experiments'::regclass AND conname = 'mari_marketing_experiments_pkey') THEN ALTER TABLE public."mari_marketing_experiments" ADD CONSTRAINT "mari_marketing_experiments_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_experiments'::regclass AND conname = 'mari_marketing_experiments_source_type_check') THEN ALTER TABLE public."mari_marketing_experiments" ADD CONSTRAINT "mari_marketing_experiments_source_type_check" CHECK ((source_type = ANY (ARRAY['SOCIAL_POST'::text, 'GROWTH_CONTENT'::text, 'CAMPAIGN'::text, 'MANUAL'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_experiments'::regclass AND conname = 'mari_marketing_experiments_status_check') THEN ALTER TABLE public."mari_marketing_experiments" ADD CONSTRAINT "mari_marketing_experiments_status_check" CHECK ((status = ANY (ARRAY['PLANNED'::text, 'RUNNING'::text, 'OBSERVED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_learnings'::regclass AND conname = 'mari_marketing_learnings_category_check') THEN ALTER TABLE public."mari_marketing_learnings" ADD CONSTRAINT "mari_marketing_learnings_category_check" CHECK ((category = ANY (ARRAY['CONTENT_TYPE'::text, 'MESSAGE_THEME'::text, 'CTA'::text, 'AUDIENCE'::text, 'CHANNEL'::text, 'TIMING'::text, 'OFFER'::text, 'OBJECTIVE'::text, 'OTHER'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_learnings'::regclass AND conname = 'mari_marketing_learnings_confidence_check') THEN ALTER TABLE public."mari_marketing_learnings" ADD CONSTRAINT "mari_marketing_learnings_confidence_check" CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_learnings'::regclass AND conname = 'mari_marketing_learnings_evidence_count_check') THEN ALTER TABLE public."mari_marketing_learnings" ADD CONSTRAINT "mari_marketing_learnings_evidence_count_check" CHECK ((evidence_count >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_learnings'::regclass AND conname = 'mari_marketing_learnings_organization_id_workspace_id_learn_key') THEN ALTER TABLE public."mari_marketing_learnings" ADD CONSTRAINT "mari_marketing_learnings_organization_id_workspace_id_learn_key" UNIQUE (organization_id, workspace_id, learning_key); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_learnings'::regclass AND conname = 'mari_marketing_learnings_pkey') THEN ALTER TABLE public."mari_marketing_learnings" ADD CONSTRAINT "mari_marketing_learnings_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_learnings'::regclass AND conname = 'mari_marketing_learnings_status_check') THEN ALTER TABLE public."mari_marketing_learnings" ADD CONSTRAINT "mari_marketing_learnings_status_check" CHECK ((status = ANY (ARRAY['EMERGING'::text, 'SUPPORTED'::text, 'CONTESTED'::text, 'STALE'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_outcomes'::regclass AND conname = 'mari_marketing_outcomes_metric_window_days_check') THEN ALTER TABLE public."mari_marketing_outcomes" ADD CONSTRAINT "mari_marketing_outcomes_metric_window_days_check" CHECK (((metric_window_days >= 1) AND (metric_window_days <= 365))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_outcomes'::regclass AND conname = 'mari_marketing_outcomes_pkey') THEN ALTER TABLE public."mari_marketing_outcomes" ADD CONSTRAINT "mari_marketing_outcomes_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_messages'::regclass AND conname = 'mari_messages_pkey') THEN ALTER TABLE public."mari_messages" ADD CONSTRAINT "mari_messages_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_messages'::regclass AND conname = 'mari_messages_role_check') THEN ALTER TABLE public."mari_messages" ADD CONSTRAINT "mari_messages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_settings'::regclass AND conname = 'mari_settings_organization_id_key') THEN ALTER TABLE public."mari_settings" ADD CONSTRAINT "mari_settings_organization_id_key" UNIQUE (organization_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_settings'::regclass AND conname = 'mari_settings_pkey') THEN ALTER TABLE public."mari_settings" ADD CONSTRAINT "mari_settings_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_assistant_turns_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_assistant_turns_check" CHECK ((assistant_turns >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_duration_ms_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_duration_ms_check" CHECK ((duration_ms >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_input_audio_tokens_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_input_audio_tokens_check" CHECK ((input_audio_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_input_tokens_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_input_tokens_check" CHECK ((input_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_organization_id_session_id_key') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_organization_id_session_id_key" UNIQUE (organization_id, session_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_output_audio_tokens_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_output_audio_tokens_check" CHECK ((output_audio_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_output_tokens_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_output_tokens_check" CHECK ((output_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_pkey') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_voice_usage_sessions'::regclass AND conname = 'mari_voice_usage_sessions_user_turns_check') THEN ALTER TABLE public."mari_voice_usage_sessions" ADD CONSTRAINT "mari_voice_usage_sessions_user_turns_check" CHECK ((user_turns >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_expiry_check') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_expiry_check" CHECK ((expires_at > created_at)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_pkey') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_request_count_check') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_request_count_check" CHECK ((request_count >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_token_hash_key') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_token_hash_key" UNIQUE (token_hash); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_completion_tokens_check') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_completion_tokens_check" CHECK ((completion_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_credits_used_check') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_credits_used_check" CHECK ((credits_used >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_latency_ms_check') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_latency_ms_check" CHECK ((latency_ms >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_pkey') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_prompt_tokens_check') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_prompt_tokens_check" CHECK ((prompt_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_status_code_check') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_status_code_check" CHECK (((status_code >= 100) AND (status_code <= 599))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_total_tokens_check') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_total_tokens_check" CHECK ((total_tokens >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_widget_id_request_id_key') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_widget_id_request_id_key" UNIQUE (widget_id, request_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_workflows'::regclass AND conname = 'mari_workflows_pkey') THEN ALTER TABLE public."mari_workflows" ADD CONSTRAINT "mari_workflows_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_workflows'::regclass AND conname = 'mari_workflows_status_check') THEN ALTER TABLE public."mari_workflows" ADD CONSTRAINT "mari_workflows_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'disabled'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_workflows'::regclass AND conname = 'mari_workflows_trigger_check') THEN ALTER TABLE public."mari_workflows" ADD CONSTRAINT "mari_workflows_trigger_check" CHECK ((trigger = ANY (ARRAY['customer_created'::text, 'task_overdue'::text, 'document_uploaded'::text, 'lead_won'::text, 'manual'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.marketing_campaigns'::regclass AND conname = 'marketing_campaigns_pkey') THEN ALTER TABLE public."marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.marketplace_items'::regclass AND conname = 'marketplace_items_pkey') THEN ALTER TABLE public."marketplace_items" ADD CONSTRAINT "marketplace_items_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.marketplace_items'::regclass AND conname = 'marketplace_items_slug_key') THEN ALTER TABLE public."marketplace_items" ADD CONSTRAINT "marketplace_items_slug_key" UNIQUE (slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.marketplace_items'::regclass AND conname = 'marketplace_items_status_check') THEN ALTER TABLE public."marketplace_items" ADD CONSTRAINT "marketplace_items_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'beta'::text, 'deprecated'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.marketplace_items'::regclass AND conname = 'marketplace_items_type_check') THEN ALTER TABLE public."marketplace_items" ADD CONSTRAINT "marketplace_items_type_check" CHECK ((type = ANY (ARRAY['module'::text, 'integration'::text, 'agent'::text, 'template'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.modules'::regclass AND conname = 'modules_pkey') THEN ALTER TABLE public."modules" ADD CONSTRAINT "modules_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.modules'::regclass AND conname = 'modules_required_edition_check') THEN ALTER TABLE public."modules" ADD CONSTRAINT "modules_required_edition_check" CHECK ((required_edition = ANY (ARRAY['community'::text, 'professional'::text, 'enterprise'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.modules'::regclass AND conname = 'modules_slug_key') THEN ALTER TABLE public."modules" ADD CONSTRAINT "modules_slug_key" UNIQUE (slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.modules'::regclass AND conname = 'modules_status_check') THEN ALTER TABLE public."modules" ADD CONSTRAINT "modules_status_check" CHECK ((status = ANY (ARRAY['available'::text, 'beta'::text, 'coming_soon'::text, 'deprecated'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass AND conname = 'notifications_pkey') THEN ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass AND conname = 'organization_members_organization_id_user_id_key') THEN ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE (organization_id, user_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass AND conname = 'organization_members_pkey') THEN ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass AND conname = 'organization_members_status_check') THEN ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'suspended'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_modules'::regclass AND conname = 'organization_modules_organization_id_module_id_key') THEN ALTER TABLE public."organization_modules" ADD CONSTRAINT "organization_modules_organization_id_module_id_key" UNIQUE (organization_id, module_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_modules'::regclass AND conname = 'organization_modules_pkey') THEN ALTER TABLE public."organization_modules" ADD CONSTRAINT "organization_modules_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_modules'::regclass AND conname = 'organization_modules_status_check') THEN ALTER TABLE public."organization_modules" ADD CONSTRAINT "organization_modules_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'expired'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND conname = 'organizations_pkey') THEN ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND conname = 'organizations_slug_key') THEN ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_slug_key" UNIQUE (slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.payments'::regclass AND conname = 'payments_payment_provider_check') THEN ALTER TABLE public."payments" ADD CONSTRAINT "payments_payment_provider_check" CHECK ((payment_provider = ANY (ARRAY['stripe'::text, 'paypal'::text, 'orange_money'::text, 'mascom_myzaka'::text, 'bnb'::text, 'manual'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.payments'::regclass AND conname = 'payments_pkey') THEN ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.payments'::regclass AND conname = 'payments_status_check') THEN ALTER TABLE public."payments" ADD CONSTRAINT "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'reversed'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.permissions'::regclass AND conname = 'permissions_name_key') THEN ALTER TABLE public."permissions" ADD CONSTRAINT "permissions_name_key" UNIQUE (name); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.permissions'::regclass AND conname = 'permissions_pkey') THEN ALTER TABLE public."permissions" ADD CONSTRAINT "permissions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.plan_features'::regclass AND conname = 'plan_features_pkey') THEN ALTER TABLE public."plan_features" ADD CONSTRAINT "plan_features_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.plan_features'::regclass AND conname = 'plan_features_plan_id_feature_id_key') THEN ALTER TABLE public."plan_features" ADD CONSTRAINT "plan_features_plan_id_feature_id_key" UNIQUE (plan_id, feature_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.platform_admins'::regclass AND conname = 'platform_admins_pkey') THEN ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.platform_admins'::regclass AND conname = 'platform_admins_role_check') THEN ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_role_check" CHECK ((role = 'PLATFORM_ADMIN'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.platform_admins'::regclass AND conname = 'platform_admins_status_check') THEN ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_pkey') THEN ALTER TABLE public."products" ADD CONSTRAINT "products_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_slug_key') THEN ALTER TABLE public."products" ADD CONSTRAINT "products_slug_key" UNIQUE (slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_status_check') THEN ALTER TABLE public."products" ADD CONSTRAINT "products_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'beta'::text, 'deprecated'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_pkey') THEN ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_customers'::regclass AND conname = 'ralion_customers_pkey') THEN ALTER TABLE public."ralion_customers" ADD CONSTRAINT "ralion_customers_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_documents'::regclass AND conname = 'ralion_documents_pkey') THEN ALTER TABLE public."ralion_documents" ADD CONSTRAINT "ralion_documents_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_events'::regclass AND conname = 'ralion_events_pkey') THEN ALTER TABLE public."ralion_events" ADD CONSTRAINT "ralion_events_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_events'::regclass AND conname = 'ralion_events_type_check') THEN ALTER TABLE public."ralion_events" ADD CONSTRAINT "ralion_events_type_check" CHECK ((type = ANY (ARRAY['Meeting'::text, 'Appointment'::text, 'Reminder'::text, 'Task'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_leads'::regclass AND conname = 'ralion_leads_pkey') THEN ALTER TABLE public."ralion_leads" ADD CONSTRAINT "ralion_leads_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_leads'::regclass AND conname = 'ralion_leads_priority_check') THEN ALTER TABLE public."ralion_leads" ADD CONSTRAINT "ralion_leads_priority_check" CHECK ((priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_leads'::regclass AND conname = 'ralion_leads_status_check') THEN ALTER TABLE public."ralion_leads" ADD CONSTRAINT "ralion_leads_status_check" CHECK ((status = ANY (ARRAY['New'::text, 'Contacted'::text, 'Qualified'::text, 'Proposal'::text, 'Won'::text, 'Lost'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_projects'::regclass AND conname = 'ralion_projects_pkey') THEN ALTER TABLE public."ralion_projects" ADD CONSTRAINT "ralion_projects_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_projects'::regclass AND conname = 'ralion_projects_status_check') THEN ALTER TABLE public."ralion_projects" ADD CONSTRAINT "ralion_projects_status_check" CHECK ((status = ANY (ARRAY['Planning'::text, 'Active'::text, 'On Hold'::text, 'Completed'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_pkey') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_priority_check') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_priority_check" CHECK ((priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Urgent'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_status_check') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_status_check" CHECK ((status = ANY (ARRAY['Pending'::text, 'In Progress'::text, 'Completed'::text, 'Cancelled'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registered_devices'::regclass AND conname = 'registered_devices_device_identifier_key') THEN ALTER TABLE public."registered_devices" ADD CONSTRAINT "registered_devices_device_identifier_key" UNIQUE (device_identifier); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registered_devices'::regclass AND conname = 'registered_devices_pkey') THEN ALTER TABLE public."registered_devices" ADD CONSTRAINT "registered_devices_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registered_devices'::regclass AND conname = 'registered_devices_platform_check') THEN ALTER TABLE public."registered_devices" ADD CONSTRAINT "registered_devices_platform_check" CHECK ((platform = ANY (ARRAY['Windows'::text, 'macOS'::text, 'Linux'::text, 'iOS'::text, 'Android'::text, 'Web'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.releases'::regclass AND conname = 'releases_pkey') THEN ALTER TABLE public."releases" ADD CONSTRAINT "releases_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.releases'::regclass AND conname = 'releases_platform_check') THEN ALTER TABLE public."releases" ADD CONSTRAINT "releases_platform_check" CHECK ((platform = ANY (ARRAY['windows'::text, 'mac'::text, 'linux'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.releases'::regclass AND conname = 'releases_release_type_check') THEN ALTER TABLE public."releases" ADD CONSTRAINT "releases_release_type_check" CHECK ((release_type = ANY (ARRAY['community'::text, 'professional'::text, 'enterprise'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.releases'::regclass AND conname = 'releases_status_check') THEN ALTER TABLE public."releases" ADD CONSTRAINT "releases_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.role_permissions'::regclass AND conname = 'role_permissions_pkey') THEN ALTER TABLE public."role_permissions" ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.role_permissions'::regclass AND conname = 'role_permissions_role_id_permission_id_key') THEN ALTER TABLE public."role_permissions" ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.roles'::regclass AND conname = 'roles_pkey') THEN ALTER TABLE public."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_account_tokens'::regclass AND conname = 'social_account_tokens_pkey') THEN ALTER TABLE public."social_account_tokens" ADD CONSTRAINT "social_account_tokens_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_account_tokens'::regclass AND conname = 'social_account_tokens_user_id_provider_key') THEN ALTER TABLE public."social_account_tokens" ADD CONSTRAINT "social_account_tokens_user_id_provider_key" UNIQUE (user_id, provider); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_accounts'::regclass AND conname = 'social_accounts_infrastructure_provider_check') THEN ALTER TABLE public."social_accounts" ADD CONSTRAINT "social_accounts_infrastructure_provider_check" CHECK ((infrastructure_provider = ANY (ARRAY['native'::text, 'zernio'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_accounts'::regclass AND conname = 'social_accounts_pkey') THEN ALTER TABLE public."social_accounts" ADD CONSTRAINT "social_accounts_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_accounts'::regclass AND conname = 'social_accounts_workspace_id_provider_account_id_key') THEN ALTER TABLE public."social_accounts" ADD CONSTRAINT "social_accounts_workspace_id_provider_account_id_key" UNIQUE (workspace_id, provider, account_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_account_type_check') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_account_type_check" CHECK ((account_type = ANY (ARRAY['PERSONAL'::text, 'PAGE'::text, 'BUSINESS'::text, 'ORGANIZATION'::text, 'CREATOR'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_connection_status_check') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_connection_status_check" CHECK ((connection_status = ANY (ARRAY['CONNECTED'::text, 'NEEDS_ATTENTION'::text, 'RECONNECT_REQUIRED'::text, 'DISCONNECTED'::text, 'REVOKED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_infrastructure_provider_check') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_infrastructure_provider_check" CHECK ((infrastructure_provider = ANY (ARRAY['native'::text, 'zernio'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_pkey') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_provider_check') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_provider_check" CHECK ((provider = ANY (ARRAY['facebook'::text, 'instagram'::text, 'whatsapp'::text, 'tiktok'::text, 'linkedin'::text, 'x'::text, 'youtube'::text, 'threads'::text, 'pinterest'::text, 'reddit'::text, 'bluesky'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_token_status_check') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_token_status_check" CHECK ((token_status = ANY (ARRAY['TOKEN_VALID'::text, 'TOKEN_EXPIRING'::text, 'TOKEN_EXPIRED'::text, 'TOKEN_REVOKED'::text, 'REAUTH_REQUIRED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_connections'::regclass AND conname = 'social_connections_user_id_provider_provider_account_id_key') THEN ALTER TABLE public."social_connections" ADD CONSTRAINT "social_connections_user_id_provider_provider_account_id_key" UNIQUE (user_id, provider, provider_account_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_posts'::regclass AND conname = 'social_posts_pkey') THEN ALTER TABLE public."social_posts" ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_profiles'::regclass AND conname = 'social_provider_profiles_pkey') THEN ALTER TABLE public."social_provider_profiles" ADD CONSTRAINT "social_provider_profiles_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_profiles'::regclass AND conname = 'social_provider_profiles_provider_check') THEN ALTER TABLE public."social_provider_profiles" ADD CONSTRAINT "social_provider_profiles_provider_check" CHECK ((provider = 'zernio'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_profiles'::regclass AND conname = 'social_provider_profiles_provider_profile_id_key') THEN ALTER TABLE public."social_provider_profiles" ADD CONSTRAINT "social_provider_profiles_provider_profile_id_key" UNIQUE (provider_profile_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_profiles'::regclass AND conname = 'social_provider_profiles_status_check') THEN ALTER TABLE public."social_provider_profiles" ADD CONSTRAINT "social_provider_profiles_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'DELETED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_routing'::regclass AND conname = 'social_provider_routing_fallback_provider_check') THEN ALTER TABLE public."social_provider_routing" ADD CONSTRAINT "social_provider_routing_fallback_provider_check" CHECK ((fallback_provider = ANY (ARRAY['zernio'::text, 'native'::text, 'none'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_routing'::regclass AND conname = 'social_provider_routing_pkey') THEN ALTER TABLE public."social_provider_routing" ADD CONSTRAINT "social_provider_routing_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_routing'::regclass AND conname = 'social_provider_routing_platform_check') THEN ALTER TABLE public."social_provider_routing" ADD CONSTRAINT "social_provider_routing_platform_check" CHECK ((platform = ANY (ARRAY['facebook'::text, 'instagram'::text, 'whatsapp'::text, 'tiktok'::text, 'linkedin'::text, 'x'::text, 'youtube'::text, 'threads'::text, 'pinterest'::text, 'reddit'::text, 'bluesky'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_provider_routing'::regclass AND conname = 'social_provider_routing_provider_check') THEN ALTER TABLE public."social_provider_routing" ADD CONSTRAINT "social_provider_routing_provider_check" CHECK ((provider = ANY (ARRAY['zernio'::text, 'native'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_publish_idempotency'::regclass AND conname = 'social_publish_idempotency_pkey') THEN ALTER TABLE public."social_publish_idempotency" ADD CONSTRAINT "social_publish_idempotency_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_publish_idempotency'::regclass AND conname = 'social_publish_idempotency_status_check') THEN ALTER TABLE public."social_publish_idempotency" ADD CONSTRAINT "social_publish_idempotency_status_check" CHECK ((status = ANY (ARRAY['CLAIMED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'FAILED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_webhook_events'::regclass AND conname = 'social_webhook_events_pkey') THEN ALTER TABLE public."social_webhook_events" ADD CONSTRAINT "social_webhook_events_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscription_plans'::regclass AND conname = 'subscription_plans_billing_cycle_check') THEN ALTER TABLE public."subscription_plans" ADD CONSTRAINT "subscription_plans_billing_cycle_check" CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text, 'once'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscription_plans'::regclass AND conname = 'subscription_plans_pkey') THEN ALTER TABLE public."subscription_plans" ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscription_plans'::regclass AND conname = 'subscription_plans_slug_key') THEN ALTER TABLE public."subscription_plans" ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE (slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_billing_cycle_check') THEN ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_billing_cycle_check" CHECK ((billing_cycle = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_edition_check') THEN ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_edition_check" CHECK ((edition = ANY (ARRAY['community'::text, 'starter'::text, 'professional'::text, 'enterprise'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_pkey') THEN ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_status_check') THEN ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'suspended'::text, 'expired'::text, 'pending'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_pkey') THEN ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_priority_check') THEN ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text, 'CRITICAL'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_status_check') THEN ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['TODO'::text, 'IN_PROGRESS'::text, 'IN_REVIEW'::text, 'COMPLETED'::text, 'CANCELED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_admin_state'::regclass AND conname = 'tenant_admin_state_pkey') THEN ALTER TABLE public."tenant_admin_state" ADD CONSTRAINT "tenant_admin_state_pkey" PRIMARY KEY (organization_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_admin_state'::regclass AND conname = 'tenant_admin_state_status_check') THEN ALTER TABLE public."tenant_admin_state" ADD CONSTRAINT "tenant_admin_state_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_ledger'::regclass AND conname = 'tenant_credit_ledger_pkey') THEN ALTER TABLE public."tenant_credit_ledger" ADD CONSTRAINT "tenant_credit_ledger_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_ledger'::regclass AND conname = 'tenant_credit_ledger_type_check') THEN ALTER TABLE public."tenant_credit_ledger" ADD CONSTRAINT "tenant_credit_ledger_type_check" CHECK ((type = ANY (ARRAY['SUBSCRIPTION_RENEWAL'::text, 'BONUS_GRANT'::text, 'PROMOTIONAL_GRANT'::text, 'ADMIN_ADJUSTMENT'::text, 'CONSUMPTION'::text, 'REFUND'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_reservations'::regclass AND conname = 'tenant_credit_reservations_amount_check') THEN ALTER TABLE public."tenant_credit_reservations" ADD CONSTRAINT "tenant_credit_reservations_amount_check" CHECK ((amount > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_reservations'::regclass AND conname = 'tenant_credit_reservations_organization_id_correlation_id_key') THEN ALTER TABLE public."tenant_credit_reservations" ADD CONSTRAINT "tenant_credit_reservations_organization_id_correlation_id_key" UNIQUE (organization_id, correlation_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_reservations'::regclass AND conname = 'tenant_credit_reservations_pkey') THEN ALTER TABLE public."tenant_credit_reservations" ADD CONSTRAINT "tenant_credit_reservations_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_reservations'::regclass AND conname = 'tenant_credit_reservations_status_check') THEN ALTER TABLE public."tenant_credit_reservations" ADD CONSTRAINT "tenant_credit_reservations_status_check" CHECK ((status = ANY (ARRAY['RESERVED'::text, 'CHARGED'::text, 'RELEASED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_lifetime_credits_consumed_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_lifetime_credits_consumed_check" CHECK ((lifetime_credits_consumed >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_lifetime_credits_granted_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_lifetime_credits_granted_check" CHECK ((lifetime_credits_granted >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_monthly_quota_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_monthly_quota_check" CHECK ((monthly_quota >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_pkey') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_pkey" PRIMARY KEY (organization_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_plan_id_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_plan_id_check" CHECK ((plan_id = ANY (ARRAY['COMMUNITY'::text, 'STARTER'::text, 'PROFESSIONAL'::text, 'ENTERPRISE'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_remaining_bonus_credits_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_remaining_bonus_credits_check" CHECK ((remaining_bonus_credits >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_remaining_plan_credits_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_remaining_plan_credits_check" CHECK ((remaining_plan_credits >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_credit_wallets'::regclass AND conname = 'tenant_credit_wallets_reserved_credits_check') THEN ALTER TABLE public."tenant_credit_wallets" ADD CONSTRAINT "tenant_credit_wallets_reserved_credits_check" CHECK ((reserved_credits >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_order_items'::regclass AND conname = 'trade_order_items_pkey') THEN ALTER TABLE public."trade_order_items" ADD CONSTRAINT "trade_order_items_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_orders'::regclass AND conname = 'trade_orders_order_number_key') THEN ALTER TABLE public."trade_orders" ADD CONSTRAINT "trade_orders_order_number_key" UNIQUE (order_number); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_orders'::regclass AND conname = 'trade_orders_pkey') THEN ALTER TABLE public."trade_orders" ADD CONSTRAINT "trade_orders_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_orders'::regclass AND conname = 'trade_orders_status_check') THEN ALTER TABLE public."trade_orders" ADD CONSTRAINT "trade_orders_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'confirmed'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_products'::regclass AND conname = 'trade_products_pkey') THEN ALTER TABLE public."trade_products" ADD CONSTRAINT "trade_products_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_products'::regclass AND conname = 'trade_products_status_check') THEN ALTER TABLE public."trade_products" ADD CONSTRAINT "trade_products_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'discontinued'::text, 'out_of_stock'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_suppliers'::regclass AND conname = 'trade_suppliers_pkey') THEN ALTER TABLE public."trade_suppliers" ADD CONSTRAINT "trade_suppliers_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_suppliers'::regclass AND conname = 'trade_suppliers_status_check') THEN ALTER TABLE public."trade_suppliers" ADD CONSTRAINT "trade_suppliers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'blacklisted'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.usage_metrics'::regclass AND conname = 'usage_metrics_organization_id_metric_name_period_key') THEN ALTER TABLE public."usage_metrics" ADD CONSTRAINT "usage_metrics_organization_id_metric_name_period_key" UNIQUE (organization_id, metric_name, period); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.usage_metrics'::regclass AND conname = 'usage_metrics_pkey') THEN ALTER TABLE public."usage_metrics" ADD CONSTRAINT "usage_metrics_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_products'::regclass AND conname = 'user_products_pkey') THEN ALTER TABLE public."user_products" ADD CONSTRAINT "user_products_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_products'::regclass AND conname = 'user_products_user_id_product_id_organization_id_key') THEN ALTER TABLE public."user_products" ADD CONSTRAINT "user_products_user_id_product_id_organization_id_key" UNIQUE (user_id, product_id, organization_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.webhooks'::regclass AND conname = 'webhooks_pkey') THEN ALTER TABLE public."webhooks" ADD CONSTRAINT "webhooks_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.webhooks'::regclass AND conname = 'webhooks_status_check') THEN ALTER TABLE public."webhooks" ADD CONSTRAINT "webhooks_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text, 'failing'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_runs'::regclass AND conname = 'workflow_runs_pkey') THEN ALTER TABLE public."workflow_runs" ADD CONSTRAINT "workflow_runs_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_runs'::regclass AND conname = 'workflow_runs_status_check') THEN ALTER TABLE public."workflow_runs" ADD CONSTRAINT "workflow_runs_status_check" CHECK ((status = ANY (ARRAY['RUNNING'::text, 'SUCCEEDED'::text, 'FAILED'::text, 'SKIPPED'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflows'::regclass AND conname = 'workflows_actions_array_check') THEN ALTER TABLE public."workflows" ADD CONSTRAINT "workflows_actions_array_check" CHECK ((jsonb_typeof(actions) = 'array'::text)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflows'::regclass AND conname = 'workflows_pkey') THEN ALTER TABLE public."workflows" ADD CONSTRAINT "workflows_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflows'::regclass AND conname = 'workflows_trigger_check') THEN ALTER TABLE public."workflows" ADD CONSTRAINT "workflows_trigger_check" CHECK ((trigger_event = ANY (ARRAY['CUSTOMER_CREATED'::text, 'DEAL_STAGE_CHANGED'::text, 'TASK_COMPLETED'::text, 'MANUAL'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspace_members'::regclass AND conname = 'workspace_members_pkey') THEN ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspace_members'::regclass AND conname = 'workspace_members_role_check') THEN ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_role_check" CHECK ((role = ANY (ARRAY['OWNER'::text, 'ADMINISTRATOR'::text, 'MARKETING_MANAGER'::text, 'SALES'::text, 'HR'::text, 'FINANCE'::text, 'DEVELOPER'::text, 'VIEWER'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspace_members'::regclass AND conname = 'workspace_members_workspace_id_user_id_key') THEN ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE (workspace_id, user_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspaces'::regclass AND conname = 'workspaces_organization_id_slug_key') THEN ALTER TABLE public."workspaces" ADD CONSTRAINT "workspaces_organization_id_slug_key" UNIQUE (organization_id, slug); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspaces'::regclass AND conname = 'workspaces_pkey') THEN ALTER TABLE public."workspaces" ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ai_jobs'::regclass AND conname = 'ai_jobs_workspace_id_fkey') THEN ALTER TABLE public."ai_jobs" ADD CONSTRAINT "ai_jobs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ai_memory'::regclass AND conname = 'ai_memory_workspace_id_fkey') THEN ALTER TABLE public."ai_memory" ADD CONSTRAINT "ai_memory_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND conname = 'audit_logs_organization_id_fkey') THEN ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND conname = 'audit_logs_user_id_fkey') THEN ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND conname = 'audit_logs_workspace_id_fkey') THEN ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_checkout_references'::regclass AND conname = 'billing_checkout_references_organization_id_fkey') THEN ALTER TABLE public."billing_checkout_references" ADD CONSTRAINT "billing_checkout_references_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.billing_webhook_events'::regclass AND conname = 'billing_webhook_events_organization_id_fkey') THEN ALTER TABLE public."billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.business_profiles'::regclass AND conname = 'business_profiles_workspace_id_fkey') THEN ALTER TABLE public."business_profiles" ADD CONSTRAINT "business_profiles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_created_by_fkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_organization_id_fkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_related_customer_id_fkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_related_customer_id_fkey" FOREIGN KEY (related_customer_id) REFERENCES customers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_related_deal_id_fkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_related_deal_id_fkey" FOREIGN KEY (related_deal_id) REFERENCES deals(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_related_task_id_fkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_related_task_id_fkey" FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.calendar_events'::regclass AND conname = 'calendar_events_workspace_id_fkey') THEN ALTER TABLE public."calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_workspace_id_fkey') THEN ALTER TABLE public."customers" ADD CONSTRAINT "customers_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.deals'::regclass AND conname = 'deals_customer_id_fkey') THEN ALTER TABLE public."deals" ADD CONSTRAINT "deals_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.deals'::regclass AND conname = 'deals_workspace_id_fkey') THEN ALTER TABLE public."deals" ADD CONSTRAINT "deals_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.desktop_events'::regclass AND conname = 'desktop_events_organization_id_fkey') THEN ALTER TABLE public."desktop_events" ADD CONSTRAINT "desktop_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.desktop_events'::regclass AND conname = 'desktop_events_user_id_fkey') THEN ALTER TABLE public."desktop_events" ADD CONSTRAINT "desktop_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_key_rate_limits'::regclass AND conname = 'developer_api_key_rate_limits_api_key_id_fkey') THEN ALTER TABLE public."developer_api_key_rate_limits" ADD CONSTRAINT "developer_api_key_rate_limits_api_key_id_fkey" FOREIGN KEY (api_key_id) REFERENCES developer_api_keys(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_keys'::regclass AND conname = 'developer_api_keys_created_by_fkey') THEN ALTER TABLE public."developer_api_keys" ADD CONSTRAINT "developer_api_keys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_keys'::regclass AND conname = 'developer_api_keys_organization_id_fkey') THEN ALTER TABLE public."developer_api_keys" ADD CONSTRAINT "developer_api_keys_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.developer_api_keys'::regclass AND conname = 'developer_api_keys_workspace_id_fkey') THEN ALTER TABLE public."developer_api_keys" ADD CONSTRAINT "developer_api_keys_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.devices'::regclass AND conname = 'devices_organization_id_fkey') THEN ALTER TABLE public."devices" ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.devices'::regclass AND conname = 'devices_user_id_fkey') THEN ALTER TABLE public."devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.document_chunks'::regclass AND conname = 'document_chunks_document_id_fkey') THEN ALTER TABLE public."document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.document_chunks'::regclass AND conname = 'document_chunks_workspace_id_fkey') THEN ALTER TABLE public."document_chunks" ADD CONSTRAINT "document_chunks_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.documents'::regclass AND conname = 'documents_organization_id_fkey') THEN ALTER TABLE public."documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.documents'::regclass AND conname = 'documents_uploaded_by_fkey') THEN ALTER TABLE public."documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.documents'::regclass AND conname = 'documents_workspace_id_fkey') THEN ALTER TABLE public."documents" ADD CONSTRAINT "documents_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.download_releases'::regclass AND conname = 'download_releases_product_id_fkey') THEN ALTER TABLE public."download_releases" ADD CONSTRAINT "download_releases_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.downloads'::regclass AND conname = 'downloads_release_id_fkey') THEN ALTER TABLE public."downloads" ADD CONSTRAINT "downloads_release_id_fkey" FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.downloads'::regclass AND conname = 'downloads_user_id_fkey') THEN ALTER TABLE public."downloads" ADD CONSTRAINT "downloads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.enterprise_sso_configs'::regclass AND conname = 'enterprise_sso_configs_organization_id_fkey') THEN ALTER TABLE public."enterprise_sso_configs" ADD CONSTRAINT "enterprise_sso_configs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.government_citizen_cases'::regclass AND conname = 'government_citizen_cases_assigned_officer_id_fkey') THEN ALTER TABLE public."government_citizen_cases" ADD CONSTRAINT "government_citizen_cases_assigned_officer_id_fkey" FOREIGN KEY (assigned_officer_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.government_citizen_cases'::regclass AND conname = 'government_citizen_cases_organization_id_fkey') THEN ALTER TABLE public."government_citizen_cases" ADD CONSTRAINT "government_citizen_cases_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_campaigns'::regclass AND conname = 'growth_campaigns_created_by_fkey') THEN ALTER TABLE public."growth_campaigns" ADD CONSTRAINT "growth_campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_campaigns'::regclass AND conname = 'growth_campaigns_organization_id_fkey') THEN ALTER TABLE public."growth_campaigns" ADD CONSTRAINT "growth_campaigns_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_content'::regclass AND conname = 'fk_growth_campaign') THEN ALTER TABLE public."growth_content" ADD CONSTRAINT "fk_growth_campaign" FOREIGN KEY (campaign_id) REFERENCES growth_campaigns(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_content'::regclass AND conname = 'growth_content_created_by_fkey') THEN ALTER TABLE public."growth_content" ADD CONSTRAINT "growth_content_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_content'::regclass AND conname = 'growth_content_organization_id_fkey') THEN ALTER TABLE public."growth_content" ADD CONSTRAINT "growth_content_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_appointments'::regclass AND conname = 'health_appointments_client_id_fkey') THEN ALTER TABLE public."health_appointments" ADD CONSTRAINT "health_appointments_client_id_fkey" FOREIGN KEY (client_id) REFERENCES health_clients(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_appointments'::regclass AND conname = 'health_appointments_organization_id_fkey') THEN ALTER TABLE public."health_appointments" ADD CONSTRAINT "health_appointments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_appointments'::regclass AND conname = 'health_appointments_professional_id_fkey') THEN ALTER TABLE public."health_appointments" ADD CONSTRAINT "health_appointments_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_cases'::regclass AND conname = 'health_cases_assigned_professional_id_fkey') THEN ALTER TABLE public."health_cases" ADD CONSTRAINT "health_cases_assigned_professional_id_fkey" FOREIGN KEY (assigned_professional_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_cases'::regclass AND conname = 'health_cases_client_id_fkey') THEN ALTER TABLE public."health_cases" ADD CONSTRAINT "health_cases_client_id_fkey" FOREIGN KEY (client_id) REFERENCES health_clients(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_cases'::regclass AND conname = 'health_cases_organization_id_fkey') THEN ALTER TABLE public."health_cases" ADD CONSTRAINT "health_cases_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_clients'::regclass AND conname = 'health_clients_assigned_professional_id_fkey') THEN ALTER TABLE public."health_clients" ADD CONSTRAINT "health_clients_assigned_professional_id_fkey" FOREIGN KEY (assigned_professional_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.health_clients'::regclass AND conname = 'health_clients_organization_id_fkey') THEN ALTER TABLE public."health_clients" ADD CONSTRAINT "health_clients_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_organization_id_fkey') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_product_id_fkey') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.licenses'::regclass AND conname = 'licenses_user_id_fkey') THEN ALTER TABLE public."licenses" ADD CONSTRAINT "licenses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_drivers'::regclass AND conname = 'logistics_drivers_organization_id_fkey') THEN ALTER TABLE public."logistics_drivers" ADD CONSTRAINT "logistics_drivers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_created_by_fkey') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_customer_id_fkey') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES ralion_customers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_driver_id_fkey') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES logistics_drivers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_organization_id_fkey') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_shipments'::regclass AND conname = 'logistics_shipments_vehicle_id_fkey') THEN ALTER TABLE public."logistics_shipments" ADD CONSTRAINT "logistics_shipments_vehicle_id_fkey" FOREIGN KEY (vehicle_id) REFERENCES logistics_vehicles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_tracking_events'::regclass AND conname = 'logistics_tracking_events_recorded_by_fkey') THEN ALTER TABLE public."logistics_tracking_events" ADD CONSTRAINT "logistics_tracking_events_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_tracking_events'::regclass AND conname = 'logistics_tracking_events_shipment_id_fkey') THEN ALTER TABLE public."logistics_tracking_events" ADD CONSTRAINT "logistics_tracking_events_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_vehicles'::regclass AND conname = 'fk_vehicle_driver') THEN ALTER TABLE public."logistics_vehicles" ADD CONSTRAINT "fk_vehicle_driver" FOREIGN KEY (assigned_driver_id) REFERENCES logistics_drivers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logistics_vehicles'::regclass AND conname = 'logistics_vehicles_organization_id_fkey') THEN ALTER TABLE public."logistics_vehicles" ADD CONSTRAINT "logistics_vehicles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_activity_logs'::regclass AND conname = 'mari_activity_logs_organization_id_fkey') THEN ALTER TABLE public."mari_activity_logs" ADD CONSTRAINT "mari_activity_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_activity_logs'::regclass AND conname = 'mari_activity_logs_user_id_fkey') THEN ALTER TABLE public."mari_activity_logs" ADD CONSTRAINT "mari_activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_created_by_fkey') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_organization_id_fkey') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_keys'::regclass AND conname = 'mari_api_keys_workspace_id_fkey') THEN ALTER TABLE public."mari_api_keys" ADD CONSTRAINT "mari_api_keys_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_api_key_id_fkey') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_api_key_id_fkey" FOREIGN KEY (api_key_id) REFERENCES mari_api_keys(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_organization_id_fkey') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_api_usage'::regclass AND conname = 'mari_api_usage_workspace_id_fkey') THEN ALTER TABLE public."mari_api_usage" ADD CONSTRAINT "mari_api_usage_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_competitor_observations'::regclass AND conname = 'mari_competitor_observations_competitor_id_fkey') THEN ALTER TABLE public."mari_competitor_observations" ADD CONSTRAINT "mari_competitor_observations_competitor_id_fkey" FOREIGN KEY (competitor_id) REFERENCES mari_competitor_watchlist(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_conversations'::regclass AND conname = 'mari_conversations_organization_id_fkey') THEN ALTER TABLE public."mari_conversations" ADD CONSTRAINT "mari_conversations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_conversations'::regclass AND conname = 'mari_conversations_user_id_fkey') THEN ALTER TABLE public."mari_conversations" ADD CONSTRAINT "mari_conversations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_created_by_fkey') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_organization_id_fkey') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_embed_widgets'::regclass AND conname = 'mari_embed_widgets_workspace_id_fkey') THEN ALTER TABLE public."mari_embed_widgets" ADD CONSTRAINT "mari_embed_widgets_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_knowledge'::regclass AND conname = 'mari_knowledge_organization_id_fkey') THEN ALTER TABLE public."mari_knowledge" ADD CONSTRAINT "mari_knowledge_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_marketing_outcomes'::regclass AND conname = 'mari_marketing_outcomes_experiment_id_fkey') THEN ALTER TABLE public."mari_marketing_outcomes" ADD CONSTRAINT "mari_marketing_outcomes_experiment_id_fkey" FOREIGN KEY (experiment_id) REFERENCES mari_marketing_experiments(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_messages'::regclass AND conname = 'mari_messages_conversation_id_fkey') THEN ALTER TABLE public."mari_messages" ADD CONSTRAINT "mari_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES mari_conversations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_settings'::regclass AND conname = 'mari_settings_organization_id_fkey') THEN ALTER TABLE public."mari_settings" ADD CONSTRAINT "mari_settings_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_organization_id_fkey') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_widget_id_fkey') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_widget_id_fkey" FOREIGN KEY (widget_id) REFERENCES mari_embed_widgets(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_sessions'::regclass AND conname = 'mari_widget_sessions_workspace_id_fkey') THEN ALTER TABLE public."mari_widget_sessions" ADD CONSTRAINT "mari_widget_sessions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_organization_id_fkey') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_widget_id_fkey') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_widget_id_fkey" FOREIGN KEY (widget_id) REFERENCES mari_embed_widgets(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_widget_usage'::regclass AND conname = 'mari_widget_usage_workspace_id_fkey') THEN ALTER TABLE public."mari_widget_usage" ADD CONSTRAINT "mari_widget_usage_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_workflows'::regclass AND conname = 'mari_workflows_created_by_fkey') THEN ALTER TABLE public."mari_workflows" ADD CONSTRAINT "mari_workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mari_workflows'::regclass AND conname = 'mari_workflows_organization_id_fkey') THEN ALTER TABLE public."mari_workflows" ADD CONSTRAINT "mari_workflows_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.marketing_campaigns'::regclass AND conname = 'marketing_campaigns_workspace_id_fkey') THEN ALTER TABLE public."marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass AND conname = 'notifications_user_id_fkey') THEN ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass AND conname = 'fk_role') THEN ALTER TABLE public."organization_members" ADD CONSTRAINT "fk_role" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass AND conname = 'organization_members_organization_id_fkey') THEN ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass AND conname = 'organization_members_user_id_fkey') THEN ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_modules'::regclass AND conname = 'organization_modules_activated_by_fkey') THEN ALTER TABLE public."organization_modules" ADD CONSTRAINT "organization_modules_activated_by_fkey" FOREIGN KEY (activated_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_modules'::regclass AND conname = 'organization_modules_module_id_fkey') THEN ALTER TABLE public."organization_modules" ADD CONSTRAINT "organization_modules_module_id_fkey" FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_modules'::regclass AND conname = 'organization_modules_organization_id_fkey') THEN ALTER TABLE public."organization_modules" ADD CONSTRAINT "organization_modules_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND conname = 'organizations_owner_id_fkey') THEN ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.payments'::regclass AND conname = 'payments_organization_id_fkey') THEN ALTER TABLE public."payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.payments'::regclass AND conname = 'payments_subscription_id_fkey') THEN ALTER TABLE public."payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.plan_features'::regclass AND conname = 'plan_features_feature_id_fkey') THEN ALTER TABLE public."plan_features" ADD CONSTRAINT "plan_features_feature_id_fkey" FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.plan_features'::regclass AND conname = 'plan_features_plan_id_fkey') THEN ALTER TABLE public."plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.platform_admins'::regclass AND conname = 'platform_admins_organization_id_fkey') THEN ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.platform_admins'::regclass AND conname = 'platform_admins_user_id_fkey') THEN ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_id_fkey') THEN ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_customers'::regclass AND conname = 'ralion_customers_created_by_fkey') THEN ALTER TABLE public."ralion_customers" ADD CONSTRAINT "ralion_customers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_customers'::regclass AND conname = 'ralion_customers_organization_id_fkey') THEN ALTER TABLE public."ralion_customers" ADD CONSTRAINT "ralion_customers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_documents'::regclass AND conname = 'ralion_documents_organization_id_fkey') THEN ALTER TABLE public."ralion_documents" ADD CONSTRAINT "ralion_documents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_documents'::regclass AND conname = 'ralion_documents_uploaded_by_fkey') THEN ALTER TABLE public."ralion_documents" ADD CONSTRAINT "ralion_documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_events'::regclass AND conname = 'ralion_events_created_by_fkey') THEN ALTER TABLE public."ralion_events" ADD CONSTRAINT "ralion_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_events'::regclass AND conname = 'ralion_events_organization_id_fkey') THEN ALTER TABLE public."ralion_events" ADD CONSTRAINT "ralion_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_leads'::regclass AND conname = 'ralion_leads_assigned_user_fkey') THEN ALTER TABLE public."ralion_leads" ADD CONSTRAINT "ralion_leads_assigned_user_fkey" FOREIGN KEY (assigned_user) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_leads'::regclass AND conname = 'ralion_leads_organization_id_fkey') THEN ALTER TABLE public."ralion_leads" ADD CONSTRAINT "ralion_leads_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_projects'::regclass AND conname = 'ralion_projects_created_by_fkey') THEN ALTER TABLE public."ralion_projects" ADD CONSTRAINT "ralion_projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_projects'::regclass AND conname = 'ralion_projects_organization_id_fkey') THEN ALTER TABLE public."ralion_projects" ADD CONSTRAINT "ralion_projects_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_assigned_to_fkey') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_created_by_fkey') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_organization_id_fkey') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ralion_tasks'::regclass AND conname = 'ralion_tasks_project_id_fkey') THEN ALTER TABLE public."ralion_tasks" ADD CONSTRAINT "ralion_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES ralion_projects(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registered_devices'::regclass AND conname = 'registered_devices_license_id_fkey') THEN ALTER TABLE public."registered_devices" ADD CONSTRAINT "registered_devices_license_id_fkey" FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.role_permissions'::regclass AND conname = 'role_permissions_permission_id_fkey') THEN ALTER TABLE public."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.role_permissions'::regclass AND conname = 'role_permissions_role_id_fkey') THEN ALTER TABLE public."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.roles'::regclass AND conname = 'roles_organization_id_fkey') THEN ALTER TABLE public."roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_account_tokens'::regclass AND conname = 'social_account_tokens_user_id_fkey') THEN ALTER TABLE public."social_account_tokens" ADD CONSTRAINT "social_account_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_accounts'::regclass AND conname = 'social_accounts_workspace_id_fkey') THEN ALTER TABLE public."social_accounts" ADD CONSTRAINT "social_accounts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_posts'::regclass AND conname = 'social_posts_social_connection_id_fkey') THEN ALTER TABLE public."social_posts" ADD CONSTRAINT "social_posts_social_connection_id_fkey" FOREIGN KEY (social_connection_id) REFERENCES social_connections(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_posts'::regclass AND conname = 'social_posts_user_id_fkey') THEN ALTER TABLE public."social_posts" ADD CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.social_posts'::regclass AND conname = 'social_posts_workspace_id_fkey') THEN ALTER TABLE public."social_posts" ADD CONSTRAINT "social_posts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_organization_id_fkey') THEN ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_plan_id_fkey') THEN ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_created_by_fkey') THEN ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_workspace_id_fkey') THEN ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_admin_state'::regclass AND conname = 'tenant_admin_state_organization_id_fkey') THEN ALTER TABLE public."tenant_admin_state" ADD CONSTRAINT "tenant_admin_state_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenant_admin_state'::regclass AND conname = 'tenant_admin_state_suspended_by_fkey') THEN ALTER TABLE public."tenant_admin_state" ADD CONSTRAINT "tenant_admin_state_suspended_by_fkey" FOREIGN KEY (suspended_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_order_items'::regclass AND conname = 'trade_order_items_order_id_fkey') THEN ALTER TABLE public."trade_order_items" ADD CONSTRAINT "trade_order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES trade_orders(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_order_items'::regclass AND conname = 'trade_order_items_product_id_fkey') THEN ALTER TABLE public."trade_order_items" ADD CONSTRAINT "trade_order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES trade_products(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_orders'::regclass AND conname = 'trade_orders_created_by_fkey') THEN ALTER TABLE public."trade_orders" ADD CONSTRAINT "trade_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_orders'::regclass AND conname = 'trade_orders_organization_id_fkey') THEN ALTER TABLE public."trade_orders" ADD CONSTRAINT "trade_orders_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_orders'::regclass AND conname = 'trade_orders_supplier_id_fkey') THEN ALTER TABLE public."trade_orders" ADD CONSTRAINT "trade_orders_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES trade_suppliers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_products'::regclass AND conname = 'trade_products_organization_id_fkey') THEN ALTER TABLE public."trade_products" ADD CONSTRAINT "trade_products_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_products'::regclass AND conname = 'trade_products_supplier_id_fkey') THEN ALTER TABLE public."trade_products" ADD CONSTRAINT "trade_products_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES trade_suppliers(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.trade_suppliers'::regclass AND conname = 'trade_suppliers_organization_id_fkey') THEN ALTER TABLE public."trade_suppliers" ADD CONSTRAINT "trade_suppliers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.usage_metrics'::regclass AND conname = 'usage_metrics_organization_id_fkey') THEN ALTER TABLE public."usage_metrics" ADD CONSTRAINT "usage_metrics_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_products'::regclass AND conname = 'user_products_organization_id_fkey') THEN ALTER TABLE public."user_products" ADD CONSTRAINT "user_products_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_products'::regclass AND conname = 'user_products_product_id_fkey') THEN ALTER TABLE public."user_products" ADD CONSTRAINT "user_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_products'::regclass AND conname = 'user_products_user_id_fkey') THEN ALTER TABLE public."user_products" ADD CONSTRAINT "user_products_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.webhooks'::regclass AND conname = 'webhooks_organization_id_fkey') THEN ALTER TABLE public."webhooks" ADD CONSTRAINT "webhooks_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_runs'::regclass AND conname = 'workflow_runs_workflow_id_fkey') THEN ALTER TABLE public."workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_runs'::regclass AND conname = 'workflow_runs_workspace_id_fkey') THEN ALTER TABLE public."workflow_runs" ADD CONSTRAINT "workflow_runs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflows'::regclass AND conname = 'workflows_created_by_fkey') THEN ALTER TABLE public."workflows" ADD CONSTRAINT "workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflows'::regclass AND conname = 'workflows_organization_id_fkey') THEN ALTER TABLE public."workflows" ADD CONSTRAINT "workflows_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflows'::regclass AND conname = 'workflows_workspace_id_fkey') THEN ALTER TABLE public."workflows" ADD CONSTRAINT "workflows_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspace_members'::regclass AND conname = 'workspace_members_workspace_id_fkey') THEN ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workspaces'::regclass AND conname = 'workspaces_organization_id_fkey') THEN ALTER TABLE public."workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF to_regprocedure('public.claim_social_publish_dispatch(text,text,text,text,text,text,text)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.claim_social_publish_dispatch(p_user_id text, p_organization_id text, p_workspace_id text, p_destination text, p_idempotency_key text, p_body_hash text, p_lease_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    v_existing RECORD;
    v_claim_id UUID;
    v_token TEXT := COALESCE(p_lease_token, pg_catalog.gen_random_uuid()::text);
    v_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL ''24 hours'';
    v_stale_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL ''5 minutes'';
BEGIN
    SELECT *
    INTO v_existing
    FROM public.social_publish_idempotency
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND destination = p_destination
      AND (idempotency_key = p_idempotency_key OR body_hash = p_body_hash)
      AND created_at > v_cutoff
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        IF v_existing.status = ''COMPLETED'' THEN
            RETURN pg_catalog.jsonb_build_object(
                ''claim_status'', ''ALREADY_COMPLETED'',
                ''claim_id'', v_existing.id,
                ''post_id'', v_existing.post_id,
                ''external_receipt_id'', v_existing.external_receipt_id,
                ''platform_results'', v_existing.platform_results,
                ''conflict'', true,
                ''message'', ''This exact content was already published or scheduled for this account within the last 24 hours.''
            );
        END IF;

        IF v_existing.status IN (''CLAIMED'', ''IN_PROGRESS'') THEN
            IF v_existing.claimed_at < v_stale_cutoff OR v_existing.expires_at < pg_catalog.now() THEN
                UPDATE public.social_publish_idempotency
                SET status = ''IN_PROGRESS'',
                    lease_token = v_token,
                    claimed_at = pg_catalog.now(),
                    expires_at = pg_catalog.now() + INTERVAL ''5 minutes'',
                    retry_count = v_existing.retry_count + 1,
                    updated_at = pg_catalog.now()
                WHERE id = v_existing.id;

                RETURN pg_catalog.jsonb_build_object(
                    ''claim_status'', ''CLAIMED_RETRY'',
                    ''claim_id'', v_existing.id,
                    ''lease_token'', v_token,
                    ''conflict'', false,
                    ''message'', ''Recovered stale dispatch lease.''
                );
            ELSE
                RETURN pg_catalog.jsonb_build_object(
                    ''claim_status'', ''IN_PROGRESS_CONFLICT'',
                    ''claim_id'', v_existing.id,
                    ''conflict'', true,
                    ''message'', ''A publish dispatch with this exact payload is currently in flight.''
                );
            END IF;
        END IF;

        IF v_existing.status = ''FAILED'' THEN
            IF v_existing.retry_count >= 5 AND v_existing.failed_at > (pg_catalog.now() - INTERVAL ''15 minutes'') THEN
                RETURN pg_catalog.jsonb_build_object(
                    ''claim_status'', ''FAILED_THROTTLED'',
                    ''claim_id'', v_existing.id,
                    ''conflict'', true,
                    ''message'', ''Maximum retry attempts exceeded for this payload. Please wait 15 minutes before retrying.''
                );
            ELSE
                UPDATE public.social_publish_idempotency
                SET status = ''IN_PROGRESS'',
                    lease_token = v_token,
                    claimed_at = pg_catalog.now(),
                    expires_at = pg_catalog.now() + INTERVAL ''5 minutes'',
                    retry_count = v_existing.retry_count + 1,
                    error_message = NULL,
                    updated_at = pg_catalog.now()
                WHERE id = v_existing.id;

                RETURN pg_catalog.jsonb_build_object(
                    ''claim_status'', ''CLAIMED_RETRY'',
                    ''claim_id'', v_existing.id,
                    ''lease_token'', v_token,
                    ''conflict'', false,
                    ''message'', ''Retrying previously failed dispatch.''
                );
            END IF;
        END IF;
    END IF;

    INSERT INTO public.social_publish_idempotency (
        user_id,
        organization_id,
        workspace_id,
        destination,
        idempotency_key,
        body_hash,
        status,
        lease_token,
        claimed_at,
        expires_at
    ) VALUES (
        p_user_id,
        p_organization_id,
        p_workspace_id,
        p_destination,
        p_idempotency_key,
        p_body_hash,
        ''IN_PROGRESS'',
        v_token,
        pg_catalog.now(),
        pg_catalog.now() + INTERVAL ''5 minutes''
    )
    ON CONFLICT (user_id, organization_id, workspace_id, destination, idempotency_key)
    DO NOTHING
    RETURNING id INTO v_claim_id;

    IF v_claim_id IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            ''claim_status'', ''CLAIMED_NEW'',
            ''claim_id'', v_claim_id,
            ''lease_token'', v_token,
            ''conflict'', false
        );
    END IF;

    -- The unique tuple can legitimately collide with a claim older than the
    -- 24-hour idempotency window. Re-read the conflicting row and recycle it
    -- instead of reporting a false concurrent-dispatch conflict.
    SELECT *
    INTO v_existing
    FROM public.social_publish_idempotency
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND destination = p_destination
      AND idempotency_key = p_idempotency_key
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_existing.created_at <= v_cutoff THEN
        UPDATE public.social_publish_idempotency
        SET body_hash = p_body_hash,
            status = ''IN_PROGRESS'',
            lease_token = v_token,
            post_id = NULL,
            external_receipt_id = NULL,
            platform_results = ''{}''::jsonb,
            error_message = NULL,
            retry_count = 0,
            claimed_at = pg_catalog.now(),
            completed_at = NULL,
            failed_at = NULL,
            expires_at = pg_catalog.now() + INTERVAL ''5 minutes'',
            created_at = pg_catalog.now(),
            updated_at = pg_catalog.now()
        WHERE id = v_existing.id;

        RETURN pg_catalog.jsonb_build_object(
            ''claim_status'', ''CLAIMED_REUSED_EXPIRED'',
            ''claim_id'', v_existing.id,
            ''lease_token'', v_token,
            ''conflict'', false,
            ''message'', ''Reused expired idempotency claim.''
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        ''claim_status'', ''IN_PROGRESS_CONFLICT'',
        ''claim_id'', CASE WHEN FOUND THEN v_existing.id ELSE NULL END,
        ''conflict'', true,
        ''message'', ''A publish dispatch with this exact payload is currently in flight.''
    );
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.claim_social_publish_dispatch(text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_social_publish_dispatch(text,text,text,text,text,text,text) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.complete_social_publish_dispatch(uuid,text,text,uuid,text,jsonb,text)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.complete_social_publish_dispatch(p_claim_id uuid, p_organization_id text, p_workspace_id text, p_post_id uuid DEFAULT NULL::uuid, p_external_receipt_id text DEFAULT NULL::text, p_platform_results jsonb DEFAULT ''{}''::jsonb, p_lease_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    v_rows INT;
BEGIN
    UPDATE public.social_publish_idempotency
    SET status = ''COMPLETED'',
        post_id = p_post_id,
        external_receipt_id = p_external_receipt_id,
        platform_results = p_platform_results,
        completed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_claim_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND status = ''IN_PROGRESS''
      AND (p_lease_token IS NULL OR lease_token = p_lease_token);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows = 1;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.complete_social_publish_dispatch(uuid,text,text,uuid,text,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_social_publish_dispatch(uuid,text,text,uuid,text,jsonb,text) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.fail_social_publish_dispatch(uuid,text,text,text,text)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.fail_social_publish_dispatch(p_claim_id uuid, p_organization_id text, p_workspace_id text, p_error_message text, p_lease_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    v_rows INT;
BEGIN
    UPDATE public.social_publish_idempotency
    SET status = ''FAILED'',
        error_message = p_error_message,
        failed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_claim_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND status = ''IN_PROGRESS''
      AND (p_lease_token IS NULL OR lease_token = p_lease_token);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows = 1;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.fail_social_publish_dispatch(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_social_publish_dispatch(uuid,text,text,text,text) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.get_org_edition(uuid)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.get_org_edition(p_org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    v_edition TEXT;
BEGIN
    SELECT COALESCE(s.edition, ''community'')
    INTO v_edition
    FROM public.subscriptions s
    WHERE s.organization_id = p_org_id
      AND s.status IN (''active'', ''trialing'')
    ORDER BY s.created_at DESC
    LIMIT 1;
    RETURN COALESCE(v_edition, ''community'');
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.get_org_edition(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_edition(uuid) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.get_user_organizations()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_organizations()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.get_user_organizations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.handle_new_user()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_org_name text;
  v_branch_name text;
  v_org_slug_base text;
  v_org_slug text;
  v_workspace_slug_base text;
  v_workspace_slug text;
  v_org_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, email, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>''full_name'', new.raw_user_meta_data->>''name'', split_part(new.email, ''@'', 1)),
    coalesce(new.raw_user_meta_data->>''avatar_url'', new.raw_user_meta_data->>''picture'', null),
    new.email,
    now()
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = now();

  v_org_name := nullif(trim(new.raw_user_meta_data->>''org_name''), '''');
  v_branch_name := coalesce(nullif(trim(new.raw_user_meta_data->>''branch_name''), ''''), ''Main Workspace'');

  -- Only owner-style Ralion registrations include org_name. Social/invited users
  -- without organization metadata are deliberately not auto-provisioned here.
  if v_org_name is not null then
    select o.id
      into v_org_id
      from public.organizations o
     where o.owner_id = new.id
     order by o.created_at asc
     limit 1;

    if v_org_id is null then
      v_org_slug_base := trim(both ''-'' from regexp_replace(lower(v_org_name), ''[^a-z0-9]+'', ''-'', ''g''));
      if v_org_slug_base is null or v_org_slug_base = '''' then
        v_org_slug_base := ''org-'' || substr(new.id::text, 1, 8);
      end if;

      v_org_slug := v_org_slug_base;
      if exists(select 1 from public.organizations where slug = v_org_slug) then
        v_org_slug := v_org_slug_base || ''-'' || substr(new.id::text, 1, 8);
      end if;

      insert into public.organizations (name, slug, owner_id)
      values (v_org_name, v_org_slug, new.id)
      returning id into v_org_id;
    end if;

    if not exists (
      select 1
        from public.workspaces w
       where w.owner_id = new.id
         and w.organization_id = v_org_id
    ) then
      v_workspace_slug_base := trim(both ''-'' from regexp_replace(lower(v_branch_name), ''[^a-z0-9]+'', ''-'', ''g''));
      if v_workspace_slug_base is null or v_workspace_slug_base = '''' then
        v_workspace_slug_base := ''main'';
      end if;

      v_workspace_slug := v_workspace_slug_base;
      if exists(
        select 1 from public.workspaces
         where organization_id = v_org_id and slug = v_workspace_slug
      ) then
        v_workspace_slug := v_workspace_slug_base || ''-'' || substr(new.id::text, 1, 8);
      end if;

      insert into public.workspaces (organization_id, name, slug, owner_id)
      values (v_org_id, v_branch_name, v_workspace_slug, new.id);
    end if;
  end if;

  return new;
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.handle_social_tables_updated_at()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.handle_social_tables_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.handle_social_tables_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_social_tables_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_social_tables_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_social_tables_updated_at() TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.handle_updated_at()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.has_permission(text)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.role_permissions rp ON om.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE om.user_id = auth.uid() AND p.name = permission_name
    ) INTO has_perm;
    RETURN has_perm;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.has_product_access(text)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.has_product_access(p_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_products up
        JOIN public.products p ON up.product_id = p.id
        WHERE up.user_id = auth.uid() AND p.slug = p_slug AND up.status = ''active''
    ) INTO has_access;
    RETURN has_access;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.has_product_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_product_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_product_access(text) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.log_ralion_audit()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.log_ralion_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
BEGIN
    INSERT INTO public.audit_logs (organization_id, user_id, action, module, metadata)
    VALUES (
        NEW.organization_id,
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        jsonb_build_object(''record_id'', NEW.id)
    );
    RETURN NEW;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.log_ralion_audit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_ralion_audit() TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.match_knowledge(vector,double precision,integer,uuid)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.match_knowledge(query_embedding vector, match_threshold double precision DEFAULT 0.78, match_count integer DEFAULT 5, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, title text, content text, source_type text, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        mk.id,
        mk.title,
        mk.content,
        mk.source_type,
        1 - (mk.embedding <=> query_embedding) AS similarity
    FROM public.mari_knowledge mk
    WHERE
        (p_organization_id IS NULL OR mk.organization_id = p_organization_id)
        AND 1 - (mk.embedding <=> query_embedding) > match_threshold
    ORDER BY mk.embedding <=> query_embedding
    LIMIT match_count;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector,double precision,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector,double precision,integer,uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector,double precision,integer,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector,double precision,integer,uuid) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.org_has_feature(uuid,text)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.org_has_feature(p_org_id uuid, p_feature_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.subscriptions s
        JOIN public.plan_features pf ON s.plan_id = pf.plan_id
        JOIN public.features f ON pf.feature_id = f.id
        WHERE s.organization_id = p_org_id
          AND s.status IN (''active'', ''trialing'')
          AND f.slug = p_feature_slug
    ) INTO has_access;
    RETURN COALESCE(has_access, FALSE);
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.org_has_feature(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_has_feature(uuid,text) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_adjust_credits(uuid,uuid,integer,text,text,jsonb)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_adjust_credits(p_org uuid, p_user uuid, p_amount integer, p_correlation_id text, p_reason text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  w public.tenant_credit_wallets;
  existing public.tenant_credit_ledger;
  before_total integer;
  after_total integer;
  bonus_before integer;
  bonus_after integer;
  applied integer;
begin
  if p_amount = 0 then raise exception ''Adjustment amount must be non-zero''; end if;
  if nullif(trim(p_correlation_id), '''') is null then raise exception ''Correlation id is required''; end if;
  if nullif(trim(p_reason), '''') is null then raise exception ''Reason is required''; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into existing from public.tenant_credit_ledger
  where organization_id = p_org and correlation_id = p_correlation_id and type = ''ADMIN_ADJUSTMENT'' limit 1;
  if found then
    select * into w from public.tenant_credit_wallets where organization_id = p_org;
    return jsonb_build_object(
      ''success'', true, ''idempotent'', true, ''transactionId'', existing.id,
      ''amount'', existing.amount,
      ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
    );
  end if;
  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;
  if not found then raise exception ''Credit wallet not initialized''; end if;
  before_total := w.remaining_plan_credits + w.remaining_bonus_credits;
  bonus_before := w.remaining_bonus_credits;
  if p_amount > 0 then
    applied := p_amount;
    bonus_after := bonus_before + p_amount;
  else
    applied := -least(abs(p_amount), greatest(0, before_total - w.reserved_credits));
    if abs(applied) <= bonus_before then
      bonus_after := bonus_before - abs(applied);
    else
      bonus_after := 0;
      w.remaining_plan_credits := greatest(0, w.remaining_plan_credits - (abs(applied) - bonus_before));
    end if;
  end if;
  update public.tenant_credit_wallets
  set remaining_plan_credits = w.remaining_plan_credits,
      remaining_bonus_credits = bonus_after,
      lifetime_credits_granted = lifetime_credits_granted + case when applied > 0 then applied else 0 end,
      lifetime_credits_consumed = lifetime_credits_consumed + case when applied < 0 then abs(applied) else 0 end,
      updated_at = now()
  where organization_id = p_org returning * into w;
  after_total := w.remaining_plan_credits + w.remaining_bonus_credits;
  insert into public.tenant_credit_ledger (
    organization_id, user_id, amount, balance_before, balance_after,
    plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
    type, source_feature, correlation_id, reason, metadata
  ) values (
    p_org, p_user, applied, before_total, after_total,
    case when applied < 0 and abs(applied) > bonus_before then w.remaining_plan_credits + (abs(applied) - bonus_before) else w.remaining_plan_credits end,
    w.remaining_plan_credits, bonus_before, w.remaining_bonus_credits,
    ''ADMIN_ADJUSTMENT'', ''ADMIN'', p_correlation_id, p_reason, coalesce(p_metadata, ''{}''::jsonb)
  ) returning * into existing;
  return jsonb_build_object(
    ''success'', true, ''idempotent'', false, ''transactionId'', existing.id,
    ''amount'', applied,
    ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
  );
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_adjust_credits(uuid,uuid,integer,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_adjust_credits(uuid,uuid,integer,text,text,jsonb) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_claim_billing_webhook(text,text,text,text,uuid,boolean,text,jsonb)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_claim_billing_webhook(p_provider text, p_event_id text, p_event_type text, p_resource_id text DEFAULT NULL::text, p_organization_id uuid DEFAULT NULL::uuid, p_signature_valid boolean DEFAULT false, p_payload_hash text DEFAULT NULL::text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  existing public.billing_webhook_events;
begin
  if nullif(trim(p_provider), '''') is null or nullif(trim(p_event_id), '''') is null then
    raise exception ''provider and event id are required'';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_provider || '':'' || p_event_id, 0));
  select * into existing from public.billing_webhook_events
  where provider = p_provider and event_id = p_event_id for update;
  if found and existing.status in (''PROCESSING'', ''PROCESSED'', ''IGNORED'') then
    return jsonb_build_object(''claimed'', false, ''status'', existing.status, ''id'', existing.id);
  end if;
  if found then
    update public.billing_webhook_events
    set event_type = p_event_type,
        resource_id = coalesce(p_resource_id, resource_id),
        organization_id = coalesce(p_organization_id, organization_id),
        status = ''PROCESSING'', signature_valid = p_signature_valid,
        payload_hash = coalesce(p_payload_hash, payload_hash), error = null,
        processed_at = null, metadata = metadata || coalesce(p_metadata, ''{}''::jsonb), received_at = now()
    where id = existing.id returning * into existing;
  else
    insert into public.billing_webhook_events (
      provider, event_id, event_type, resource_id, organization_id,
      status, signature_valid, payload_hash, metadata
    ) values (
      p_provider, p_event_id, p_event_type, p_resource_id, p_organization_id,
      ''PROCESSING'', p_signature_valid, p_payload_hash, coalesce(p_metadata, ''{}''::jsonb)
    ) returning * into existing;
  end if;
  return jsonb_build_object(''claimed'', true, ''status'', existing.status, ''id'', existing.id);
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_claim_billing_webhook(text,text,text,text,uuid,boolean,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_claim_billing_webhook(text,text,text,text,uuid,boolean,text,jsonb) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_consume_api_key_rate_limit(uuid,integer)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_consume_api_key_rate_limit(p_api_key_id uuid, p_limit integer)
 RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO ''public''
AS $function$
declare
  v_window_start timestamptz := date_trunc(''minute'', now());
  v_effective_window timestamptz;
  v_count integer;
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
begin
  insert into public.developer_api_key_rate_limits (api_key_id, window_start, request_count)
  values (p_api_key_id, v_window_start, 1)
  on conflict (api_key_id)
  do update set
    window_start = case
      when public.developer_api_key_rate_limits.window_start < v_window_start then v_window_start
      else public.developer_api_key_rate_limits.window_start
    end,
    request_count = case
      when public.developer_api_key_rate_limits.window_start < v_window_start then 1
      else public.developer_api_key_rate_limits.request_count + 1
    end
  returning request_count, window_start into v_count, v_effective_window;

  return query
  select
    v_count <= v_limit,
    greatest(v_limit - v_count, 0),
    v_effective_window + interval ''1 minute'';
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_consume_api_key_rate_limit(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_consume_api_key_rate_limit(uuid,integer) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_finalize_credits(uuid,text,boolean,text,text,jsonb)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_finalize_credits(p_org uuid, p_correlation_id text, p_success boolean, p_provider text DEFAULT NULL::text, p_model text DEFAULT NULL::text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  w public.tenant_credit_wallets;
  r public.tenant_credit_reservations;
  plan_before integer;
  bonus_before integer;
  balance_before integer;
  plan_use integer;
  bonus_use integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into r from public.tenant_credit_reservations
    where organization_id = p_org and correlation_id = p_correlation_id for update;
  if not found then
    return jsonb_build_object(''success'', false, ''status'', ''NOT_FOUND'');
  end if;

  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;
  if r.status = ''CHARGED'' or r.status = ''RELEASED'' then
    return jsonb_build_object(
      ''success'', r.status = ''CHARGED'', ''status'', r.status,
      ''creditsDeducted'', case when r.status = ''CHARGED'' then r.amount else 0 end,
      ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
    );
  end if;

  if not p_success then
    update public.tenant_credit_wallets set
      reserved_credits = greatest(0, reserved_credits - r.amount), updated_at = now()
      where organization_id = p_org returning * into w;
    update public.tenant_credit_reservations set
      status = ''RELEASED'', provider = coalesce(p_provider, provider), model = coalesce(p_model, model),
      metadata = metadata || coalesce(p_metadata, ''{}''::jsonb), finalized_at = now()
      where id = r.id;
    return jsonb_build_object(''success'', true, ''status'', ''RELEASED'', ''creditsDeducted'', 0,
      ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
  end if;

  plan_before := w.remaining_plan_credits;
  bonus_before := w.remaining_bonus_credits;
  balance_before := plan_before + bonus_before;
  plan_use := least(r.amount, plan_before);
  bonus_use := r.amount - plan_use;

  update public.tenant_credit_wallets set
    remaining_plan_credits = greatest(0, remaining_plan_credits - plan_use),
    remaining_bonus_credits = greatest(0, remaining_bonus_credits - bonus_use),
    reserved_credits = greatest(0, reserved_credits - r.amount),
    lifetime_credits_consumed = lifetime_credits_consumed + r.amount,
    updated_at = now()
  where organization_id = p_org returning * into w;

  update public.tenant_credit_reservations set
    status = ''CHARGED'', provider = coalesce(p_provider, provider), model = coalesce(p_model, model),
    metadata = metadata || coalesce(p_metadata, ''{}''::jsonb), finalized_at = now()
  where id = r.id;

  insert into public.tenant_credit_ledger (
    organization_id, user_id, amount, balance_before, balance_after,
    plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
    type, source_feature, provider, model, correlation_id, reason, metadata
  ) values (
    p_org, r.user_id, -r.amount, balance_before, w.remaining_plan_credits + w.remaining_bonus_credits,
    plan_before, w.remaining_plan_credits, bonus_before, w.remaining_bonus_credits,
    ''CONSUMPTION'', r.source_feature, coalesce(p_provider, r.provider), coalesce(p_model, r.model),
    r.correlation_id, r.reason, r.metadata || coalesce(p_metadata, ''{}''::jsonb)
  ) on conflict do nothing;

  return jsonb_build_object(''success'', true, ''status'', ''CHARGED'', ''creditsDeducted'', r.amount,
    ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_finalize_credits(uuid,text,boolean,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_finalize_credits(uuid,text,boolean,text,text,jsonb) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_get_credit_summary(uuid,text,integer)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_get_credit_summary(p_org uuid, p_plan_id text, p_monthly_quota integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  w public.tenant_credit_wallets;
  used integer;
  available integer;
begin
  select * into w from public.ralion_sync_credit_wallet(p_org, p_plan_id, p_monthly_quota);
  used := greatest(0, w.monthly_quota - w.remaining_plan_credits);
  available := greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits);
  return jsonb_build_object(
    ''organizationId'', w.organization_id,
    ''planId'', w.plan_id,
    ''monthlyQuota'', w.monthly_quota,
    ''allocatedCredits'', w.monthly_quota + w.remaining_bonus_credits,
    ''usedCredits'', used,
    ''reservedCredits'', w.reserved_credits,
    ''remainingCredits'', available,
    ''planCreditsRemaining'', w.remaining_plan_credits,
    ''bonusCreditsRemaining'', w.remaining_bonus_credits,
    ''utilizationRate'', case when w.monthly_quota > 0 then round((used::numeric / w.monthly_quota::numeric) * 100, 2) else 0 end,
    ''periodStart'', w.period_start,
    ''periodEnd'', w.period_end,
    ''lifetimeCreditsGranted'', w.lifetime_credits_granted,
    ''lifetimeCreditsConsumed'', w.lifetime_credits_consumed
  );
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_get_credit_summary(uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_get_credit_summary(uuid,text,integer) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_reserve_credits(uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_reserve_credits(p_org uuid, p_user uuid, p_correlation_id text, p_plan_id text, p_monthly_quota integer, p_amount integer, p_source_feature text, p_provider text DEFAULT NULL::text, p_model text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  w public.tenant_credit_wallets;
  r public.tenant_credit_reservations;
  available integer;
begin
  if p_amount <= 0 then raise exception ''Reservation amount must be positive''; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into w from public.ralion_sync_credit_wallet(p_org, p_plan_id, p_monthly_quota);

  select * into r from public.tenant_credit_reservations
    where organization_id = p_org and correlation_id = p_correlation_id;
  if found then
    return jsonb_build_object(
      ''allowed'', r.status in (''RESERVED'',''CHARGED''),
      ''status'', r.status,
      ''reservationId'', r.id,
      ''amount'', r.amount,
      ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
    );
  end if;

  available := greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits);
  if available < p_amount then
    return jsonb_build_object(''allowed'', false, ''status'', ''INSUFFICIENT_CREDITS'', ''amount'', p_amount, ''remainingCredits'', available);
  end if;

  insert into public.tenant_credit_reservations (
    organization_id, user_id, correlation_id, amount, status, source_feature, provider, model, reason, metadata
  ) values (
    p_org, p_user, p_correlation_id, p_amount, ''RESERVED'', p_source_feature, p_provider, p_model, p_reason, coalesce(p_metadata, ''{}''::jsonb)
  ) returning * into r;

  update public.tenant_credit_wallets
    set reserved_credits = reserved_credits + p_amount, updated_at = now()
    where organization_id = p_org
    returning * into w;

  return jsonb_build_object(
    ''allowed'', true, ''status'', ''RESERVED'', ''reservationId'', r.id, ''amount'', p_amount,
    ''remainingCredits'', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
  );
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_reserve_credits(uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_reserve_credits(uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.ralion_sync_credit_wallet(uuid,text,integer)') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.ralion_sync_credit_wallet(p_org uuid, p_plan_id text, p_monthly_quota integer)
 RETURNS tenant_credit_wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  w public.tenant_credit_wallets;
  current_start date := date_trunc(''month'', current_date)::date;
  current_end date := (date_trunc(''month'', current_date) + interval ''1 month'')::date;
  old_used integer := 0;
  new_remaining integer := 0;
  stale_reserved integer := 0;
begin
  if p_plan_id not in (''COMMUNITY'',''STARTER'',''PROFESSIONAL'',''ENTERPRISE'') then
    raise exception ''Invalid plan id'';
  end if;
  if p_monthly_quota < 0 then raise exception ''Invalid monthly quota''; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));

  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;
  if not found then
    insert into public.tenant_credit_wallets (
      organization_id, plan_id, monthly_quota, remaining_plan_credits, remaining_bonus_credits,
      reserved_credits, lifetime_credits_granted, lifetime_credits_consumed,
      period_start, period_end, last_renewal_at, next_renewal_at
    ) values (
      p_org, p_plan_id, p_monthly_quota, p_monthly_quota, 0,
      0, p_monthly_quota, 0,
      current_start, current_end, now(), current_end::timestamptz
    ) returning * into w;

    insert into public.tenant_credit_ledger (
      organization_id, amount, balance_before, balance_after,
      plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
      type, source_feature, reason, metadata
    ) values (
      p_org, p_monthly_quota, 0, p_monthly_quota,
      0, p_monthly_quota, 0, 0,
      ''SUBSCRIPTION_RENEWAL'', ''MARI_CREDITS'', ''Initial monthly Mari credit allocation'',
      jsonb_build_object(''plan_id'', p_plan_id, ''monthly_quota'', p_monthly_quota)
    );
    return w;
  end if;

  -- Recover reservations left behind by a crashed/timed-out app instance.
  -- A normal Mari provider request should finalize well inside this window.
  with stale as (
    update public.tenant_credit_reservations
      set status = ''RELEASED'',
          finalized_at = now(),
          metadata = metadata || jsonb_build_object(''release_reason'',''stale_reservation_recovery'')
      where organization_id = p_org
        and status = ''RESERVED''
        and created_at < now() - interval ''15 minutes''
      returning amount
  )
  select coalesce(sum(amount), 0)::integer into stale_reserved from stale;

  if stale_reserved > 0 then
    update public.tenant_credit_wallets
      set reserved_credits = greatest(0, reserved_credits - stale_reserved),
          updated_at = now()
      where organization_id = p_org
      returning * into w;
  end if;

  if w.period_start <> current_start then
    update public.tenant_credit_reservations
      set status = ''RELEASED'', finalized_at = now(), metadata = metadata || jsonb_build_object(''release_reason'',''period_rollover'')
      where organization_id = p_org and status = ''RESERVED'';

    insert into public.tenant_credit_ledger (
      organization_id, amount, balance_before, balance_after,
      plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
      type, source_feature, reason, metadata
    ) values (
      p_org, p_monthly_quota,
      w.remaining_plan_credits + w.remaining_bonus_credits,
      p_monthly_quota + w.remaining_bonus_credits,
      w.remaining_plan_credits, p_monthly_quota,
      w.remaining_bonus_credits, w.remaining_bonus_credits,
      ''SUBSCRIPTION_RENEWAL'', ''MARI_CREDITS'', ''Monthly Mari credit renewal'',
      jsonb_build_object(''plan_id'', p_plan_id, ''monthly_quota'', p_monthly_quota)
    );

    update public.tenant_credit_wallets set
      plan_id = p_plan_id,
      monthly_quota = p_monthly_quota,
      remaining_plan_credits = p_monthly_quota,
      reserved_credits = 0,
      lifetime_credits_granted = lifetime_credits_granted + p_monthly_quota,
      period_start = current_start,
      period_end = current_end,
      last_renewal_at = now(),
      next_renewal_at = current_end::timestamptz,
      updated_at = now()
    where organization_id = p_org
    returning * into w;
    return w;
  end if;

  if w.plan_id <> p_plan_id or w.monthly_quota <> p_monthly_quota then
    old_used := greatest(0, w.monthly_quota - w.remaining_plan_credits);
    new_remaining := greatest(0, p_monthly_quota - old_used);
    update public.tenant_credit_wallets set
      plan_id = p_plan_id,
      monthly_quota = p_monthly_quota,
      remaining_plan_credits = new_remaining,
      lifetime_credits_granted = lifetime_credits_granted + greatest(0, p_monthly_quota - w.monthly_quota),
      updated_at = now()
    where organization_id = p_org
    returning * into w;
  end if;

  return w;
end;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.ralion_sync_credit_wallet(uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ralion_sync_credit_wallet(uuid,text,integer) TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.rls_auto_enable()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog''
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN (''CREATE TABLE'', ''CREATE TABLE AS'', ''SELECT INTO'')
      AND object_type IN (''table'',''partitioned table'')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN (''public'') AND cmd.schema_name NOT IN (''pg_catalog'',''information_schema'') AND cmd.schema_name NOT LIKE ''pg_toast%'' AND cmd.schema_name NOT LIKE ''pg_temp%'' THEN
      BEGIN
        EXECUTE format(''alter table if exists %s enable row level security'', cmd.object_identity);
        RAISE LOG ''rls_auto_enable: enabled RLS on %'', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG ''rls_auto_enable: failed to enable RLS on %'', cmd.object_identity;
      END;
     ELSE
        RAISE LOG ''rls_auto_enable: skip % (either system schema or not in enforced list: %.)'', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
DO $baseline$ BEGIN IF to_regprocedure('public.update_updated_at_column()') IS NULL THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
'; END IF; END $baseline$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
DO $baseline$ BEGIN IF to_regclass('public.social_accounts_safe') IS NULL THEN EXECUTE 'CREATE VIEW public."social_accounts_safe" WITH (security_invoker=on) AS  SELECT id,
    user_id,
    provider,
    account_handle,
    account_label,
    followers_count,
    avatar_url,
    page_id,
    scopes,
    status,
    connected_at,
    last_synced_at,
    expires_at,
    extra_meta
   FROM social_account_tokens;'; END IF; END $baseline$;
DO $baseline$ BEGIN IF to_regclass('public.social_connections_safe') IS NULL THEN EXECUTE 'CREATE VIEW public."social_connections_safe" WITH (security_invoker=on) AS  SELECT id,
    user_id,
    organization_id,
    workspace_id,
    provider,
    provider_account_id,
    account_name,
    username,
    profile_image_url,
    account_type,
    connection_status,
    token_status,
    scopes,
    capabilities,
    metadata,
    followers_count,
    infrastructure_provider,
    zernio_account_id,
    zernio_profile_id,
    last_sync_at,
    last_health_check_at,
    health_error_message,
    connected_at,
    created_at,
    updated_at
   FROM social_connections;'; END IF; END $baseline$;
CREATE INDEX IF NOT EXISTS audit_logs_org_created_idx ON public.audit_logs USING btree (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx ON public.audit_logs USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_checkout_references_org_created_idx ON public.billing_checkout_references USING btree (organization_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS billing_checkout_references_provider_subscription_idx ON public.billing_checkout_references USING btree (provider, provider_subscription_id) WHERE (provider_subscription_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS billing_webhook_events_org_received_idx ON public.billing_webhook_events USING btree (organization_id, received_at DESC);
CREATE INDEX IF NOT EXISTS calendar_events_workspace_start_idx ON public.calendar_events USING btree (workspace_id, start_at);
CREATE INDEX IF NOT EXISTS customers_workspace_created_idx ON public.customers USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customers_workspace_email_idx ON public.customers USING btree (workspace_id, lower(email));
CREATE INDEX IF NOT EXISTS deals_workspace_customer_idx ON public.deals USING btree (workspace_id, customer_id) WHERE (customer_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS deals_workspace_stage_created_idx ON public.deals USING btree (workspace_id, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS developer_api_keys_active_hash_idx ON public.developer_api_keys USING btree (key_hash) WHERE (revoked_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS developer_api_keys_key_hash_unique ON public.developer_api_keys USING btree (key_hash);
CREATE INDEX IF NOT EXISTS developer_api_keys_org_created_idx ON public.developer_api_keys USING btree (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS developer_api_keys_workspace_idx ON public.developer_api_keys USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_chunks_search_idx ON public.document_chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS document_chunks_workspace_idx ON public.document_chunks USING btree (workspace_id, document_id);
CREATE INDEX IF NOT EXISTS documents_workspace_created_idx ON public.documents USING btree (workspace_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS documents_workspace_path_uidx ON public.documents USING btree (workspace_id, file_path);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_mari_request_id ON public.audit_logs USING btree (organization_id, ((metadata ->> 'requestId'::text))) WHERE ((module = 'MARI_AI'::text) AND (action = 'MARI_AI_QUERY'::text) AND (metadata ? 'requestId'::text));
CREATE INDEX IF NOT EXISTS idx_audit_logs_mari_usage_created ON public.audit_logs USING btree (organization_id, created_at DESC) WHERE ((module = 'MARI_AI'::text) AND (action = 'MARI_AI_QUERY'::text));
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_consumption_correlation ON public.tenant_credit_ledger USING btree (organization_id, correlation_id) WHERE ((type = 'CONSUMPTION'::text) AND (correlation_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_credit_ledger_org_created ON public.tenant_credit_ledger USING btree (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_reservations_org_status ON public.tenant_credit_reservations USING btree (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mari_marketing_experiments_source ON public.mari_marketing_experiments USING btree (organization_id, workspace_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_mari_marketing_experiments_tenant ON public.mari_marketing_experiments USING btree (organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mari_marketing_learnings_tenant ON public.mari_marketing_learnings USING btree (organization_id, workspace_id, confidence DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mari_marketing_outcomes_tenant ON public.mari_marketing_outcomes USING btree (organization_id, workspace_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_conn_infra ON public.social_connections USING btree (infrastructure_provider);
CREATE INDEX IF NOT EXISTS idx_social_conn_user_id ON public.social_connections USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_zernio_acc ON public.social_connections USING btree (zernio_account_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_zernio_prof ON public.social_connections USING btree (zernio_profile_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platforms ON public.social_posts USING gin (platforms);
CREATE INDEX IF NOT EXISTS idx_social_posts_status_created ON public.social_posts USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_tenant_created ON public.social_posts USING btree (organization_id, workspace_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON public.social_posts USING btree (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_social_publish_idempotency_hash_lookup ON public.social_publish_idempotency USING btree (user_id, organization_id, workspace_id, destination, body_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_social_publish_idempotency_post_id ON public.social_publish_idempotency USING btree (post_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_user_id ON public.social_account_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_user_provider ON public.social_account_tokens USING btree (user_id, provider);
CREATE INDEX IF NOT EXISTS idx_sp_prof_org ON public.social_provider_profiles USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_pid ON public.social_provider_profiles USING btree (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_user ON public.social_provider_profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_ws ON public.social_provider_profiles USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_sp_routing_platform ON public.social_provider_routing USING btree (platform);
CREATE INDEX IF NOT EXISTS idx_sp_routing_ws ON public.social_provider_routing USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_swe_account_id ON public.social_webhook_events USING btree (provider_account_id);
CREATE INDEX IF NOT EXISTS idx_swe_created_at ON public.social_webhook_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swe_profile_id ON public.social_webhook_events USING btree (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_swe_provider ON public.social_webhook_events USING btree (provider);
CREATE INDEX IF NOT EXISTS mari_api_keys_active_idx ON public.mari_api_keys USING btree (organization_id, workspace_id, status) WHERE (status = 'ACTIVE'::text);
CREATE INDEX IF NOT EXISTS mari_api_keys_created_by_idx ON public.mari_api_keys USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE INDEX IF NOT EXISTS mari_api_keys_org_workspace_idx ON public.mari_api_keys USING btree (organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_api_keys_workspace_idx ON public.mari_api_keys USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS mari_api_usage_key_created_idx ON public.mari_api_usage USING btree (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_api_usage_org_workspace_created_idx ON public.mari_api_usage USING btree (organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_api_usage_workspace_idx ON public.mari_api_usage USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS mari_competitor_briefings_org_idx ON public.mari_competitor_briefings USING btree (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_competitor_observations_competitor_idx ON public.mari_competitor_observations USING btree (competitor_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS mari_competitor_observations_org_idx ON public.mari_competitor_observations USING btree (organization_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS mari_competitor_watchlist_due_idx ON public.mari_competitor_watchlist USING btree (status, next_scan_at);
CREATE INDEX IF NOT EXISTS mari_competitor_watchlist_org_idx ON public.mari_competitor_watchlist USING btree (organization_id);
CREATE INDEX IF NOT EXISTS mari_competitor_watchlist_workspace_idx ON public.mari_competitor_watchlist USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS mari_embed_widgets_active_token_idx ON public.mari_embed_widgets USING btree (public_token) WHERE (status = 'ACTIVE'::text);
CREATE INDEX IF NOT EXISTS mari_embed_widgets_created_by_idx ON public.mari_embed_widgets USING btree (created_by);
CREATE INDEX IF NOT EXISTS mari_embed_widgets_org_workspace_idx ON public.mari_embed_widgets USING btree (organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_embed_widgets_workspace_idx ON public.mari_embed_widgets USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_knowledge_embedding_idx ON public.mari_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX IF NOT EXISTS mari_voice_usage_org_started_idx ON public.mari_voice_usage_sessions USING btree (organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS mari_widget_sessions_expiry_idx ON public.mari_widget_sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS mari_widget_sessions_organization_idx ON public.mari_widget_sessions USING btree (organization_id);
CREATE INDEX IF NOT EXISTS mari_widget_sessions_token_idx ON public.mari_widget_sessions USING btree (token_hash);
CREATE INDEX IF NOT EXISTS mari_widget_sessions_widget_idx ON public.mari_widget_sessions USING btree (widget_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS mari_widget_sessions_workspace_idx ON public.mari_widget_sessions USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS mari_widget_usage_org_workspace_created_idx ON public.mari_widget_usage USING btree (organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_widget_usage_session_created_idx ON public.mari_widget_usage USING btree (session_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_widget_usage_widget_created_idx ON public.mari_widget_usage USING btree (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mari_widget_usage_workspace_idx ON public.mari_widget_usage USING btree (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_transaction_idx ON public.payments USING btree (payment_provider, transaction_id);
CREATE INDEX IF NOT EXISTS social_posts_connection_created_idx ON public.social_posts USING btree (social_connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_provider_profiles_account_id_idx ON public.social_provider_profiles USING btree (account_id) WHERE (account_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_external_provider_id_idx ON public.subscriptions USING btree (payment_provider, external_subscription_id) WHERE (external_subscription_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_per_organization_idx ON public.subscriptions USING btree (organization_id);
CREATE INDEX IF NOT EXISTS tasks_workspace_status_due_idx ON public.tasks USING btree (workspace_id, status, due_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mari_marketing_experiment_source ON public.mari_marketing_experiments USING btree (organization_id, workspace_id, source_type, source_id) WHERE (source_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mari_marketing_outcome_metrics ON public.mari_marketing_outcomes USING btree (experiment_id, metrics_hash) WHERE (metrics_hash IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_publish_idempotency_tuple ON public.social_publish_idempotency USING btree (user_id, organization_id, workspace_id, destination, idempotency_key);
CREATE INDEX IF NOT EXISTS workflow_runs_workspace_started_idx ON public.workflow_runs USING btree (workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS workflows_workspace_trigger_idx ON public.workflows USING btree (workspace_id, trigger_event, is_active);
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_memory' AND policyname='AI Memory isolation') THEN EXECUTE 'CREATE POLICY "AI Memory isolation" ON public."ai_memory" AS PERMISSIVE FOR ALL TO PUBLIC USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='System can insert audit logs') THEN EXECUTE 'CREATE POLICY "System can insert audit logs" ON public."audit_logs" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)) OR (user_id = auth.uid())))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Users can view org audit logs') THEN EXECUTE 'CREATE POLICY "Users can view org audit logs" ON public."audit_logs" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='desktop_events' AND policyname='Org members view their events') THEN EXECUTE 'CREATE POLICY "Org members view their events" ON public."desktop_events" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)) OR (user_id = auth.uid())))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='desktop_events' AND policyname='System inserts desktop events') THEN EXECUTE 'CREATE POLICY "System inserts desktop events" ON public."desktop_events" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='Admins view devices') THEN EXECUTE 'CREATE POLICY "Admins view devices" ON public."devices" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='Users register own devices') THEN EXECUTE 'CREATE POLICY "Users register own devices" ON public."devices" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='Users update own devices') THEN EXECUTE 'CREATE POLICY "Users update own devices" ON public."devices" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='download_releases' AND policyname='Anyone can view download releases') THEN EXECUTE 'CREATE POLICY "Anyone can view download releases" ON public."download_releases" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='downloads' AND policyname='Admins view download analytics') THEN EXECUTE 'CREATE POLICY "Admins view download analytics" ON public."downloads" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='downloads' AND policyname='Anyone can log downloads') THEN EXECUTE 'CREATE POLICY "Anyone can log downloads" ON public."downloads" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enterprise_sso_configs' AND policyname='Org admins view SSO config') THEN EXECUTE 'CREATE POLICY "Org admins view SSO config" ON public."enterprise_sso_configs" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='features' AND policyname='Anyone can view features') THEN EXECUTE 'CREATE POLICY "Anyone can view features" ON public."features" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='government_citizen_cases' AND policyname='Government workers view cases') THEN EXECUTE 'CREATE POLICY "Government workers view cases" ON public."government_citizen_cases" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='growth_campaigns' AND policyname='Org members manage campaigns') THEN EXECUTE 'CREATE POLICY "Org members manage campaigns" ON public."growth_campaigns" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='growth_content' AND policyname='Org members manage growth content') THEN EXECUTE 'CREATE POLICY "Org members manage growth content" ON public."growth_content" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='health_appointments' AND policyname='Org professionals manage appointments') THEN EXECUTE 'CREATE POLICY "Org professionals manage appointments" ON public."health_appointments" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='health_cases' AND policyname='Org professionals manage cases') THEN EXECUTE 'CREATE POLICY "Org professionals manage cases" ON public."health_cases" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='health_clients' AND policyname='Health professionals access org clients') THEN EXECUTE 'CREATE POLICY "Health professionals access org clients" ON public."health_clients" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='licenses' AND policyname='Users can view org licenses') THEN EXECUTE 'CREATE POLICY "Users can view org licenses" ON public."licenses" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='logistics_drivers' AND policyname='Org members manage drivers') THEN EXECUTE 'CREATE POLICY "Org members manage drivers" ON public."logistics_drivers" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='logistics_shipments' AND policyname='Org members manage shipments') THEN EXECUTE 'CREATE POLICY "Org members manage shipments" ON public."logistics_shipments" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='logistics_tracking_events' AND policyname='Org members view tracking') THEN EXECUTE 'CREATE POLICY "Org members view tracking" ON public."logistics_tracking_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ((shipment_id IN ( SELECT logistics_shipments.id
   FROM logistics_shipments
  WHERE (logistics_shipments.organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='logistics_vehicles' AND policyname='Org members manage vehicles') THEN EXECUTE 'CREATE POLICY "Org members manage vehicles" ON public."logistics_vehicles" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_activity_logs' AND policyname='Org members view activity logs') THEN EXECUTE 'CREATE POLICY "Org members view activity logs" ON public."mari_activity_logs" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_activity_logs' AND policyname='System inserts activity logs') THEN EXECUTE 'CREATE POLICY "System inserts activity logs" ON public."mari_activity_logs" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_conversations' AND policyname='Users manage own conversations') THEN EXECUTE 'CREATE POLICY "Users manage own conversations" ON public."mari_conversations" AS PERMISSIVE FOR ALL TO PUBLIC USING (((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)) AND (user_id = auth.uid())))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_knowledge' AND policyname='Users access org knowledge') THEN EXECUTE 'CREATE POLICY "Users access org knowledge" ON public."mari_knowledge" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_messages' AND policyname='Users access messages of their conversations') THEN EXECUTE 'CREATE POLICY "Users access messages of their conversations" ON public."mari_messages" AS PERMISSIVE FOR ALL TO PUBLIC USING ((conversation_id IN ( SELECT mari_conversations.id
   FROM mari_conversations
  WHERE (mari_conversations.user_id = auth.uid()))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_settings' AND policyname='Org owners manage AI settings') THEN EXECUTE 'CREATE POLICY "Org owners manage AI settings" ON public."mari_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mari_workflows' AND policyname='Users manage org workflows') THEN EXECUTE 'CREATE POLICY "Users manage org workflows" ON public."mari_workflows" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marketplace_items' AND policyname='Anyone can view active marketplace items') THEN EXECUTE 'CREATE POLICY "Anyone can view active marketplace items" ON public."marketplace_items" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((status = ''active''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='modules' AND policyname='Anyone can view modules') THEN EXECUTE 'CREATE POLICY "Anyone can view modules" ON public."modules" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can view and manage their notifications') THEN EXECUTE 'CREATE POLICY "Users can view and manage their notifications" ON public."notifications" AS PERMISSIVE FOR ALL TO PUBLIC USING ((user_id = auth.uid()))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organization_members' AND policyname='Users can view members of their organizations') THEN EXECUTE 'CREATE POLICY "Users can view members of their organizations" ON public."organization_members" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organization_modules' AND policyname='Org members view their modules') THEN EXECUTE 'CREATE POLICY "Org members view their modules" ON public."organization_modules" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='Users can view their organizations') THEN EXECUTE 'CREATE POLICY "Users can view their organizations" ON public."organizations" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='Org members view payments') THEN EXECUTE 'CREATE POLICY "Org members view payments" ON public."payments" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='System inserts payments') THEN EXECUTE 'CREATE POLICY "System inserts payments" ON public."payments" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='permissions' AND policyname='Anyone can view permissions') THEN EXECUTE 'CREATE POLICY "Anyone can view permissions" ON public."permissions" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plan_features' AND policyname='Anyone can view plan features') THEN EXECUTE 'CREATE POLICY "Anyone can view plan features" ON public."plan_features" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Anyone can view products') THEN EXECUTE 'CREATE POLICY "Anyone can view products" ON public."products" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Allow public read access to profiles') THEN EXECUTE 'CREATE POLICY "Allow public read access to profiles" ON public."profiles" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Allow users to insert own profile') THEN EXECUTE 'CREATE POLICY "Allow users to insert own profile" ON public."profiles" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Allow users to update own profile') THEN EXECUTE 'CREATE POLICY "Allow users to update own profile" ON public."profiles" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update own profile') THEN EXECUTE 'CREATE POLICY "Users can update own profile" ON public."profiles" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view own profile') THEN EXECUTE 'CREATE POLICY "Users can view own profile" ON public."profiles" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ralion_customers' AND policyname='Users can manage org customers') THEN EXECUTE 'CREATE POLICY "Users can manage org customers" ON public."ralion_customers" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ralion_documents' AND policyname='Users can manage org documents') THEN EXECUTE 'CREATE POLICY "Users can manage org documents" ON public."ralion_documents" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ralion_events' AND policyname='Users can manage org events') THEN EXECUTE 'CREATE POLICY "Users can manage org events" ON public."ralion_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ralion_leads' AND policyname='Users can manage org leads') THEN EXECUTE 'CREATE POLICY "Users can manage org leads" ON public."ralion_leads" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ralion_projects' AND policyname='Users can manage org projects') THEN EXECUTE 'CREATE POLICY "Users can manage org projects" ON public."ralion_projects" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ralion_tasks' AND policyname='Users can manage org tasks') THEN EXECUTE 'CREATE POLICY "Users can manage org tasks" ON public."ralion_tasks" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='releases' AND policyname='Admins full manage releases') THEN EXECUTE 'CREATE POLICY "Admins full manage releases" ON public."releases" AS PERMISSIVE FOR ALL TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='releases' AND policyname='Public read published releases') THEN EXECUTE 'CREATE POLICY "Public read published releases" ON public."releases" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((status = ''published''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='Anyone can view role permissions') THEN EXECUTE 'CREATE POLICY "Anyone can view role permissions" ON public."role_permissions" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Anyone can view global and org roles') THEN EXECUTE 'CREATE POLICY "Anyone can view global and org roles" ON public."roles" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_organizations() AS get_user_organizations))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_account_tokens' AND policyname='Users can manage own tokens') THEN EXECUTE 'CREATE POLICY "Users can manage own tokens" ON public."social_account_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_account_tokens' AND policyname='service_role_bypass') THEN EXECUTE 'CREATE POLICY "service_role_bypass" ON public."social_account_tokens" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.role() = ''service_role''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_account_tokens' AND policyname='social_tokens_delete_own') THEN EXECUTE 'CREATE POLICY "social_tokens_delete_own" ON public."social_account_tokens" AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_account_tokens' AND policyname='social_tokens_insert_own') THEN EXECUTE 'CREATE POLICY "social_tokens_insert_own" ON public."social_account_tokens" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_account_tokens' AND policyname='social_tokens_select_own') THEN EXECUTE 'CREATE POLICY "social_tokens_select_own" ON public."social_account_tokens" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_account_tokens' AND policyname='social_tokens_update_own') THEN EXECUTE 'CREATE POLICY "social_tokens_update_own" ON public."social_account_tokens" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_accounts' AND policyname='Social OAuth Vault isolation') THEN EXECUTE 'CREATE POLICY "Social OAuth Vault isolation" ON public."social_accounts" AS PERMISSIVE FOR ALL TO PUBLIC USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_connections' AND policyname='social_conn_service_role') THEN EXECUTE 'CREATE POLICY "social_conn_service_role" ON public."social_connections" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.role() = ''service_role''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_connections' AND policyname='social_conn_user_own') THEN EXECUTE 'CREATE POLICY "social_conn_user_own" ON public."social_connections" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_provider_profiles' AND policyname='sp_profiles_service_role') THEN EXECUTE 'CREATE POLICY "sp_profiles_service_role" ON public."social_provider_profiles" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.role() = ''service_role''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_provider_profiles' AND policyname='sp_profiles_user_own') THEN EXECUTE 'CREATE POLICY "sp_profiles_user_own" ON public."social_provider_profiles" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = user_id))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_provider_routing' AND policyname='sp_routing_service_role') THEN EXECUTE 'CREATE POLICY "sp_routing_service_role" ON public."social_provider_routing" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.role() = ''service_role''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_publish_idempotency' AND policyname='social_publish_idempotency_service_role') THEN EXECUTE 'CREATE POLICY "social_publish_idempotency_service_role" ON public."social_publish_idempotency" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_webhook_events' AND policyname='swe_service_role_only') THEN EXECUTE 'CREATE POLICY "swe_service_role_only" ON public."social_webhook_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.role() = ''service_role''::text))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscription_plans' AND policyname='Anyone can view subscription plans') THEN EXECUTE 'CREATE POLICY "Anyone can view subscription plans" ON public."subscription_plans" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_order_items' AND policyname='Org members manage order items') THEN EXECUTE 'CREATE POLICY "Org members manage order items" ON public."trade_order_items" AS PERMISSIVE FOR ALL TO PUBLIC USING ((order_id IN ( SELECT trade_orders.id
   FROM trade_orders
  WHERE (trade_orders.organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_orders' AND policyname='Org members manage orders') THEN EXECUTE 'CREATE POLICY "Org members manage orders" ON public."trade_orders" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_products' AND policyname='Org members manage products') THEN EXECUTE 'CREATE POLICY "Org members manage products" ON public."trade_products" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_suppliers' AND policyname='Org members manage suppliers') THEN EXECUTE 'CREATE POLICY "Org members manage suppliers" ON public."trade_suppliers" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_metrics' AND policyname='Org members view usage metrics') THEN EXECUTE 'CREATE POLICY "Org members view usage metrics" ON public."usage_metrics" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_products' AND policyname='Authenticated users can view user_products') THEN EXECUTE 'CREATE POLICY "Authenticated users can view user_products" ON public."user_products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true)'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_products' AND policyname='Users can view their product access') THEN EXECUTE 'CREATE POLICY "Users can view their product access" ON public."user_products" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((user_id = auth.uid()) OR (organization_id IN ( SELECT get_user_organizations() AS get_user_organizations))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='webhooks' AND policyname='Org members manage webhooks') THEN EXECUTE 'CREATE POLICY "Org members manage webhooks" ON public."webhooks" AS PERMISSIVE FOR ALL TO PUBLIC USING ((organization_id IN ( SELECT get_user_organizations() AS get_user_organizations)))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='workspaces' AND policyname='Users access member workspaces') THEN EXECUTE 'CREATE POLICY "Users access member workspaces" ON public."workspaces" AS PERMISSIVE FOR ALL TO PUBLIC USING ((id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))))'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='growth_campaigns'::regclass AND tgname='update_growth_campaigns_updated_at') THEN EXECUTE 'CREATE TRIGGER update_growth_campaigns_updated_at BEFORE UPDATE ON growth_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='growth_content'::regclass AND tgname='update_growth_content_updated_at') THEN EXECUTE 'CREATE TRIGGER update_growth_content_updated_at BEFORE UPDATE ON growth_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='health_appointments'::regclass AND tgname='update_health_appointments_updated_at') THEN EXECUTE 'CREATE TRIGGER update_health_appointments_updated_at BEFORE UPDATE ON health_appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='health_cases'::regclass AND tgname='update_health_cases_updated_at') THEN EXECUTE 'CREATE TRIGGER update_health_cases_updated_at BEFORE UPDATE ON health_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='health_clients'::regclass AND tgname='update_health_clients_updated_at') THEN EXECUTE 'CREATE TRIGGER update_health_clients_updated_at BEFORE UPDATE ON health_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='logistics_drivers'::regclass AND tgname='update_logistics_drivers_updated_at') THEN EXECUTE 'CREATE TRIGGER update_logistics_drivers_updated_at BEFORE UPDATE ON logistics_drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='logistics_shipments'::regclass AND tgname='update_logistics_shipments_updated_at') THEN EXECUTE 'CREATE TRIGGER update_logistics_shipments_updated_at BEFORE UPDATE ON logistics_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='logistics_vehicles'::regclass AND tgname='update_logistics_vehicles_updated_at') THEN EXECUTE 'CREATE TRIGGER update_logistics_vehicles_updated_at BEFORE UPDATE ON logistics_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='mari_conversations'::regclass AND tgname='update_mari_conversations_updated_at') THEN EXECUTE 'CREATE TRIGGER update_mari_conversations_updated_at BEFORE UPDATE ON mari_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='mari_settings'::regclass AND tgname='update_mari_settings_updated_at') THEN EXECUTE 'CREATE TRIGGER update_mari_settings_updated_at BEFORE UPDATE ON mari_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='mari_workflows'::regclass AND tgname='update_mari_workflows_updated_at') THEN EXECUTE 'CREATE TRIGGER update_mari_workflows_updated_at BEFORE UPDATE ON mari_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='organizations'::regclass AND tgname='update_organizations_updated_at') THEN EXECUTE 'CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='profiles'::regclass AND tgname='update_profiles_updated_at') THEN EXECUTE 'CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='ralion_customers'::regclass AND tgname='audit_customers_delete') THEN EXECUTE 'CREATE TRIGGER audit_customers_delete AFTER DELETE ON ralion_customers FOR EACH ROW EXECUTE FUNCTION log_ralion_audit()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='ralion_customers'::regclass AND tgname='audit_customers_insert') THEN EXECUTE 'CREATE TRIGGER audit_customers_insert AFTER INSERT ON ralion_customers FOR EACH ROW EXECUTE FUNCTION log_ralion_audit()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='ralion_customers'::regclass AND tgname='audit_customers_update') THEN EXECUTE 'CREATE TRIGGER audit_customers_update AFTER UPDATE ON ralion_customers FOR EACH ROW EXECUTE FUNCTION log_ralion_audit()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='ralion_customers'::regclass AND tgname='update_ralion_customers_updated_at') THEN EXECUTE 'CREATE TRIGGER update_ralion_customers_updated_at BEFORE UPDATE ON ralion_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='ralion_documents'::regclass AND tgname='audit_documents_delete') THEN EXECUTE 'CREATE TRIGGER audit_documents_delete AFTER DELETE ON ralion_documents FOR EACH ROW EXECUTE FUNCTION log_ralion_audit()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='ralion_documents'::regclass AND tgname='audit_documents_insert') THEN EXECUTE 'CREATE TRIGGER audit_documents_insert AFTER INSERT ON ralion_documents FOR EACH ROW EXECUTE FUNCTION log_ralion_audit()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='social_account_tokens'::regclass AND tgname='on_social_tokens_updated') THEN EXECUTE 'CREATE TRIGGER on_social_tokens_updated BEFORE UPDATE ON social_account_tokens FOR EACH ROW EXECUTE FUNCTION handle_updated_at()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='social_connections'::regclass AND tgname='on_social_connections_updated') THEN EXECUTE 'CREATE TRIGGER on_social_connections_updated BEFORE UPDATE ON social_connections FOR EACH ROW EXECUTE FUNCTION handle_social_tables_updated_at()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='social_provider_profiles'::regclass AND tgname='on_social_provider_profiles_updated') THEN EXECUTE 'CREATE TRIGGER on_social_provider_profiles_updated BEFORE UPDATE ON social_provider_profiles FOR EACH ROW EXECUTE FUNCTION handle_social_tables_updated_at()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='social_provider_routing'::regclass AND tgname='on_social_provider_routing_updated') THEN EXECUTE 'CREATE TRIGGER on_social_provider_routing_updated BEFORE UPDATE ON social_provider_routing FOR EACH ROW EXECUTE FUNCTION handle_social_tables_updated_at()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='trade_orders'::regclass AND tgname='update_trade_orders_updated_at') THEN EXECUTE 'CREATE TRIGGER update_trade_orders_updated_at BEFORE UPDATE ON trade_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='trade_products'::regclass AND tgname='update_trade_products_updated_at') THEN EXECUTE 'CREATE TRIGGER update_trade_products_updated_at BEFORE UPDATE ON trade_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='trade_suppliers'::regclass AND tgname='update_trade_suppliers_updated_at') THEN EXECUTE 'CREATE TRIGGER update_trade_suppliers_updated_at BEFORE UPDATE ON trade_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='on_auth_user_created') THEN EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()'; END IF; END $baseline$;
REVOKE ALL ON TABLE public."ai_jobs" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ai_memory" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."audit_logs" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."billing_checkout_references" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."billing_webhook_events" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."business_profiles" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."calendar_events" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."customers" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."deals" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."desktop_events" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."developer_api_key_rate_limits" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."developer_api_keys" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."devices" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."document_chunks" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."documents" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."download_releases" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."downloads" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."enterprise_sso_configs" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."features" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."government_citizen_cases" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."growth_campaigns" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."growth_content" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."health_appointments" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."health_cases" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."health_clients" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."licenses" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."logistics_drivers" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."logistics_shipments" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."logistics_tracking_events" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."logistics_vehicles" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_activity_logs" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_api_keys" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_api_usage" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_competitor_briefings" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_competitor_observations" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_competitor_watchlist" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_conversations" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_embed_widgets" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_knowledge" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_marketing_experiments" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_marketing_learnings" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_marketing_outcomes" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_messages" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_settings" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_voice_usage_sessions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_widget_sessions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_widget_usage" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."mari_workflows" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."marketing_campaigns" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."marketplace_items" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."modules" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."notifications" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."organization_members" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."organization_modules" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."organizations" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."payments" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."permissions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."plan_features" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."platform_admins" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."products" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."profiles" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ralion_customers" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ralion_documents" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ralion_events" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ralion_leads" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ralion_projects" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."ralion_tasks" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."registered_devices" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."releases" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."role_permissions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."roles" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_account_tokens" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_accounts" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_connections" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_posts" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_provider_profiles" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_provider_routing" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_publish_idempotency" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_webhook_events" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."subscription_plans" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."subscriptions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."tasks" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."tenant_admin_state" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."tenant_credit_ledger" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."tenant_credit_reservations" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."tenant_credit_wallets" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."trade_order_items" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."trade_orders" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."trade_products" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."trade_suppliers" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."usage_metrics" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."user_products" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."webhooks" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."workflow_runs" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."workflows" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."workspace_members" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."workspaces" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_accounts_safe" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."social_connections_safe" FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public."audit_logs" TO service_role;
GRANT SELECT ON TABLE public."audit_logs" TO service_role;
GRANT DELETE ON TABLE public."billing_checkout_references" TO service_role;
GRANT INSERT ON TABLE public."billing_checkout_references" TO service_role;
GRANT REFERENCES ON TABLE public."billing_checkout_references" TO service_role;
GRANT SELECT ON TABLE public."billing_checkout_references" TO service_role;
GRANT TRIGGER ON TABLE public."billing_checkout_references" TO service_role;
GRANT TRUNCATE ON TABLE public."billing_checkout_references" TO service_role;
GRANT UPDATE ON TABLE public."billing_checkout_references" TO service_role;
GRANT DELETE ON TABLE public."billing_webhook_events" TO service_role;
GRANT INSERT ON TABLE public."billing_webhook_events" TO service_role;
GRANT REFERENCES ON TABLE public."billing_webhook_events" TO service_role;
GRANT SELECT ON TABLE public."billing_webhook_events" TO service_role;
GRANT TRIGGER ON TABLE public."billing_webhook_events" TO service_role;
GRANT TRUNCATE ON TABLE public."billing_webhook_events" TO service_role;
GRANT UPDATE ON TABLE public."billing_webhook_events" TO service_role;
GRANT DELETE ON TABLE public."business_profiles" TO authenticated;
GRANT INSERT ON TABLE public."business_profiles" TO authenticated;
GRANT SELECT ON TABLE public."business_profiles" TO authenticated;
GRANT UPDATE ON TABLE public."business_profiles" TO authenticated;
GRANT DELETE ON TABLE public."business_profiles" TO service_role;
GRANT INSERT ON TABLE public."business_profiles" TO service_role;
GRANT REFERENCES ON TABLE public."business_profiles" TO service_role;
GRANT SELECT ON TABLE public."business_profiles" TO service_role;
GRANT TRIGGER ON TABLE public."business_profiles" TO service_role;
GRANT TRUNCATE ON TABLE public."business_profiles" TO service_role;
GRANT UPDATE ON TABLE public."business_profiles" TO service_role;
GRANT DELETE ON TABLE public."calendar_events" TO service_role;
GRANT INSERT ON TABLE public."calendar_events" TO service_role;
GRANT REFERENCES ON TABLE public."calendar_events" TO service_role;
GRANT SELECT ON TABLE public."calendar_events" TO service_role;
GRANT TRIGGER ON TABLE public."calendar_events" TO service_role;
GRANT TRUNCATE ON TABLE public."calendar_events" TO service_role;
GRANT UPDATE ON TABLE public."calendar_events" TO service_role;
GRANT DELETE ON TABLE public."customers" TO service_role;
GRANT INSERT ON TABLE public."customers" TO service_role;
GRANT REFERENCES ON TABLE public."customers" TO service_role;
GRANT SELECT ON TABLE public."customers" TO service_role;
GRANT TRIGGER ON TABLE public."customers" TO service_role;
GRANT TRUNCATE ON TABLE public."customers" TO service_role;
GRANT UPDATE ON TABLE public."customers" TO service_role;
GRANT DELETE ON TABLE public."deals" TO service_role;
GRANT INSERT ON TABLE public."deals" TO service_role;
GRANT SELECT ON TABLE public."deals" TO service_role;
GRANT UPDATE ON TABLE public."deals" TO service_role;
GRANT DELETE ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT INSERT ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT REFERENCES ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT SELECT ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT TRIGGER ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT TRUNCATE ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT UPDATE ON TABLE public."developer_api_key_rate_limits" TO service_role;
GRANT DELETE ON TABLE public."developer_api_keys" TO service_role;
GRANT INSERT ON TABLE public."developer_api_keys" TO service_role;
GRANT SELECT ON TABLE public."developer_api_keys" TO service_role;
GRANT UPDATE ON TABLE public."developer_api_keys" TO service_role;
GRANT DELETE ON TABLE public."document_chunks" TO service_role;
GRANT INSERT ON TABLE public."document_chunks" TO service_role;
GRANT REFERENCES ON TABLE public."document_chunks" TO service_role;
GRANT SELECT ON TABLE public."document_chunks" TO service_role;
GRANT TRIGGER ON TABLE public."document_chunks" TO service_role;
GRANT TRUNCATE ON TABLE public."document_chunks" TO service_role;
GRANT UPDATE ON TABLE public."document_chunks" TO service_role;
GRANT DELETE ON TABLE public."documents" TO service_role;
GRANT INSERT ON TABLE public."documents" TO service_role;
GRANT REFERENCES ON TABLE public."documents" TO service_role;
GRANT SELECT ON TABLE public."documents" TO service_role;
GRANT TRIGGER ON TABLE public."documents" TO service_role;
GRANT TRUNCATE ON TABLE public."documents" TO service_role;
GRANT UPDATE ON TABLE public."documents" TO service_role;
GRANT DELETE ON TABLE public."mari_api_keys" TO service_role;
GRANT INSERT ON TABLE public."mari_api_keys" TO service_role;
GRANT REFERENCES ON TABLE public."mari_api_keys" TO service_role;
GRANT SELECT ON TABLE public."mari_api_keys" TO service_role;
GRANT TRIGGER ON TABLE public."mari_api_keys" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_api_keys" TO service_role;
GRANT UPDATE ON TABLE public."mari_api_keys" TO service_role;
GRANT DELETE ON TABLE public."mari_api_usage" TO service_role;
GRANT INSERT ON TABLE public."mari_api_usage" TO service_role;
GRANT REFERENCES ON TABLE public."mari_api_usage" TO service_role;
GRANT SELECT ON TABLE public."mari_api_usage" TO service_role;
GRANT TRIGGER ON TABLE public."mari_api_usage" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_api_usage" TO service_role;
GRANT UPDATE ON TABLE public."mari_api_usage" TO service_role;
GRANT SELECT ON TABLE public."mari_competitor_briefings" TO authenticated;
GRANT DELETE ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT INSERT ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT REFERENCES ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT SELECT ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT TRIGGER ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT UPDATE ON TABLE public."mari_competitor_briefings" TO service_role;
GRANT SELECT ON TABLE public."mari_competitor_observations" TO authenticated;
GRANT DELETE ON TABLE public."mari_competitor_observations" TO service_role;
GRANT INSERT ON TABLE public."mari_competitor_observations" TO service_role;
GRANT REFERENCES ON TABLE public."mari_competitor_observations" TO service_role;
GRANT SELECT ON TABLE public."mari_competitor_observations" TO service_role;
GRANT TRIGGER ON TABLE public."mari_competitor_observations" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_competitor_observations" TO service_role;
GRANT UPDATE ON TABLE public."mari_competitor_observations" TO service_role;
GRANT SELECT ON TABLE public."mari_competitor_watchlist" TO authenticated;
GRANT DELETE ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT INSERT ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT REFERENCES ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT SELECT ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT TRIGGER ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT UPDATE ON TABLE public."mari_competitor_watchlist" TO service_role;
GRANT DELETE ON TABLE public."mari_embed_widgets" TO service_role;
GRANT INSERT ON TABLE public."mari_embed_widgets" TO service_role;
GRANT REFERENCES ON TABLE public."mari_embed_widgets" TO service_role;
GRANT SELECT ON TABLE public."mari_embed_widgets" TO service_role;
GRANT TRIGGER ON TABLE public."mari_embed_widgets" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_embed_widgets" TO service_role;
GRANT UPDATE ON TABLE public."mari_embed_widgets" TO service_role;
GRANT SELECT ON TABLE public."mari_knowledge" TO service_role;
GRANT DELETE ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT INSERT ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT REFERENCES ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT SELECT ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT TRIGGER ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT UPDATE ON TABLE public."mari_marketing_experiments" TO service_role;
GRANT DELETE ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT INSERT ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT REFERENCES ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT SELECT ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT TRIGGER ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT UPDATE ON TABLE public."mari_marketing_learnings" TO service_role;
GRANT DELETE ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT INSERT ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT REFERENCES ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT SELECT ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT TRIGGER ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT UPDATE ON TABLE public."mari_marketing_outcomes" TO service_role;
GRANT DELETE ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT INSERT ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT REFERENCES ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT SELECT ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT TRIGGER ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT UPDATE ON TABLE public."mari_voice_usage_sessions" TO service_role;
GRANT DELETE ON TABLE public."mari_widget_sessions" TO service_role;
GRANT INSERT ON TABLE public."mari_widget_sessions" TO service_role;
GRANT REFERENCES ON TABLE public."mari_widget_sessions" TO service_role;
GRANT SELECT ON TABLE public."mari_widget_sessions" TO service_role;
GRANT TRIGGER ON TABLE public."mari_widget_sessions" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_widget_sessions" TO service_role;
GRANT UPDATE ON TABLE public."mari_widget_sessions" TO service_role;
GRANT DELETE ON TABLE public."mari_widget_usage" TO service_role;
GRANT INSERT ON TABLE public."mari_widget_usage" TO service_role;
GRANT REFERENCES ON TABLE public."mari_widget_usage" TO service_role;
GRANT SELECT ON TABLE public."mari_widget_usage" TO service_role;
GRANT TRIGGER ON TABLE public."mari_widget_usage" TO service_role;
GRANT TRUNCATE ON TABLE public."mari_widget_usage" TO service_role;
GRANT UPDATE ON TABLE public."mari_widget_usage" TO service_role;
GRANT DELETE ON TABLE public."organization_members" TO authenticated;
GRANT INSERT ON TABLE public."organization_members" TO authenticated;
GRANT SELECT ON TABLE public."organization_members" TO authenticated;
GRANT UPDATE ON TABLE public."organization_members" TO authenticated;
GRANT DELETE ON TABLE public."organization_members" TO service_role;
GRANT INSERT ON TABLE public."organization_members" TO service_role;
GRANT REFERENCES ON TABLE public."organization_members" TO service_role;
GRANT SELECT ON TABLE public."organization_members" TO service_role;
GRANT TRIGGER ON TABLE public."organization_members" TO service_role;
GRANT TRUNCATE ON TABLE public."organization_members" TO service_role;
GRANT UPDATE ON TABLE public."organization_members" TO service_role;
GRANT DELETE ON TABLE public."organizations" TO authenticated;
GRANT INSERT ON TABLE public."organizations" TO authenticated;
GRANT SELECT ON TABLE public."organizations" TO authenticated;
GRANT UPDATE ON TABLE public."organizations" TO authenticated;
GRANT DELETE ON TABLE public."organizations" TO service_role;
GRANT INSERT ON TABLE public."organizations" TO service_role;
GRANT REFERENCES ON TABLE public."organizations" TO service_role;
GRANT SELECT ON TABLE public."organizations" TO service_role;
GRANT TRIGGER ON TABLE public."organizations" TO service_role;
GRANT TRUNCATE ON TABLE public."organizations" TO service_role;
GRANT UPDATE ON TABLE public."organizations" TO service_role;
GRANT DELETE ON TABLE public."payments" TO service_role;
GRANT INSERT ON TABLE public."payments" TO service_role;
GRANT SELECT ON TABLE public."payments" TO service_role;
GRANT UPDATE ON TABLE public."payments" TO service_role;
GRANT DELETE ON TABLE public."platform_admins" TO service_role;
GRANT INSERT ON TABLE public."platform_admins" TO service_role;
GRANT REFERENCES ON TABLE public."platform_admins" TO service_role;
GRANT SELECT ON TABLE public."platform_admins" TO service_role;
GRANT TRIGGER ON TABLE public."platform_admins" TO service_role;
GRANT TRUNCATE ON TABLE public."platform_admins" TO service_role;
GRANT UPDATE ON TABLE public."platform_admins" TO service_role;
GRANT DELETE ON TABLE public."profiles" TO anon;
GRANT INSERT ON TABLE public."profiles" TO anon;
GRANT REFERENCES ON TABLE public."profiles" TO anon;
GRANT SELECT ON TABLE public."profiles" TO anon;
GRANT TRIGGER ON TABLE public."profiles" TO anon;
GRANT TRUNCATE ON TABLE public."profiles" TO anon;
GRANT UPDATE ON TABLE public."profiles" TO anon;
GRANT DELETE ON TABLE public."profiles" TO authenticated;
GRANT INSERT ON TABLE public."profiles" TO authenticated;
GRANT REFERENCES ON TABLE public."profiles" TO authenticated;
GRANT SELECT ON TABLE public."profiles" TO authenticated;
GRANT TRIGGER ON TABLE public."profiles" TO authenticated;
GRANT TRUNCATE ON TABLE public."profiles" TO authenticated;
GRANT UPDATE ON TABLE public."profiles" TO authenticated;
GRANT DELETE ON TABLE public."profiles" TO service_role;
GRANT INSERT ON TABLE public."profiles" TO service_role;
GRANT REFERENCES ON TABLE public."profiles" TO service_role;
GRANT SELECT ON TABLE public."profiles" TO service_role;
GRANT TRIGGER ON TABLE public."profiles" TO service_role;
GRANT TRUNCATE ON TABLE public."profiles" TO service_role;
GRANT UPDATE ON TABLE public."profiles" TO service_role;
GRANT DELETE ON TABLE public."social_account_tokens" TO authenticated;
GRANT INSERT ON TABLE public."social_account_tokens" TO authenticated;
GRANT REFERENCES ON TABLE public."social_account_tokens" TO authenticated;
GRANT SELECT ON TABLE public."social_account_tokens" TO authenticated;
GRANT TRIGGER ON TABLE public."social_account_tokens" TO authenticated;
GRANT TRUNCATE ON TABLE public."social_account_tokens" TO authenticated;
GRANT UPDATE ON TABLE public."social_account_tokens" TO authenticated;
GRANT DELETE ON TABLE public."social_account_tokens" TO service_role;
GRANT INSERT ON TABLE public."social_account_tokens" TO service_role;
GRANT REFERENCES ON TABLE public."social_account_tokens" TO service_role;
GRANT SELECT ON TABLE public."social_account_tokens" TO service_role;
GRANT TRIGGER ON TABLE public."social_account_tokens" TO service_role;
GRANT TRUNCATE ON TABLE public."social_account_tokens" TO service_role;
GRANT UPDATE ON TABLE public."social_account_tokens" TO service_role;
GRANT SELECT ON TABLE public."social_accounts_safe" TO authenticated;
GRANT DELETE ON TABLE public."social_connections" TO authenticated;
GRANT INSERT ON TABLE public."social_connections" TO authenticated;
GRANT REFERENCES ON TABLE public."social_connections" TO authenticated;
GRANT SELECT ON TABLE public."social_connections" TO authenticated;
GRANT TRIGGER ON TABLE public."social_connections" TO authenticated;
GRANT TRUNCATE ON TABLE public."social_connections" TO authenticated;
GRANT UPDATE ON TABLE public."social_connections" TO authenticated;
GRANT DELETE ON TABLE public."social_connections" TO service_role;
GRANT INSERT ON TABLE public."social_connections" TO service_role;
GRANT REFERENCES ON TABLE public."social_connections" TO service_role;
GRANT SELECT ON TABLE public."social_connections" TO service_role;
GRANT TRIGGER ON TABLE public."social_connections" TO service_role;
GRANT TRUNCATE ON TABLE public."social_connections" TO service_role;
GRANT UPDATE ON TABLE public."social_connections" TO service_role;
GRANT SELECT ON TABLE public."social_connections_safe" TO authenticated;
GRANT DELETE ON TABLE public."social_posts" TO service_role;
GRANT INSERT ON TABLE public."social_posts" TO service_role;
GRANT REFERENCES ON TABLE public."social_posts" TO service_role;
GRANT SELECT ON TABLE public."social_posts" TO service_role;
GRANT TRIGGER ON TABLE public."social_posts" TO service_role;
GRANT TRUNCATE ON TABLE public."social_posts" TO service_role;
GRANT UPDATE ON TABLE public."social_posts" TO service_role;
GRANT DELETE ON TABLE public."social_provider_profiles" TO authenticated;
GRANT INSERT ON TABLE public."social_provider_profiles" TO authenticated;
GRANT REFERENCES ON TABLE public."social_provider_profiles" TO authenticated;
GRANT SELECT ON TABLE public."social_provider_profiles" TO authenticated;
GRANT TRIGGER ON TABLE public."social_provider_profiles" TO authenticated;
GRANT TRUNCATE ON TABLE public."social_provider_profiles" TO authenticated;
GRANT UPDATE ON TABLE public."social_provider_profiles" TO authenticated;
GRANT DELETE ON TABLE public."social_provider_profiles" TO service_role;
GRANT INSERT ON TABLE public."social_provider_profiles" TO service_role;
GRANT REFERENCES ON TABLE public."social_provider_profiles" TO service_role;
GRANT SELECT ON TABLE public."social_provider_profiles" TO service_role;
GRANT TRIGGER ON TABLE public."social_provider_profiles" TO service_role;
GRANT TRUNCATE ON TABLE public."social_provider_profiles" TO service_role;
GRANT UPDATE ON TABLE public."social_provider_profiles" TO service_role;
GRANT DELETE ON TABLE public."social_provider_routing" TO authenticated;
GRANT INSERT ON TABLE public."social_provider_routing" TO authenticated;
GRANT REFERENCES ON TABLE public."social_provider_routing" TO authenticated;
GRANT SELECT ON TABLE public."social_provider_routing" TO authenticated;
GRANT TRIGGER ON TABLE public."social_provider_routing" TO authenticated;
GRANT TRUNCATE ON TABLE public."social_provider_routing" TO authenticated;
GRANT UPDATE ON TABLE public."social_provider_routing" TO authenticated;
GRANT DELETE ON TABLE public."social_provider_routing" TO service_role;
GRANT INSERT ON TABLE public."social_provider_routing" TO service_role;
GRANT REFERENCES ON TABLE public."social_provider_routing" TO service_role;
GRANT SELECT ON TABLE public."social_provider_routing" TO service_role;
GRANT TRIGGER ON TABLE public."social_provider_routing" TO service_role;
GRANT TRUNCATE ON TABLE public."social_provider_routing" TO service_role;
GRANT UPDATE ON TABLE public."social_provider_routing" TO service_role;
GRANT DELETE ON TABLE public."social_publish_idempotency" TO service_role;
GRANT INSERT ON TABLE public."social_publish_idempotency" TO service_role;
GRANT REFERENCES ON TABLE public."social_publish_idempotency" TO service_role;
GRANT SELECT ON TABLE public."social_publish_idempotency" TO service_role;
GRANT TRIGGER ON TABLE public."social_publish_idempotency" TO service_role;
GRANT TRUNCATE ON TABLE public."social_publish_idempotency" TO service_role;
GRANT UPDATE ON TABLE public."social_publish_idempotency" TO service_role;
GRANT DELETE ON TABLE public."social_webhook_events" TO service_role;
GRANT INSERT ON TABLE public."social_webhook_events" TO service_role;
GRANT REFERENCES ON TABLE public."social_webhook_events" TO service_role;
GRANT SELECT ON TABLE public."social_webhook_events" TO service_role;
GRANT TRIGGER ON TABLE public."social_webhook_events" TO service_role;
GRANT TRUNCATE ON TABLE public."social_webhook_events" TO service_role;
GRANT UPDATE ON TABLE public."social_webhook_events" TO service_role;
GRANT SELECT ON TABLE public."subscription_plans" TO service_role;
GRANT SELECT ON TABLE public."subscriptions" TO authenticated;
GRANT DELETE ON TABLE public."subscriptions" TO service_role;
GRANT INSERT ON TABLE public."subscriptions" TO service_role;
GRANT REFERENCES ON TABLE public."subscriptions" TO service_role;
GRANT SELECT ON TABLE public."subscriptions" TO service_role;
GRANT TRIGGER ON TABLE public."subscriptions" TO service_role;
GRANT TRUNCATE ON TABLE public."subscriptions" TO service_role;
GRANT UPDATE ON TABLE public."subscriptions" TO service_role;
GRANT DELETE ON TABLE public."tasks" TO service_role;
GRANT INSERT ON TABLE public."tasks" TO service_role;
GRANT SELECT ON TABLE public."tasks" TO service_role;
GRANT UPDATE ON TABLE public."tasks" TO service_role;
GRANT DELETE ON TABLE public."tenant_admin_state" TO service_role;
GRANT INSERT ON TABLE public."tenant_admin_state" TO service_role;
GRANT REFERENCES ON TABLE public."tenant_admin_state" TO service_role;
GRANT SELECT ON TABLE public."tenant_admin_state" TO service_role;
GRANT TRIGGER ON TABLE public."tenant_admin_state" TO service_role;
GRANT TRUNCATE ON TABLE public."tenant_admin_state" TO service_role;
GRANT UPDATE ON TABLE public."tenant_admin_state" TO service_role;
GRANT DELETE ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT INSERT ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT REFERENCES ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT SELECT ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT TRIGGER ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT TRUNCATE ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT UPDATE ON TABLE public."tenant_credit_ledger" TO service_role;
GRANT DELETE ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT INSERT ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT REFERENCES ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT SELECT ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT TRIGGER ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT TRUNCATE ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT UPDATE ON TABLE public."tenant_credit_reservations" TO service_role;
GRANT DELETE ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT INSERT ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT REFERENCES ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT SELECT ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT TRIGGER ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT TRUNCATE ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT UPDATE ON TABLE public."tenant_credit_wallets" TO service_role;
GRANT DELETE ON TABLE public."workflow_runs" TO service_role;
GRANT INSERT ON TABLE public."workflow_runs" TO service_role;
GRANT REFERENCES ON TABLE public."workflow_runs" TO service_role;
GRANT SELECT ON TABLE public."workflow_runs" TO service_role;
GRANT TRIGGER ON TABLE public."workflow_runs" TO service_role;
GRANT TRUNCATE ON TABLE public."workflow_runs" TO service_role;
GRANT UPDATE ON TABLE public."workflow_runs" TO service_role;
GRANT DELETE ON TABLE public."workflows" TO service_role;
GRANT INSERT ON TABLE public."workflows" TO service_role;
GRANT REFERENCES ON TABLE public."workflows" TO service_role;
GRANT SELECT ON TABLE public."workflows" TO service_role;
GRANT TRIGGER ON TABLE public."workflows" TO service_role;
GRANT TRUNCATE ON TABLE public."workflows" TO service_role;
GRANT UPDATE ON TABLE public."workflows" TO service_role;
GRANT DELETE ON TABLE public."workspace_members" TO authenticated;
GRANT INSERT ON TABLE public."workspace_members" TO authenticated;
GRANT SELECT ON TABLE public."workspace_members" TO authenticated;
GRANT UPDATE ON TABLE public."workspace_members" TO authenticated;
GRANT DELETE ON TABLE public."workspace_members" TO service_role;
GRANT INSERT ON TABLE public."workspace_members" TO service_role;
GRANT REFERENCES ON TABLE public."workspace_members" TO service_role;
GRANT SELECT ON TABLE public."workspace_members" TO service_role;
GRANT TRIGGER ON TABLE public."workspace_members" TO service_role;
GRANT TRUNCATE ON TABLE public."workspace_members" TO service_role;
GRANT UPDATE ON TABLE public."workspace_members" TO service_role;
GRANT DELETE ON TABLE public."workspaces" TO authenticated;
GRANT INSERT ON TABLE public."workspaces" TO authenticated;
GRANT SELECT ON TABLE public."workspaces" TO authenticated;
GRANT UPDATE ON TABLE public."workspaces" TO authenticated;
GRANT DELETE ON TABLE public."workspaces" TO service_role;
GRANT INSERT ON TABLE public."workspaces" TO service_role;
GRANT REFERENCES ON TABLE public."workspaces" TO service_role;
GRANT SELECT ON TABLE public."workspaces" TO service_role;
GRANT TRIGGER ON TABLE public."workspaces" TO service_role;
GRANT TRUNCATE ON TABLE public."workspaces" TO service_role;
GRANT UPDATE ON TABLE public."workspaces" TO service_role;
