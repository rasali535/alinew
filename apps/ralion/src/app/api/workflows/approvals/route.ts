import { NextRequest } from 'next/server';
import { corsJsonResponse } from '@/lib/cors';
import { requireRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const required = await requireRalionContext(request);
  if (required.response) return required.response;
  const ctx = required.context;
  const db = getServiceSupabase();
  const { data, error } = await db.from('workflow_approvals').select('*')
    .eq('workspace_id', ctx.workspace.id).eq('status','PENDING').order('created_at',{ascending:false}).limit(100);
  return corsJsonResponse(error ? {success:false,error:error.message}:{success:true,approvals:data||[]},{status:error?500:200},request);
}

export async function POST(request: NextRequest) {
  const required = await requireRalionContext(request);
  if (required.response) return required.response;
  const ctx = required.context;
  const body = await request.json().catch(()=>({}));
  const approvalId = String(body.approvalId||'').trim();
  const status = String(body.status||'').toUpperCase();
  if (!approvalId || !['APPROVED','REJECTED'].includes(status)) return corsJsonResponse({success:false,error:'approvalId and APPROVED/REJECTED status required'},{status:400},request);
  const db=getServiceSupabase();
  const {data,error}=await db.from('workflow_approvals').update({status,reviewed_by:ctx.user.id,reviewed_at:new Date().toISOString()})
    .eq('id',approvalId).eq('workspace_id',ctx.workspace.id).eq('status','PENDING').select('*').maybeSingle();
  if(error||!data) return corsJsonResponse({success:false,error:error?.message||'Approval not found or already reviewed'},{status:error?500:409},request);
  if(status==='REJECTED') await db.from('workflow_runs').update({status:'SKIPPED',finished_at:new Date().toISOString(),output:{approvalId,rejected:true}}).eq('id',data.workflow_run_id).eq('workspace_id',ctx.workspace.id);
  return corsJsonResponse({success:true,approval:data,resumeRequired:status==='APPROVED'},undefined,request);
}
