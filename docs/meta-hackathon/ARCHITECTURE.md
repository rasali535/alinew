# Ralion OS × Meta Global AI Developer Hackathon
## Technical Foundation Architecture & Blueprint (Revised & Corrected)

> **Document Version**: 2.0.0 (Post-Review Revision)  
> **Date**: October 26, 2026  
> **Author**: Antigravity Engineering (Ras Ali Labs)  
> **Status**: APPROVED REVISED ARCHITECTURAL BLUEPRINT  
> **Primary AI Engine**: Meta Model API (Directly Accessible via Active Credits)  
> **Optional Standby Infrastructure**: Fireworks AI, Baseten, Modal Labs (Credits Pending)  

---

## 1. System Topology & Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               RALION OS WEB & CASHIER SURFACES                                  │
│                 (Next.js 14 App Router · React 18 · TypeScript · Tailwind / Vanilla CSS)        │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │ HTTPS / WSS / Server Actions
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           RALION AUTONOMOUS INTELLIGENCE LAYER                                  │
│                                                                                                 │
│  ┌────────────────────────┐    ┌───────────────────────────┐    ┌────────────────────────────┐  │
│  │   Mari Router v2       │───▶│ Business Context Ingestion│───▶│   Tenant Knowledge Vector  │  │
│  │ (Intent Classification)│    │(CRM, POS Stock, Analytics)│    │   (RAG Grounding Layer)    │  │
│  └───────────┬────────────┘    └───────────────────────────┘    └────────────────────────────┘  │
│              │                                                                                  │
│              ▼                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                       PRIMARY ENGINE: META MODEL API (Directly Accessible)                │  │
│  │                                                                                           │  │
│  │   Strategic Reasoning & Planning           Multimodal Visual Inspection & Critic          │  │
│  │   • Llama 3.3 70B Instruct (Primary)       • Llama 3.2 11B Vision Instruct (Critic)       │  │
│  │   • Llama 3.1 405B Instruct (Complex)      • Llama 3.2 90B Vision Instruct (High-Res)     │  │
│  │                                                                                           │  │
│  │   Enterprise Trust & Safety Guardrails     Edge & Cashier POS Optimization                │  │
│  │   • Llama Guard 3 8B (Content Safety)      • Llama 3.2 3B Instruct (Lightweight POS)      │  │
│  │   • Prompt Guard (Injection Shield)        • Llama 3.2 1B Instruct (Fast Classifier)      │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                              │                                                  │
│                                              ▼ (Failover / Specialized Workloads)               │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │              OPTIONAL & STANDBY INFRASTRUCTURE PROVIDERS (Credits Pending)                │  │
│  │  • Modal Labs: Serverless GPU Container for Meta AudioCraft (MusicGen Jingle Synthesis)   │  │
│  │  • Fireworks AI: Standby High-Speed Inference Failover Endpoint                           │  │
│  │  • Baseten: Dedicated Private Model Endpoint Failover                                     │  │
│  │  • Groq & Hugging Face: Free-Tier Rate-Limit Failover & Local Deterministic Fallback      │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      CONSEQUENTIAL ACTION HUMAN-IN-THE-LOOP APPROVAL GATE                       │
│                                                                                                 │
│   • Renders Interactive Campaign Review Card in Ralion Growth Center                            │
│   • Displays: Flyer Preview · Video Reel Player · AudioCraft Jingle · Social Post Copy          │
│   • Verified Badges: Llama Guard 3 Security Seal · Llama 3.2 Vision Critic Score (>= 7.5/10)     │
│   • ZERO AUTOMATIC DISPATCH: Requires explicit human owner click on [Approve & Dispatch]        │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │ On Human Owner Approval
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
┌───────────────────────────────────────────┐   ┌─────────────────────────────────────────────────┐
│      STORAGE & PERSISTENCE SUBSYSTEM      │   │        OMNICHANNEL SOCIAL DISPATCH LAYER        │
│                                           │   │                                                 │
│ • Supabase PostgreSQL 15+ (RLS Engine)    │   │ • Meta Graph API v24.0+ (Facebook Pages)        │
│ • Cloudflare R2 Media Vault (S3 SigV4)    │   │ • Instagram Graph API (Reels, Feed, Carousel)   │
│ • Tables: meta_marketing_campaigns,       │   │ • WhatsApp Business Platform (Broadcast CTA)    │
│   meta_campaign_assets, meta_audit        │   │ • Unified Community Inbox & Feedback Webhooks   │
└───────────────────────────────────────────┘   └─────────────────────────────────────────────────┘
```

---

## 2. AI Provider Hierarchy & Fail-Safe Routing

### 2.1 Provider Order
1. **Primary Integration Path**: **Meta Model API**
   - Directly accessible using active Meta credits.
   - Hosted endpoints serving `meta-llama/Llama-3.3-70B-Instruct`, `Llama-3.1-405B-Instruct`, `Llama-3.2-11B-Vision-Instruct`, and `Llama-Guard-3-8B`.
2. **Secondary / Standby Infrastructure (Credits Pending)**:
   - **Modal Labs**: Deployed serverless A10G container executing Meta AudioCraft (MusicGen) and video rendering pipelines.
   - **Fireworks AI & Baseten**: Standby inference routes engaged only if Meta Model API experiences transient rate limits or outages.
3. **Tertiary & Free-Tier Failover**:
   - **Groq**: Free-tier ultra-fast LPU fallback for Llama 3.3 70B text reasoning.
   - **Hugging Face Inference API**: Fallback endpoint for AudioCraft audio generation.
   - **Local Deterministic Fallback**: In-process rule engine that formats grounded business briefs from database state if all external APIs are unreachable.

---

## 3. Comprehensive Multimodal Architecture

### 3.1 Voice Input & Spoken Responses
- **Input**: Natural speech captured in the browser via Web Speech API / AudioWorklet, streaming text into Mari's intent classifier.
- **Processing**: Llama 3.3 70B parses the owner's spoken directive in real time, understanding colloquial business commands (*"Mari, put together a clearance sale for Gauteng contractors"*).
- **Spoken Response**: Mari synthesizes a concise, professional audio briefing confirming the plan and directing the owner to review the prepared assets.

### 3.2 Autonomous Reasoning & Campaign Planning
- **Model**: **Llama 3.3 70B Instruct** (via Meta Model API).
- **Context Injection**: Retrieves real-time tenant facts from PostgreSQL:
  - Exact products in stock (e.g., DeWalt 20V Max Hammer Drill Kit, SKU TOOL-DCD996, 10 units available, $199.99).
  - High-value customer segments and target demographics.
  - Historic top-performing Facebook post themes and engagement rates.
- **Output**: Structured Campaign Plan with unified theme, audience personas, art direction, and promotional discount structures.

### 3.3 Branded Image Generation & Refinement
- **Prompt Engineering**: Llama 3.3 70B translates the campaign plan into an enriched, photorealistic commercial art brief with exact lighting, camera angle, and negative prompt specifications.
- **Rendering**: High-resolution rasterization engine produces multi-format assets:
  - `1:1 Square` (Feed posts)
  - `9:16 Vertical` (Stories & Reels)
- **Refinement**: Dynamic overlay of corporate logo, verified price tags, and contact CTAs.

### 3.4 Video Scriptwriting, Storyboarding, Rendering & Quality QA
- **Scriptwriting & Storyboarding (Llama 3.3 70B)**: Formats a 3-scene kinetic commercial storyboard (Hook -> Demonstration -> Offer & Call to Action) with exact timing cues.
- **Rendering Pipeline**: Assembles kinetic visuals, typographic text cards, and synthesized voiceover into an MP4 video container.
- **Visual Critic & Quality Verification (Llama 3.2 11B Vision)**:
  - Model inspects the rendered flyer image and video keyframes.
  - Scores: Visual Clarity (1-10), Text Legibility (1-10), and Brief Faithfulness (1-10).
  - **Invariant**: If the aggregate score is `< 7.5/10`, Mari automatically triggers an automated prompt refinement cycle before presenting the asset.

### 3.5 Commercial Audio Synthesis (Meta AudioCraft)
- **Engine**: **Meta AudioCraft (MusicGen Small/Medium)** running on serverless GPU container (Modal / HF).
- **Function**: Generates a 15-second acoustic commercial audio track tailored to the campaign mood (e.g., *"Upbeat modern acoustic corporate commercial groove with energetic rhythm"*).
- **Output**: Delivered as an MP3 audio stem and embedded into the final video reel.

### 3.6 Omnichannel Captions & Platform Adaptation
- **Llama 3.3 70B** crafts distinct, platform-tailored messages:
  - **Facebook**: Long-form narrative with customer benefits, warranty details, and comment prompt.
  - **Instagram**: Punchy visual aesthetic copy with targeted hashtag clusters (`#ContractorTools #GautengConstruction`).
  - **WhatsApp**: Direct, conversational broadcast template with interactive quick-reply buttons (`[Claim 20% Discount]`, `[View Catalog]`).

