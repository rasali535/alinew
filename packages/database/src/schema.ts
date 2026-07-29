export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  plan: string;
  status: string;
  expiresAt: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'IN_REVIEW' | 'DONE' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DealStage = 'LEAD' | 'CONTACTED' | 'PROSPECT' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | 'CLOSED_WON' | 'CLOSED_LOST';

export interface SalesDeal {
  id: string;
  title: string;
  companyName: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  triggerEvent?: string;
  trigger?: { event: string; conditions?: Record<string, any> };
  action: any;
  isActive: boolean;
}

export interface FuneralCase {
  id: string;
  orgId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  caseNumber: string;
  deceasedName: string;
  status: string;
  serviceDate: string;
}

export interface MariChatMessage {
  id: string;
  sender: 'user' | 'mari' | 'system';
  content: string;
  timestamp: string;
  agentRole?: string;
}
