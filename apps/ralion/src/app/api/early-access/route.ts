import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';

export const dynamic = 'force-dynamic';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, industry, useCase, source } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return corsJsonResponse(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 },
        request
      );
    }

    const leadName = (name && typeof name === 'string') ? name.trim() : email.split('@')[0];
    const targetIndustry = industry || source || 'Industrial Solutions';
    const targetCompany = company || 'Pending Organization';

    const supabase = getServiceSupabase();

    // 1. Insert into leads table
    try {
      await supabase.from('leads').insert({
        name: leadName,
        email: email.trim().toLowerCase(),
        company: targetCompany,
        source: `Early Access - ${targetIndustry}`,
        status: 'NEW',
        stage: 'INTAKE',
        notes: `Requested Early Access for: ${targetIndustry}. Priority Use Case: ${useCase || 'General Rollout'}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr: any) {
      console.warn('[EarlyAccess] Supabase leads insert fallback note:', dbErr.message);
    }

    // 2. Structured audit log for compliance & telemetry
    await AuditLoggerService.log({
      eventType: 'ADMIN_ACTION',
      eventCategory: 'ADMIN',
      success: true,
      resourceType: 'early_access_lead',
      resourceId: email,
      metadata: {
        name: leadName,
        email,
        company: targetCompany,
        industry: targetIndustry,
        useCase: useCase || '',
        timestamp: new Date().toISOString(),
      },
    });

    return corsJsonResponse({
      success: true,
      message: `Thank you, ${leadName}! You have been registered on the early access VIP waitlist for ${targetIndustry}. Our enterprise rollout team will contact you once private beta access opens.`,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to submit early access request' },
      { status: 500 },
      request
    );
  }
}