### 3.7 Consequential Action Human-in-the-Loop Gating
- **CRITICAL SAFETY PRINCIPLE**: Consequential real-world actions (publishing to live social feeds, spending ad budget, sending customer broadcasts) **CANNOT BE AUTONOMOUSLY EXECUTED WITHOUT HUMAN CONSENT**.
- **The Approval Gate**:
  - Assets and copy are staged in status `READY_FOR_APPROVAL`.
  - An interactive **Campaign Approval Card** appears in the Ralion Growth Center.
  - Displays Llama Guard 3 Safety Seal, Llama 3.2 Vision Critic Score, media players, and editable copy fields.
  - Execution only occurs when the authenticated business owner clicks **`[Approve & Dispatch]`**.

### 3.8 Media Storage & Delivery
- **Cloudflare R2 Media Vault**: Asynchronous uploads using S3 SigV4 authenticated headers.
- **Persistence**: Media URLs, model provenance, and generation latencies recorded in `public.meta_campaign_assets`.
- **Delivery**: CDN-cached public URLs for immediate browser playback and Meta Graph API ingestion.

---

## 4. Separation of Native Model Capabilities vs. External Infrastructure

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ NATIVE META MODEL CAPABILITIES (Inference)   │ EXTERNAL & PLATFORM SERVICES (Ralion OS)      │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • Llama 3.3 70B: Reasoning, Planning,         │ • PostgreSQL: Multi-tenant database, RLS,     │
│   Scriptwriting, Storyboarding, Copywriting   │   ACID transactions, and token telemetry      │
│ • Llama 3.2 11B/90B: Multimodal Visual Critic,│ • Cloudflare R2: S3 SigV4 media storage & CDN │
│   Quality Scoring, Layout Inspection          │ • Next.js Runtime: Human Approval Gate UI     │
│ • Llama Guard 3: Brand Safety, Anti-Injection │ • Rendering Pipeline: MP4/JPEG assembler      │
│ • AudioCraft (MusicGen): Commercial Jingles   │ • Meta Graph API: Facebook, IG & WhatsApp SDK │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 5. Flagship Demonstration Architecture: Step-by-Step Scenario

