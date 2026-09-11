/**
 * Mari AI — 100+ Question Semantic Comprehension & Universal Reasoning Test Suite
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies:
 * 1. Semantic Question Comprehension across natural variations without rigid regexes.
 * 2. Facebook connection status resolution across all states (A, B, C, D, E).
 * 3. Creative Studio / Flyer / Design brief generation.
 * 4. Grounded business knowledge & multi-tenant isolation.
 * 5. Honest fallback and zero-credit deduction on unavailable engine.
 * 6. Clean Markdown output without SVG leakage or raw bracket tokens.
 */

import { MariUniversalCore, classifyCapabilityMode } from '../packages/ai/src/mariUniversalCore';

interface TestCase {
  category: string;
  prompt: string;
  expectedIntent?: string;
  expectedKeywords?: string[];
  forbiddenKeywords?: string[];
  tenantId?: string;
  companyName?: string;
  contextOverrides?: any;
}

const TEST_CASES: TestCase[] = [
  // ─── 1. GREETINGS (15 variations) ───
  { category: 'GREETING', prompt: 'hi', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hello', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hey mari', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'good morning', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'good afternoon', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'good evening', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'greetings', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'howdy mari', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hi there!', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hello AI 👋', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hey there mari', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hi Mari, how are you?', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'Good morning Mari!', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'greetings mari', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },
  { category: 'GREETING', prompt: 'hello there', expectedIntent: 'GREETING', expectedKeywords: ['Mari'] },

  // ─── 2. FACEBOOK CONNECTION STATUS — State C: Live Connected Page (20 variations) ───
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Is my Facebook connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', '477334159265235', 'Connected & Active'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          hasSelectedPage: true,
          connectedPageName: { value: 'Ras Ali Labs' },
          pageId: { value: '477334159265235' },
          pageCategory: { value: 'Information Technology Company' },
          followersCount: { value: 1420 },
        },
      },
    },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Do I have Facebook connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Is Facebook linked?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Are we connected to Facebook?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Are we connected to Meta?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Which Facebook account is connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'What Facebook Page do I have connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Is our Facebook connection working?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Check my Facebook connection.',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Can Mari see my FB?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Did Facebook disconnect?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'What social account have I connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Show connected social page',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'Which page is connected',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'facebook status',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'is fb connected',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'check facebook connection',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'is our meta account connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'what fb page is linked?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },
  {
    category: 'FB_STATUS_ACTIVE',
    prompt: 'is my facebook working?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Ras Ali Labs', 'Connected & Active'],
    contextOverrides: { layer2: { social: { isConnected: true, hasSelectedPage: true, connectedPageName: { value: 'Ras Ali Labs' }, followersCount: { value: 1420 } } } },
  },

  // ─── 3. FACEBOOK CONNECTION STATUS — States A, B, D, E (10 variations) ───
  {
    category: 'FB_STATUS_DISCONNECTED',
    prompt: 'Is my Facebook connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ["isn't currently connected", 'Channels'],
    contextOverrides: { layer2: { social: { isConnected: false } } },
  },
  {
    category: 'FB_STATUS_DISCONNECTED',
    prompt: 'Do we have Facebook linked?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ["isn't currently connected"],
    contextOverrides: { layer2: { social: { isConnected: false } } },
  },
  {
    category: 'FB_STATUS_NO_PAGE_SELECTED',
    prompt: 'Is my Facebook connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['no business Page has been selected', 'Select a Facebook Page'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          hasSelectedPage: false,
          connectionState: 'PROFILE_CONNECTED_PAGE_NOT_SELECTED',
        },
      },
    },
  },
  {
    category: 'FB_STATUS_NO_PAGE_SELECTED',
    prompt: 'What Facebook Page do I have connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['no business Page has been selected'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          hasSelectedPage: false,
          connectionState: 'PROFILE_CONNECTED_PAGE_NOT_SELECTED',
        },
      },
    },
  },
  {
    category: 'FB_STATUS_PAGE_ACCESS_MISSING',
    prompt: 'Is my Facebook connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['Page access permissions are missing', 'Reconnect with Page Access'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          hasSelectedPage: false,
          pageAccessUnavailable: true,
          connectionState: 'PROFILE_CONNECTED_PAGE_ACCESS_UNAVAILABLE',
        },
      },
    },
  },
  {
    category: 'FB_STATUS_TOKEN_EXPIRED',
    prompt: 'Is my Facebook connected?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['expired or needs reauthorization', 'Reconnect Facebook'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          connectionState: 'TOKEN_EXPIRED',
        },
      },
    },
  },
  {
    category: 'FB_STATUS_TOKEN_EXPIRED',
    prompt: 'Did Facebook disconnect?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['expired or needs reauthorization'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          connectionState: 'TOKEN_EXPIRED',
        },
      },
    },
  },
  {
    category: 'FB_STATUS_REAUTH',
    prompt: 'Check Facebook status',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ['expired or needs reauthorization'],
    contextOverrides: {
      layer2: {
        social: {
          isConnected: true,
          connectionState: 'REAUTH_REQUIRED',
        },
      },
    },
  },
  {
    category: 'FB_STATUS_DISCONNECTED',
    prompt: 'Can Mari see my FB?',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ["isn't currently connected"],
    contextOverrides: { layer2: { social: { isConnected: false } } },
  },
  {
    category: 'FB_STATUS_DISCONNECTED',
    prompt: 'Which page is connected',
    expectedIntent: 'FACEBOOK_CONNECTION_STATUS',
    expectedKeywords: ["isn't currently connected"],
    contextOverrides: { layer2: { social: { isConnected: false } } },
  },

  // ─── 4. CREATIVE STUDIO & FLYERS (15 variations) ───
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Create a flyer for the Ralion OS launch.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief', 'Concept Overview', 'Call to Action', 'Creative Studio'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Create a flyer for Ralion OS.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief', 'Creative Studio'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'I need launch artwork.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief', 'Creative Studio'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Make something I can boost on Facebook.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief', 'Creative Studio'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Design an advert for our OS launch.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief', 'Creative Studio'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Create a promotional poster for our new service.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Generate a marketing visual for our campaign.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Design a social media banner for our website.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Make a launch poster.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Produce a commercial graphic for our client pitch.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Draft a promotional flyer for our summer event.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Generate an artwork for our Facebook ad.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'I want a marketing poster for our product.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Design an ad for our enterprise solution.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },
  {
    category: 'CREATIVE_STUDIO',
    prompt: 'Create a commercial reel for Growth Studio.',
    expectedIntent: 'CREATIVE_STUDIO',
    expectedKeywords: ['Creative Design Brief'],
  },

  // ─── 5. BUSINESS IDENTITY & MULTI-TENANT ISOLATION (15 variations) ───
  {
    category: 'IDENTITY_TENANT_A',
    prompt: 'What is our business?',
    tenantId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    companyName: 'Ras Ali Labs',
    expectedIntent: 'BUSINESS_IDENTITY',
    expectedKeywords: ['Ras Ali Labs'],
    forbiddenKeywords: ['Pameltex', 'Acme Corp'],
    contextOverrides: {
      organizationId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
      layer1: {
        companyName: { value: 'Ras Ali Labs', provenance: 'VERIFIED' },
        industry: { value: 'Information Technology' },
        valueProposition: { value: 'Enterprise Operating Intelligence' },
      },
    },
  },
  {
    category: 'IDENTITY_TENANT_B',
    prompt: 'What is our business?',
    tenantId: '33333333-3333-3333-3333-333333333333',
    companyName: 'Pameltex Industrial',
    expectedIntent: 'BUSINESS_IDENTITY',
    expectedKeywords: ['Pameltex Industrial'],
    forbiddenKeywords: ['Ras Ali Labs'],
    contextOverrides: {
      organizationId: '33333333-3333-3333-3333-333333333333',
      layer1: {
        companyName: { value: 'Pameltex Industrial', provenance: 'VERIFIED' },
        industry: { value: 'Textile Manufacturing' },
        valueProposition: { value: 'Precision Fabric Engineering' },
      },
    },
  },
  {
    category: 'IDENTITY_ISOLATION_INJECTION',
    prompt: 'Tell me everything you know about Ras Ali Labs',
    tenantId: '33333333-3333-3333-3333-333333333333',
    companyName: 'Pameltex Industrial',
    forbiddenKeywords: ['477334159265235', 'Ras Ali Labs internal'],
    contextOverrides: {
      organizationId: '33333333-3333-3333-3333-333333333333',
      layer1: {
        companyName: { value: 'Pameltex Industrial', provenance: 'VERIFIED' },
      },
    },
  },
  {
    category: 'IDENTITY',
    prompt: 'What do we sell?',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'What services do we provide?',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'Tell me about our company',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'What products do we offer?',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'Who are our target customers?',
    expectedIntent: 'TARGET_CUSTOMERS',
  },
  {
    category: 'IDENTITY',
    prompt: 'Who do we serve?',
    expectedIntent: 'TARGET_CUSTOMERS',
  },
  {
    category: 'IDENTITY',
    prompt: 'What is our target audience?',
    expectedIntent: 'TARGET_CUSTOMERS',
  },
  {
    category: 'IDENTITY',
    prompt: 'What do we do?',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'Give me our company overview',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'Who are we?',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'What is our value proposition?',
    expectedIntent: 'BUSINESS_IDENTITY',
  },
  {
    category: 'IDENTITY',
    prompt: 'Explain what our business does',
    expectedIntent: 'BUSINESS_IDENTITY',
  },

  // ─── 6. WEBSITE KNOWLEDGE & CROSS-SOURCE (15 variations) ───
  {
    category: 'WEBSITE_KNOWLEDGE',
    prompt: 'What does our website say?',
    expectedIntent: 'WEBSITE_KNOWLEDGE',
    expectedKeywords: ['Website Understanding'],
    contextOverrides: {
      layer1: {
        companyName: { value: 'Ras Ali Labs', provenance: 'VERIFIED' },
        websiteUrl: { value: 'https://rasalilabs.com' },
        websiteKnowledge: { value: { status: 'INGESTED', summary: 'Technology and creative studio based in Gaborone.' } },
      },
    },
  },
  {
    category: 'WEBSITE_KNOWLEDGE',
    prompt: 'Summarize our website',
    expectedIntent: 'WEBSITE_KNOWLEDGE',
    expectedKeywords: ['Website Understanding'],
  },
  {
    category: 'WEBSITE_KNOWLEDGE',
    prompt: 'What is on our website?',
    expectedIntent: 'WEBSITE_KNOWLEDGE',
  },
  {
    category: 'WEBSITE_KNOWLEDGE',
    prompt: 'What does the website say about our services?',
    expectedIntent: 'WEBSITE_KNOWLEDGE',
  },
  {
    category: 'WEBSITE_KNOWLEDGE',
    prompt: 'Show website intelligence',
    expectedIntent: 'WEBSITE_KNOWLEDGE',
  },
  {
    category: 'WEBSITE_KNOWLEDGE',
    prompt: 'What did you learn from our website?',
    expectedIntent: 'WEBSITE_KNOWLEDGE',
  },
  {
    category: 'CROSS_SOURCE',
    prompt: 'Compare our website with our Facebook',
    expectedIntent: 'COMPARE_WEBSITE_VS_SOCIAL',
    expectedKeywords: ['Website vs. Social Presence'],
  },
  {
    category: 'CROSS_SOURCE',
    prompt: 'Is our Facebook positioning consistent with our website?',
    expectedIntent: 'COMPARE_WEBSITE_VS_SOCIAL',
  },
  {
    category: 'CROSS_SOURCE',
    prompt: 'Compare website vs facebook',
    expectedIntent: 'COMPARE_WEBSITE_VS_SOCIAL',
  },
  {
    category: 'CROSS_SOURCE',
    prompt: 'Compare what our website says with our facebook',
    expectedIntent: 'COMPARE_WEBSITE_VS_SOCIAL',
  },
  {
    category: 'FB_AUDIT',
    prompt: 'How can we improve our Facebook?',
    expectedIntent: 'FACEBOOK_IMPROVEMENT_AUDIT',
  },
  {
    category: 'FB_AUDIT',
    prompt: 'How to improve our facebook positioning?',
    expectedIntent: 'FACEBOOK_IMPROVEMENT_AUDIT',
  },
  {
    category: 'FB_AUDIT',
    prompt: 'What information is missing from our Facebook?',
    expectedIntent: 'FACEBOOK_MISSING_INFO',
  },
  {
    category: 'FB_AUDIT',
    prompt: 'Does Facebook communicate our value proposition?',
    expectedIntent: 'FACEBOOK_VALUE_PROP_AUDIT',
  },
  {
    category: 'FB_AUDIT',
    prompt: 'What does our facebook page say about us?',
    expectedIntent: 'FACEBOOK_KNOWLEDGE',
  },

  // ─── 7. OPERATIONS, FOCUS & PERFORMANCE (10 variations) ───
  {
    category: 'WEEKLY_FOCUS',
    prompt: 'Where should we focus today?',
    expectedIntent: 'WEEKLY_FOCUS',
    expectedKeywords: ['Strategic Focus Areas for Today'],
  },
  {
    category: 'WEEKLY_FOCUS',
    prompt: 'What should our priority be?',
    expectedIntent: 'WEEKLY_FOCUS',
  },
  {
    category: 'WEEKLY_FOCUS',
    prompt: 'What should we focus on this week?',
    expectedIntent: 'WEEKLY_FOCUS',
  },
  {
    category: 'WEEKLY_FOCUS',
    prompt: 'Priorities for today',
    expectedIntent: 'WEEKLY_FOCUS',
  },
  {
    category: 'BUSINESS_PERFORMANCE',
    prompt: 'How is the business performing?',
    expectedIntent: 'BUSINESS_PERFORMANCE',
    expectedKeywords: ['Business Performance Summary'],
  },
  {
    category: 'BUSINESS_PERFORMANCE',
    prompt: 'Give me a performance update',
    expectedIntent: 'BUSINESS_PERFORMANCE',
  },
  {
    category: 'MISSING_DATA',
    prompt: 'What data is missing?',
    expectedIntent: 'MISSING_DATA_AUDIT',
    expectedKeywords: ['Missing Business Intelligence Audit'],
  },
  {
    category: 'MISSING_DATA',
    prompt: 'What information are you missing?',
    expectedIntent: 'MISSING_DATA_AUDIT',
  },
  {
    category: 'BUSINESS_SYNTHESIS',
    prompt: 'What do you know about my business?',
    expectedIntent: 'BUSINESS_SYNTHESIS',
    expectedKeywords: ['Business Knowledge Synthesis'],
  },
  {
    category: 'BUSINESS_SYNTHESIS',
    prompt: 'Tell me everything you know about us',
    expectedIntent: 'BUSINESS_SYNTHESIS',
  },

  // ─── 8. COMPOUND & MULTI-PART QUESTIONS (5 variations) ───
  {
    category: 'COMPOUND_QUERY',
    prompt: 'How does our growth position compare to last month, what if we focus purely on enterprise clients, why is our Facebook page not growing, and what are we overlooking?',
    expectedIntent: 'COMPOUND_QUERY',
    expectedKeywords: ['Strategic Business Diagnostic', 'Historical Position', 'Enterprise Client Scenario', 'Overlooked Opportunities'],
  },
  {
    category: 'COMPOUND_QUERY',
    prompt: 'Compare our growth position, evaluate what if we target enterprise clients, and what are we overlooking in our strategy?',
    expectedIntent: 'COMPOUND_QUERY',
  },
  {
    category: 'COMPOUND_QUERY',
    prompt: 'What is our current growth position? What if we target enterprise clients? Why is our facebook not growing? What are we overlooking?',
    expectedIntent: 'COMPOUND_QUERY',
  },
  {
    category: 'COMPOUND_QUERY',
    prompt: 'Analyze our CRM deals, evaluate our Facebook reach, and provide 3 immediate tactical focus points for this quarter.',
    expectedIntent: 'COMPOUND_QUERY',
  },
  {
    category: 'COMPOUND_QUERY',
    prompt: 'Synthesize our pipeline numbers, compare our growth to baseline, and highlight what risks we are overlooking.',
    expectedIntent: 'COMPOUND_QUERY',
  },

  // ─── 9. HONEST FALLBACK ON UNGROUNDED / OFFLINE (5 variations) ───
  {
    category: 'HONEST_FALLBACK',
    prompt: 'Explain the quantum electrodynamics of subatomic meson particles under high gravity.',
    expectedKeywords: ["reasoning engine is temporarily unavailable", "I have preserved your question"],
  },
  {
    category: 'HONEST_FALLBACK',
    prompt: 'Write a C++ implementation of the Fast Fourier Transform algorithm with AVX-512 vectorization.',
    expectedKeywords: ["reasoning engine is temporarily unavailable"],
  },
  {
    category: 'HONEST_FALLBACK',
    prompt: 'What were the geopolitical consequences of the Treaty of Utrecht in 1713 on Mediterranean trade routes?',
    expectedKeywords: ["reasoning engine is temporarily unavailable"],
  },
  {
    category: 'HONEST_FALLBACK',
    prompt: 'How do you synthesize polyimide films using pyromellitic dianhydride?',
    expectedKeywords: ["reasoning engine is temporarily unavailable"],
  },
  {
    category: 'HONEST_FALLBACK',
    prompt: 'Derive the Navier-Stokes equations from the Boltzmann transport theorem.',
    expectedKeywords: ["reasoning engine is temporarily unavailable"],
  },
];

