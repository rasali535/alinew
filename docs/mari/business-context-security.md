# Mari AI — Business Context Security & Tenant Isolation

## 1. Multi-Tenant Isolation
- All context assemblies are strictly scoped to the authenticated `organization_id`.
- Tenant context cross-contamination is prevented by cryptographic boundaries and server-side RBAC validation.
- Client-supplied organization IDs are validated against session credentials on every request.

## 2. Data Minimization & Secret Protection
- **CRITICAL RULE**: Mari AI prompt construction sanitizes all raw credentials, API secrets, OAuth access tokens, and session identifiers.
- Only synthesized business parameters (revenues, task statuses, follower totals, content themes) are passed to LLM model providers.

## 3. Human-in-the-Loop Governance
- Mari AI recommends actions but **NEVER** silently executes high-impact mutations without explicit user consent.
- Automated publishing requires manual human review unless an enterprise bypass policy is explicitly activated.
