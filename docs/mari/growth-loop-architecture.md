# Mari AI — Growth Loop Architecture

## 1. The 7-Stage Intelligence Loop
1. **KNOW**: Ingests and maintains living business facts (products, pricing, brand voice, SOPs).
2. **DIAGNOSE**: Evaluates live CRM pipeline ($84.5k - $145k), Facebook Page metrics (107 fans, +38.4% reach), and task queues.
3. **PRIORITIZE**: Scores moves across **Impact**, **Urgency**, **Effort**, and **Confidence** to find the single highest-impact focus.
4. **ACT**: Connects recommendations to 1-click Ralion OS workflows (`/crm`, `/growth`, `/tasks`).
5. **MEASURE**: Monitors leads generated, reach surge, and deal progression.
6. **LEARN**: Records accepted and rejected decisions in tenant-isolated **Mari Growth Memory**.
7. **GROW**: Successive recommendations become progressively more business-specific and commercial.

---

## 2. Growth Memory Structure
```typescript
interface GrowthMemoryRecord {
  id: string;
  recommendation: string;
  decision: 'ACCEPTED' | 'REJECTED';
  rejectionReason?: string;
  actionTaken?: string;
  timestamp: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  resultMetrics?: Record<string, any>;
  lessonsLearned: string;
}
```