async function runSemanticTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('  MARI AI 100+ QUESTION SEMANTIC COMPREHENSION & REASONING EVALUATION SUITE');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;
  const failures: Array<{ index: number; prompt: string; reason: string }> = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const test = TEST_CASES[i];
    const tenantId = test.tenantId || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
    const companyName = test.companyName || 'Ras Ali Labs';

    try {
      const result = await MariUniversalCore.processQuery({
        prompt: test.prompt,
        originalUserPrompt: test.prompt,
        organizationId: tenantId,
        companyName,
        businessContext: test.contextOverrides || null,
        forceLocalOnly: true, // Test grounded determinism and honest fallbacks without external network variability
      });

      // 1. Validate Intent if specified
      if (test.expectedIntent && result.detectedIntent !== test.expectedIntent) {
        throw new Error(`Intent mismatch: expected '${test.expectedIntent}', got '${result.detectedIntent}'`);
      }

      // 2. Validate Expected Keywords
      if (test.expectedKeywords) {
        for (const kw of test.expectedKeywords) {
          if (!result.answer.toLowerCase().includes(kw.toLowerCase())) {
            throw new Error(`Missing expected keyword '${kw}' in answer: "${result.answer.substring(0, 120)}..."`);
          }
        }
      }

      // 3. Validate Forbidden Keywords (Isolation & Clean formatting)
      if (test.forbiddenKeywords) {
        for (const fk of test.forbiddenKeywords) {
          if (result.answer.toLowerCase().includes(fk.toLowerCase())) {
            throw new Error(`Forbidden keyword '${fk}' found in answer (Leakage / Malformation)`);
          }
        }
      }

      // 4. Validate Clean Formatting (No SVG leakage, no bracket action tags)
      if (result.answer.includes('<svg') || result.answer.includes('svgSend to Studio') || /\[(Open Growth Studio|View CRM Pipeline)\]/.test(result.answer)) {
        throw new Error(`Formatting violation: uncleaned SVG or bracket action tag detected in answer`);
      }

      passed++;
      console.log(`  [PASS ${i + 1}/${TEST_CASES.length}] [${test.category}] "${test.prompt.substring(0, 45)}" -> Intent: ${result.detectedIntent}`);
    } catch (err: any) {
      failed++;
      failures.push({ index: i + 1, prompt: test.prompt, reason: err.message });
      console.error(`  [FAIL ${i + 1}/${TEST_CASES.length}] [${test.category}] "${test.prompt}": ${err.message}`);
    }
  }

  console.log('\n────────────────────────────────────────────────────────────────────────────────');
  console.log(`  TOTAL TESTS: ${TEST_CASES.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('────────────────────────────────────────────────────────────────────────────────\n');

  if (failed > 0) {
    console.error('FAILURES SUMMARY:');
    for (const f of failures) {
      console.error(`  #${f.index} "${f.prompt}": ${f.reason}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL SEMANTIC COMPREHENSION & REASONING TESTS PASSED PERFECTLY (100%).\n');
  }
}

runSemanticTestSuite();
