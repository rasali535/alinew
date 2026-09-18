import { NextRequest } from 'next/server';
import { corsJsonResponse } from '@/lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { WorkflowOutcomeLearningService } from '@/lib/operations/workflowOutcomeLearning.service';

export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const required=await requireRalionContext(request);if(required.response)return required.response;const ctx=required.context;
 const workflowId=request.nextUrl.searchParams.get('workflowId')||undefined;
 try{return corsJsonResponse({success:true,summary:await WorkflowOutcomeLearningService.summarize(ctx.workspace.id,workflowId)},undefined,request)}
 catch(e:any){return corsJsonResponse({success:false,error:e.message},{status:500},request)}
}
export async function POST(request:NextRequest){
 const required=await requireRalionContext(request);if(required.response)return required.response;const ctx=required.context;const b=await request.json().catch(()=>({}));
 if(!b.workflowRunId||!b.workflowId||!b.outcomeType)return corsJsonResponse({success:false,error:'workflowRunId, workflowId and outcomeType are required'},{status:400},request);
 try{const outcome=await WorkflowOutcomeLearningService.record({workflowRunId:b.workflowRunId,workflowId:b.workflowId,workspaceId:ctx.workspace.id,organizationId:ctx.organization?.id||ctx.workspace.organization_id, outcomeType:b.outcomeType,success:b.success,value:b.value,metadata:b.metadata});return corsJsonResponse({success:true,outcome},undefined,request)}
 catch(e:any){return corsJsonResponse({success:false,error:e.message},{status:500},request)}
}
