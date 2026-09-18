import 'server-only';
import { getServiceSupabase } from '@/lib/auth/serverAuth';

export class WorkflowOutcomeLearningService {
  static async record(params:{workflowRunId:string;workflowId:string;workspaceId:string;organizationId?:string|null;outcomeType:string;success?:boolean;value?:number;metadata?:Record<string,any>}) {
    const db=getServiceSupabase();
    const {data,error}=await db.from('workflow_outcomes').insert({
      workflow_run_id:params.workflowRunId,workflow_id:params.workflowId,workspace_id:params.workspaceId,
      organization_id:params.organizationId||null,outcome_type:String(params.outcomeType).slice(0,120),
      success:typeof params.success==='boolean'?params.success:null,
      value:Number.isFinite(params.value as number)?params.value:null,metadata:params.metadata||{}
    }).select('*').single();
    if(error) throw new Error(`Failed to record workflow outcome: ${error.message}`);
    return data;
  }

  static async summarize(workspaceId:string,workflowId?:string) {
    const db=getServiceSupabase();
    let q=db.from('workflow_outcomes').select('workflow_id,outcome_type,success,value,measured_at').eq('workspace_id',workspaceId).order('measured_at',{ascending:false}).limit(500);
    if(workflowId) q=q.eq('workflow_id',workflowId);
    const {data,error}=await q;if(error) throw new Error(error.message);
    const rows=data||[]; const successful=rows.filter((r:any)=>r.success===true).length; const measured=rows.filter((r:any)=>typeof r.success==='boolean').length;
    return {total:rows.length,measured,successful,successRate:measured?Number(((successful/measured)*100).toFixed(1)):null,recent:rows.slice(0,20)};
  }
}
