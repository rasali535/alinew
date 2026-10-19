import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailEmployee } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse({ success: false, error: 'RETAIL_MODULE_NOT_ENTITLED' }, { status: 403 }, request);
    }

    const employees = await RetailDatabaseService.listEmployees(context.workspace.id);

    // Enforce salary confidentiality: Cashiers and general staff cannot view salary data
    const canViewSalaries = entitlement.canViewSalaries;
    const sanitized = employees.map((emp) => {
      if (!canViewSalaries) {
        return {
          ...emp,
          baseSalaryMonthly: 0,
          hourlyRate: 0,
          bankName: undefined,
          bankAccountMasked: 'CONFIDENTIAL',
        };
      }
      return emp;
    });

    return corsJsonResponse({ success: true, employees: sanitized }, undefined, request);
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
    if (!body.firstName || !body.lastName || !body.jobTitle) {
      return corsJsonResponse({ success: false, error: 'First name, last name, and job title are required.' }, { status: 400 }, request);
    }

    const employee: RetailEmployee = {
      id: body.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      userId: body.userId,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      jobTitle: body.jobTitle.trim(),
      department: body.department || 'SALES',
      employmentStatus: body.employmentStatus || 'ACTIVE',
      employmentType: body.employmentType || 'FULL_TIME',
      baseSalaryMonthly: Number(body.baseSalaryMonthly) || 0,
      hourlyRate: Number(body.hourlyRate) || 0,
      payFrequency: body.payFrequency || 'MONTHLY',
      paymentMethod: body.paymentMethod || 'BANK_TRANSFER',
      bankName: body.bankName,
      bankAccountMasked: body.bankAccount ? `•••• ${body.bankAccount.slice(-4)}` : undefined,
      hireDate: body.hireDate || new Date().toISOString().slice(0, 10),
      isPilotDemo: Boolean(body.isPilotDemo),
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.upsertEmployee(employee);
    return corsJsonResponse({ success: true, employee: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
