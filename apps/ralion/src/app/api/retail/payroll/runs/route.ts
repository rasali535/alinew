import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailPayrollRun, RetailPayslip } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessPayroll) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PAYROLL_ACCESS' }, { status: 403 }, request);
    }

    const runs = await RetailDatabaseService.listPayrollRuns(context.workspace.id);
    return corsJsonResponse({ success: true, payrollRuns: runs }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessPayroll) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PAYROLL_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { periodStart, periodEnd, payslips, notes, isPilotDemo } = body;

    if (!periodStart || !periodEnd || !Array.isArray(payslips) || payslips.length === 0) {
      return corsJsonResponse(
        { success: false, error: 'periodStart, periodEnd, and at least one payslip entry are required.' },
        { status: 400 },
        request
      );
    }

    const runId = body.id || `prun_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const payslipRecords: RetailPayslip[] = payslips.map((ps: any) => {
      const basePay = Number(ps.basePay) || 0;
      const overtimePay = Number(ps.overtimePay) || 0;
      const allowances = Number(ps.allowances) || 0;
      const deductionsStatutory = Number(ps.deductionsStatutory) || 0;
      const deductionsOther = Number(ps.deductionsOther) || 0;

      const grossPay = basePay + overtimePay + allowances;
      const deductions = deductionsStatutory + deductionsOther;
      const netPay = grossPay - deductions;

      totalGross += grossPay;
      totalDeductions += deductions;
      totalNet += netPay;

      return {
        id: `ps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        payrollRunId: runId,
        employeeId: ps.employeeId,
        employeeName: ps.employeeName,
        jobTitle: ps.jobTitle,
        basePay,
        overtimePay,
        allowances,
        deductionsStatutory,
        deductionsOther,
        grossPay,
        netPay,
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
      };
    });

    const run: RetailPayrollRun = {
      id: runId,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      periodStart,
      periodEnd,
      currency: 'USD',
      totalGross,
      totalDeductions,
      totalNet,
      status: 'APPROVED',
      approvedBy: context.user.id,
      paymentRecordedAt: new Date().toISOString(),
      notes,
      payslips: payslipRecords,
      isPilotDemo: Boolean(isPilotDemo),
      createdAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.createPayrollRun(run, payslipRecords);
    return corsJsonResponse({ success: true, payrollRun: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
