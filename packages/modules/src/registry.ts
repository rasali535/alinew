export interface IndustryModuleManifest {
  id: string;
  name: string;
  category: 'CORE' | 'GROWTH' | 'HEALTH' | 'FUNERAL' | 'LOGISTICS' | 'TRADE' | 'AI';
  description: string;
  icon: string;
  route: string;
  isIndustryPlugin: boolean;
  requiredPermissions: string[];
}

export const REGISTERED_MODULES: Record<string, IndustryModuleManifest> = {
  mari: {
    id: 'mari',
    name: 'Mari AI Workspace',
    category: 'AI',
    description: 'Conversational business assistant, RAG knowledge vector search, and automated Mari action drivers.',
    icon: 'sparkles',
    route: '/mari-ai',
    isIndustryPlugin: false,
    requiredPermissions: ['mari:ai_chat']
  },
  crm: {
    id: 'crm',
    name: 'Universal CRM',
    category: 'CORE',
    description: 'Customer relationship management, deals pipeline, and activity timeline.',
    icon: 'users',
    route: '/crm',
    isIndustryPlugin: false,
    requiredPermissions: ['crm:read']
  },
  tasks: {
    id: 'tasks',
    name: 'Task & Projects',
    category: 'CORE',
    description: 'Kanban boards, list views, and team project management.',
    icon: 'check-square',
    route: '/tasks',
    isIndustryPlugin: false,
    requiredPermissions: ['tasks:read']
  },
  calendar: {
    id: 'calendar',
    name: 'Universal Calendar',
    category: 'CORE',
    description: 'Cross-module appointment and event scheduling.',
    icon: 'calendar',
    route: '/calendar',
    isIndustryPlugin: false,
    requiredPermissions: ['tasks:read']
  },
  documents: {
    id: 'documents',
    name: 'Document Management',
    category: 'CORE',
    description: 'Centralized document repository with PDF generation & sharing.',
    icon: 'folder',
    route: '/documents',
    isIndustryPlugin: false,
    requiredPermissions: ['documents:read']
  },
  workflows: {
    id: 'workflows',
    name: 'No-Code Workflows',
    category: 'CORE',
    description: 'Visual event-action trigger automation engine.',
    icon: 'zap',
    route: '/workflows',
    isIndustryPlugin: false,
    requiredPermissions: ['workflows:manage']
  },
  billing: {
    id: 'billing',
    name: 'Billing & Invoices',
    category: 'CORE',
    description: 'Invoicing, subscriptions, and financial tracking.',
    icon: 'credit-card',
    route: '/billing',
    isIndustryPlugin: false,
    requiredPermissions: ['billing:manage']
  },
  growth: {
    id: 'growth',
    name: 'Ralion Growth',
    category: 'GROWTH',
    description: 'AI-powered social media management and campaign studio.',
    icon: 'trending-up',
    route: '/growth',
    isIndustryPlugin: false,
    requiredPermissions: ['growth:manage']
  },
  health: {
    id: 'health',
    name: 'Ralion Health',
    category: 'HEALTH',
    description: 'Clinical client records, intake case notes, and wellness assessments.',
    icon: 'heart-pulse',
    route: '/industry/health',
    isIndustryPlugin: true,
    requiredPermissions: ['industry:health']
  },
  funeral: {
    id: 'funeral',
    name: 'Ralion Funeral',
    category: 'FUNERAL',
    description: 'Funeral case files, family intake, casket inventory, and hearse fleet dispatch.',
    icon: 'shield',
    route: '/industry/funeral',
    isIndustryPlugin: true,
    requiredPermissions: ['industry:funeral']
  },
  logistics: {
    id: 'logistics',
    name: 'Ralion Logistics',
    category: 'LOGISTICS',
    description: 'Fleet management, driver dispatch, shipment tracking, and customs compliance.',
    icon: 'truck',
    route: '/industry/logistics',
    isIndustryPlugin: true,
    requiredPermissions: ['industry:logistics']
  },
  trade: {
    id: 'trade',
    name: 'Ralion Trade',
    category: 'TRADE',
    description: 'B2B procurement marketplace, vendor catalogs, and order management.',
    icon: 'shopping-bag',
    route: '/industry/trade',
    isIndustryPlugin: true,
    requiredPermissions: ['industry:trade']
  }
};
