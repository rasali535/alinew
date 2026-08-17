# Ralion OS — Mari AI Facebook Growth Intelligence Engine

**Document ID:** AI-SOC-2026-08  
**Component:** `MariFacebookGrowthService` (`apps/ralion/src/lib/services/social/mariFacebookGrowth.service.ts`)  

---

## 1. Core Principles & Privacy Guarantee

Mari AI operates under **Strict Data Minimization & Zero Credential Exposure**:
- Mari NEVER receives OAuth access tokens, refresh tokens, Zernio API keys, client secrets, or user passwords.
- Input context is scoped to `MariPageContext` containing aggregated metrics (followers, reach growth, engagement rate, top formats).
- Deterministic formulas calculate raw growth scores; generative AI models produce strategic insights, anomaly interpretations, and creative copywriting.

---

## 2. Deterministic Facebook Growth Score (0–100)

$$\text{Growth Score} = \frac{\text{Content Quality} + \text{Engagement} + \text{Consistency} + \text{Growth Velocity}}{4}$$

1. **Content Quality (0–100):** Evaluated against publishing activity and multimedia mix.
2. **Engagement (0–100):** Benchmarked against industry average (3.5% baseline).
3. **Consistency (0–100):** Measured across 30-day cadence.
4. **Growth Velocity (0–100):** 30-day follower trajectory.

---

## 3. Structured Growth Output & 7-Day Strategy

### Insights Generation
- `PERFORMANCE_INSIGHT`: E.g. *"Video Content Drives 62% of All Page Engagement"*
- `GROWTH_OPPORTUNITY`: E.g. *"Increase Posting Consistency to 3–4 Times Weekly"*
- `TIMING_INSIGHT`: E.g. *"Peak Engagement: Tuesday & Thursday 09:00–11:00 SAST"*
- `ANOMALY`: E.g. *"Audience Reach Up +13.1% Over Last 30 Days"*

### 7-Day Actionable Plan
Mari generates a day-by-day roadmap with specific timestamps, content formats (Reels, Infographics, Articles), strategic objectives, pre-drafted captions, and hashtags.

### Content Composer Hand-Off
Users can click **"Create in Composer →"** on any recommendation or plan day. The system transfers the prompt, caption, and hashtags into the Ralion Content Composer with the destination automatically set to the managed Facebook Page (`Ras Ali Labs`).
