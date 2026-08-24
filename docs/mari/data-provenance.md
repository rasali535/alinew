# Mari AI — Data Provenance & Grounding Framework

## 1. Provenance Classifications
Every fact and metric inside Mari carries strict provenance:
- **`VERIFIED`**: Exact data pulled directly from verified database tables or live OAuth provider APIs (e.g., 107 Facebook followers, $84,500 CRM pipeline).
- **`USER_PROVIDED`**: Explicit statements entered by workspace operators (e.g. strategic growth into SADC region).
- **`INFERRED`**: Analytical conclusions drawn algorithmically from data patterns (e.g. 2.3× video engagement multiplier).
- **`AI_RECOMMENDATION`**: Generated tactical proposals based on inferred patterns.

## 2. Zero-Fabrication Guarantee
- Mari will **NEVER** fabricate follower numbers, engagement statistics, deal values, or business facts.
- If data is unavailable or insufficient, Mari explicitly reports: *"Insufficient telemetry for a reliable calculation."*
