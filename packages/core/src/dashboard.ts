export type DashboardViewMode = 'CEO' | 'OPERATIONS' | 'MARKETING' | 'CUSTOM';

export interface DashboardWidgetConfig {
  id: string;
  type: 'KPI_REVENUE' | 'KPI_CUSTOMERS' | 'KPI_TASKS' | 'SALES_PIPELINE_CHART' | 'TASK_KANBAN_PREVIEW' | 'RECENT_ACTIVITIES' | 'MARI_INSIGHTS';
  title: string;
  gridSpan: number; // 1 to 4 columns
  order: number;
}

export const DEFAULT_DASHBOARD_TEMPLATES: Record<DashboardViewMode, DashboardWidgetConfig[]> = {
  CEO: [
    { id: 'w1', type: 'KPI_REVENUE', title: 'Monthly Revenue', gridSpan: 1, order: 1 },
    { id: 'w2', type: 'KPI_CUSTOMERS', title: 'Active Customers', gridSpan: 1, order: 2 },
    { id: 'w3', type: 'KPI_TASKS', title: 'Pending Operations', gridSpan: 1, order: 3 },
    { id: 'w4', type: 'MARI_INSIGHTS', title: 'Mari AI Executive Briefing', gridSpan: 1, order: 4 },
    { id: 'w5', type: 'SALES_PIPELINE_CHART', title: 'Sales Performance Pipeline', gridSpan: 2, order: 5 },
    { id: 'w6', type: 'RECENT_ACTIVITIES', title: 'Company Activity Feed', gridSpan: 2, order: 6 },
  ],
  OPERATIONS: [
    { id: 'w1', type: 'KPI_TASKS', title: 'Tasks Due Today', gridSpan: 1, order: 1 },
    { id: 'w2', type: 'TASK_KANBAN_PREVIEW', title: 'Project Status Board', gridSpan: 3, order: 2 },
    { id: 'w3', type: 'RECENT_ACTIVITIES', title: 'Live Workflow Execution Feed', gridSpan: 4, order: 3 },
  ],
  MARKETING: [
    { id: 'w1', type: 'KPI_CUSTOMERS', title: 'New Leads Generated', gridSpan: 1, order: 1 },
    { id: 'w2', type: 'MARI_INSIGHTS', title: 'Mari Content Performance', gridSpan: 3, order: 2 },
  ],
  CUSTOM: []
};
