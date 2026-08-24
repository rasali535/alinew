# Mari Orchestration Contracts & Type Signatures

## 1. Recommendation Contract
```typescript
export interface MariRecommendationContract {
  organizationId: string;
  recommendationId: string;
  type: 'CAMPAIGN_CREATE' | 'SOCIAL_SCHEDULE' | 'CRM_FOLLOWUP' | 'ANALYTICS_REVIEW';
  objective: string;
  reasoning: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedImpact: string;
  confidence: number;
  targetModule: 'growth' | 'social' | 'crm' | 'analytics' | 'content';
  action: string;
  parameters: {
    campaignName?: string;
    topic?: string;
    targetAudience?: string;
    recommendedFormat?: string;
    suggestedPostTimes?: string[];
    dealIds?: string[];
    prospectNames?: string[];
    platform?: 'facebook' | 'instagram' | 'linkedin' | 'all';
    [key: string]: any;
  };
  sourceContext: Record<string, any>;
  createdAt: string;
}
```

## 2. Action Result Contract
```typescript
export interface MariActionResult {
  recommendationId: string;
  organizationId: string;
  actionId: string;
  status: 'CREATED' | 'UPDATED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'REQUIRES_REVIEW';
  module: 'growth' | 'social' | 'crm' | 'analytics';
  createdResource?: {
    id: string;
    type: 'CAMPAIGN' | 'POST' | 'TASK' | 'PROPOSAL_TOUCHPOINT' | 'REPORT';
    title: string;
    platform?: string;
    url?: string;
    scheduledAt?: string;
    metadata?: Record<string, any>;
  };
  summary: string;
  resultMetrics?: Record<string, any>;
  mariResponseText: string;
  nextSuggestedActions?: Array<{
    label: string;
    route: string;
    type: string;
    payload?: any;
  }>;
  completedAt: string;
}
```
