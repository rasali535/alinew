# Mari AI — Organization Memory Architecture

## 1. Scope and Persistence
Mari Memory stores persistent learning signals generated from user decisions and operational history:
- **User Preferences**: Communication style, detail level, alert thresholds.
- **Accepted Recommendations**: Actions approved and scheduled by the user.
- **Rejected Recommendations**: Suggestions declined with rejection reason, preventing duplicate or unhelpful recommendations.
- **Strategic Themes**: Long-term organizational focus areas.

## 2. Privacy & Auditability
- Memories are auditable, editable, and deletable by workspace administrators.
- No cross-organizational training: models are never fine-tuned on tenant-specific memory graphs.
- Memory graph nodes are indexed locally and stored in encrypted PostgreSQL / Supabase stores.
