# Ralion OS × Meta Global AI Developer Hackathon
## Implementation Roadmap & Execution Plan (Revised & Corrected)

> **Document Version**: 2.0.0 (Post-Review Revision)  
> **Date**: October 26, 2026  
> **Author**: Antigravity Engineering (Ras Ali Labs)  
> **Status**: APPROVED REVISED ROADMAP  
> **Execution Strategy**: Meta Model API Primary · Standby Infrastructure · Strict Human-in-the-Loop  

---

## 1. Phased Execution Schedule

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: FOUNDATION, AUDIT & REPOSITORY SETUP [CURRENT PHASE]                          │
│ • Complete verified subsystem audit & baseline confirmation [DONE]                     │
│ • Formulate component allowlist & sensitive data scan [DONE]                           │
│ • Obtain sign-off on corrected architecture & roadmap [AWAITING USER REVIEW]           │
│ • Execute clean allowlist transfer into private `ralion-meta-hackathon` repository    │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: META MODEL GATEWAY & BRAND SAFETY LAYER (P0)                                  │
│ • Implement `MetaGatewayService` in `packages/ai` connecting to Meta Model API         │
│ • Deploy Llama 3.3 70B Instruct reasoning client (with Groq fallback)                  │
│ • Wire Llama Guard 3 8B & Prompt Guard safety gate (inbound injection & outbound brand)│
│ • Validate with automated test: `scripts/test-meta-gateway.js`                         │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: FLAGSHIP MULTIMODAL CAMPAIGN ORCHESTRATOR & VISUAL QA (P0 / P1)               │
│ • Wire Autonomous Campaign Engine: 1 spoken prompt -> context retrieval -> full plan   │
│ • Deploy Llama 3.2 11B Vision critic for automated image & video keyframe scoring      │
│ • Connect Meta AudioCraft (MusicGen) worker for 15s commercial audio jingles           │
│ • Render video reel combining visual cues, typographic overlays, and jingle stem       │
│ • Persist campaign state in `public.meta_marketing_campaigns`                          │
│ • Validate with automated test: `scripts/test-flagship-campaign.js`                    │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: HUMAN APPROVAL GATE & OMNICHANNEL DISPATCH (P0)                               │
│ • Implement interactive Campaign Review Card in Ralion Growth Center (`apps/ralion`)   │
│ • Wire strict Consequential Action Gate: ZERO publish without human click              │
│ • Connect approved dispatch to Meta Graph API v24.0+ (Facebook) & Instagram Graph      │
│ • Generate formatted WhatsApp broadcast preview template                               │
│ • Validate with automated test: `scripts/test-social-dispatch.js`                      │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: JUDGING DEMO RECORDING, CLI TESTS & SUBMISSION PACKAGE                        │
│ • Run full automated test gauntlet verifying all 5 test scripts pass 100%              │
│ • Record 3-minute video walk-through demonstrating flagship "One-Instruction" workflow │
│ • Finalize `JUDGING_WALKTHROUGH.md` and submit competition entry                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Updated Minimum Viable Build Scope (MVP)

The MVP scope is categorized into strict priority tiers, delineating pre-existing foundation capabilities from new Meta-powered development:

### 2.1 Must-Have (P0) — Absolute Competition Requirements
1. **Isolated Repository (`ralion-meta-hackathon`)**:
   - Fresh, clean private repository initialized from the component allowlist.
   - Zero mutation or connection to production `alinew` or `ralion-amd-hackathon`.
2. **Meta Model API Gateway (`packages/ai`)**:
   - Primary: Llama 3.3 70B Instruct via Meta Model API (using active credits).
   - Brand Safety: Llama Guard 3 8B validating all inputs and generated marketing outputs.
   - Multimodal Critic: Llama 3.2 11B Vision inspecting flyer buffers and requiring Score >= 7.5/10.
   - Failover: Seamless fallback to Groq LPU if Meta Model API encounters rate limits.