```
Step 1: Spoken Instruction
  Owner speaks to Mari: "Mari, launch an Autumn clearance for Gauteng contractors on our DeWalt Hammer Drills."

Step 2: Context Retrieval & Planning (Llama 3.3 70B)
  Mari queries PostgreSQL: DeWalt Hammer Drill Kit ($199.99, 10 units in stock).
  Llama 3.3 synthesizes comprehensive Autumn Contractor Campaign Brief.

Step 3: Brand Safety Gate (Llama Guard 3)
  Verifies zero toxic content, anti-defamation, and policy compliance -> Seals SAFETY_VERIFIED.

Step 4: Concurrent Multimodal Asset Synthesis
  ├── Flyer: Photorealistic commercial graphic with 20% discount badge.
  ├── Jingle: 15s acoustic upbeat audio track via Meta AudioCraft.
  ├── Reel: 15s kinetic demonstration video combining visuals and audio.
  └── Copy: Platform-tailored captions for Facebook, Instagram, and WhatsApp.

Step 5: Visual Critic Gate (Llama 3.2 Vision)
  Llama 3.2 Vision inspects flyer buffer -> Computes Quality Score: 9.2/10 (High Contrast, Legible Text).

Step 6: Human Approval & Omnichannel Dispatch
  Presents interactive modal in Growth Center.
  Owner reviews flyer, plays video with jingle, verifies captions.
  Owner clicks [Approve & Dispatch] -> Dispatched live via Meta Graph API v24.0+.
```

---
*Blueprint certified by Antigravity IDE Agent for Ralion OS Production & Meta Hackathon.*
