# Ralion OS — Mari AI Business Context Architecture

## 1. Overview & Core Mission
Mari AI operates under the fundamental principle: **"MARI SHOULD OPEN INFORMED, NOT EMPTY."**
Instead of behaving as a passive conversational chatbot requiring repeated user explanations, Mari AI maintains a persistent, organization-scoped **Business Context Engine** that dynamically assembles facts, live telemetry, and memory prior to user interaction.

```
                    MARI AI
                       │
                 MARI GATEWAY
                       │
              BUSINESS CONTEXT ENGINE
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  Business         Live State       Mari Memory
  Knowledge        & Activity
  (Layer 1)        (Layer 2)        (Layer 3)
        │              │              │
        ├──────────────┼──────────────┤
                       ▼
                MARI INTELLIGENCE
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Insights        Risks       Opportunities
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                    Actions
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
   Composer         Scheduler       Business Tools
```

---

## 2. Three-Layer Knowledge Model

### Layer 1: Long-Lived Business Knowledge
- **Company Identity**: Name, Industry, Slogan, Brand Positioning.
- **Brand Voice & Guidelines**: Tone, formatting, target market personas.
- **Products & Services**: Full catalog descriptions and tier structures.
- **SOPs & Reference Material**: Standard Operating Procedures, FAQs, policies.

### Layer 2: Current Business State
- **CRM Portfolio**: Pipeline valuation ($84,500), active customer accounts, deal stages.
- **Connected Social Telemetry**: Meta Graph API live metrics (107 fans, +38.4% reach, 4.8% engagement rate).
- **Operational Status**: Pending tasks, priority flags, system SLA uptime (99.8%).

### Layer 3: Mari Memory & Preferences
- **User Preferences**: Preferred communication styles (Executive, Concise).
- **Decision History**: Accepted and rejected recommendations with human rationales.
- **Strategic Priorities**: Target regional expansions (e.g. SADC B2B enterprise growth).

---

## 3. Context Versioning & Cache Lifecycle
- Every context snapshot carries a structured `context_version` string (e.g., `2026-08-24-v2`).
- Updates to local storage, database ledgers, or webhook events automatically trigger `BusinessContextService.invalidateContext()`.
- Caching TTL ensures low computational overhead while guaranteeing zero stale telemetry.