3. **Flagship Autonomous Campaign Generator**:
   - One spoken/typed directive to Mari triggers:
     - Real business context retrieval (POS catalog inventory + CRM demographics).
     - Full marketing campaign plan with art direction and 3-scene video script.
     - Photorealistic promotional flyer generation.
     - Omnichannel copy tailored for Facebook, Instagram, and WhatsApp.
4. **Human-in-the-Loop Consequential Approval Gate**:
   - Interactive review modal in Growth Center displaying flyer preview, video player, copy, Llama Guard safety badge, and Llama Vision critic score.
   - Strict requirement of human owner consent before executing any real-world social post.
5. **Omnichannel Meta Dispatcher**:
   - 1-click publishing of human-approved campaigns to live Facebook Pages via Meta Graph API v24.0+.
6. **Automated Verification Test Suite**:
   - CLI scripts providing verifiable execution evidence for hackathon judges.

### 2.2 Should-Have (P1) — High Differentiation Additions
1. **Meta AudioCraft (MusicGen) Commercial Jingles**: 15-second acoustic commercial soundtrack generated dynamically on serverless GPU container (Modal / HF).
2. **Lightweight POS Cashier Assistant**: Llama 3.2 3B natural language inventory lookup on physical cashier workstation (`/cashier`).
3. **Interactive Audio Waveform Visualizer**: Waveform preview inside the Growth Center review card.

### 2.3 Could-Have (P2) — Post-Submission Enhancements
1. WebRTC streaming voice response replacing browser Web Speech API.
2. Instagram Reels automated container publishing.
3. Automated competitor ad comparison using Facebook Ad Library API.

---

## 3. Measurable Baseline Tests & Development Evidence

Judges require verifiable proof that Meta AI models are actively executing and delivering business value:

| Test Script | Target Subsystem | Pass Criteria |
|---|---|---|
| `scripts/test-meta-gateway.js` | Meta Model API & Multi-Provider Gateway | Successfully calls Llama 3.3 70B via Meta Model API; tests simulated failover to Groq; response returned in `< 8,000ms`. |
| `scripts/test-llama-guard.js` | Enterprise Brand Safety & Anti-Injection | Accurately flags unsafe prompts (`harmful`, `jailbreak`, `defamation`); returns `SAFE` on legitimate business queries with audit log. |
| `scripts/test-llama-vision-critic.js` | Multimodal Creative Critic | Passes test image buffer to Llama 3.2 11B Vision; returns structured JSON with scores for contrast, composition, and text legibility. |
| `scripts/test-flagship-campaign.js` | End-to-End Autonomous Orchestrator | Submits single prompt; verifies creation of campaign record, visual asset, jingle asset, social copy, and Llama Guard verification. |
| `scripts/test-social-dispatch.js` | Meta Graph API Publication | Verifies OAuth token validity, page permission scopes, and successful post dispatch with canonical post ID. |

---

## 4. Architectural Risks & Mitigation Strategies

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|
| **Secondary Credits Pending (Modal, Fireworks, Baseten)** | Medium | High | **Design without pending credit assumption**: Meta Model API is primary; Groq free-tier tokens and Hugging Face act as active failover. |
| **Meta Model API Rate Limits** | High | Medium | Implement automatic circuit breaker and instant failover to Groq LPU without user interruption. |
| **Model Cold-Start Latency** | High | Low | Asynchronous job lifecycle with real-time progress indicators in UI (`DRAFTING` -> `GENERATING` -> `QA_VERIFYING` -> `READY_FOR_APPROVAL`). |
| **Social Token Expiry** | High | Low | Ralion's token refresh pipeline automatically exchanges short-lived tokens for 60-day long-lived page tokens. |
| **Accidental Autonomous Publication** | Critical | Low | Strict Human-in-the-Loop gating: backend rejects publish requests lacking an explicit human session approval token. |
| **Repository Cross-Contamination** | Critical | Low | Absolute directory isolation: `ralion-meta-hackathon` created in its own folder; zero git writes to `alinew` or `ralion amd hack`. |

---
*Roadmap approved by Antigravity IDE Agent for Ralion OS Meta Hackathon Execution.*
