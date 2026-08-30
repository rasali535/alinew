/**
 * RALION OS — STRUCTURED CREATIVE BRIEF & DESIGN SYSTEM CONTRACTS
 * 
 * Formal contracts separating raw visual asset generation from
 * deterministic typography, brand layout composition, and quality scoring.
 */

export type CreativeFormat = '1:1_SQUARE' | '4:5_PORTRAIT' | '16:9_LANDSCAPE' | '9:16_STORY';

export type CreativeType = 'POSTER' | 'FLYER';

export type CreativeTemplateId =
  | 'CORPORATE_HERO'     // Template A: Large visual, headline left/bottom, CTA
  | 'PRODUCT_FOCUS'      // Template B: Product center, headline top, feature chips, CTA
  | 'SERVICE_PROMO'      // Template C: Strong headline, supporting visual, 3 benefit checkmarks, CTA
  | 'OFFER_DISCOUNT'     // Template D: Large promo badge, urgency indicator, visual, CTA
  | 'ANNOUNCEMENT'       // Template E: Dominant typography statement, brand mark, CTA
  | 'EVENT_SHOWCASE'     // Template F: Event title, date/time/location chips, hero visual, CTA
  | 'MULTI_SECTION_FLYER'; // Dedicated Multi-Section Structured Flyer

export type TypographyStyle =
  | 'MODERN_INTER'            // Inter / Inter (Clean Modern)
  | 'CORPORATE_MONTSERRAT'    // Montserrat / Inter (Executive Trust)
  | 'EDITORIAL_PLAYFAIR'      // Playfair Display / Inter (Luxury Editorial)
  | 'BOLD_GROTESK';           // Space Grotesk / Inter (High Energy Tech)

export interface BrandColorPalette {
  primary: string;       // Main brand accent / button fill
  secondary: string;     // Supporting highlight / badge
  accent: string;        // Urgency / spark accent
  neutralDark: string;   // Deep background / scrim (e.g. #09090b)
  neutralLight: string;  // Crisp text (e.g. #ffffff)
  textMuted: string;     // Subtitle / disclaimer text (e.g. #94a3b8)
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
}

export interface StructuredCreativeBrief {
  id: string;
  campaignObjective: 'LEAD_GENERATION' | 'BRAND_AWARENESS' | 'PRODUCT_LAUNCH' | 'EVENT_PROMOTION' | 'SPECIAL_OFFER' | 'RECRUITMENT';
  targetAudience: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'whatsapp' | 'web';
  format: CreativeFormat;
  creativeType: CreativeType;
  templateId: CreativeTemplateId;
  
  // Deterministic Copy Hierarchy
  brandName: string;
  headline: string;          // 4-10 words
  subheadline?: string;      // 8-18 words
  bodyCopy?: string;         // Max 30 words
  keyBenefits?: string[];    // 1-3 crisp benefit points
  offerBadge?: string;       // e.g. "SAVE 25%", "FREE TRIAL", "LIMITED ACCESS"
  cta: string;               // 2-5 words, e.g. "Request a Quote →"
  contactDetails?: ContactInfo;
  urgency?: string;          // e.g. "Offer Ends Friday", "Seats Limited"
  disclaimers?: string;      // e.g. "Terms & Conditions apply."
  
  // Design & Brand System
  brandColors: BrandColorPalette;
  typographyStyle: TypographyStyle;
  logoUrl?: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  // AI Visual Generation Direction (Separated from Copy)
  visualDirection: {
    prompt: string;
    style: string;
    negativeSpacePlacement: 'bottom' | 'top' | 'left' | 'right' | 'center';
  };
}

export interface CreativeQualityScorecard {
  visualScore: number;       // 1 - 10 (Subject resolution, clarity, negative space)
  hierarchyScore: number;    // 1 - 10 (Visual scanability: Brand -> Headline -> Offer -> CTA)
  typographyScore: number;   // 1 - 10 (Font pairing, weights, kerning, line heights)
  brandingScore: number;     // 1 - 10 (Logo aspect ratio, brand palette adherence)
  readabilityScore: number;  // 1 - 10 (Contrast ratio, scrim opacity, word count limits)
  ctaScore: number;          // 1 - 10 (CTA prominence, button affordance)
  overallScore: number;      // 1.0 - 10.0 Weighted composite
  passedChecks: string[];
  warnings: string[];
}

export interface CreativeVariation {
  id: string;
  title: string;
  description: string;
  brief: StructuredCreativeBrief;
  qualityScore: CreativeQualityScorecard;
  previewUrl?: string;
}

export interface FormatDimensions {
  width: number;
  height: number;
  aspectRatio: string;
  label: string;
}

export const SOCIAL_DIMENSIONS: Record<CreativeFormat, FormatDimensions> = {
  '1:1_SQUARE': { width: 1080, height: 1080, aspectRatio: '1:1', label: '1:1 Square (Instagram / Facebook)' },
  '4:5_PORTRAIT': { width: 1080, height: 1350, aspectRatio: '4:5', label: '4:5 Feed Portrait (High Engagement)' },
  '16:9_LANDSCAPE': { width: 1200, height: 675, aspectRatio: '16:9', label: '16:9 Landscape (LinkedIn / X / Web)' },
  '9:16_STORY': { width: 1080, height: 1920, aspectRatio: '9:16', label: '9:16 Story / Reel (TikTok / Shorts)' },
};
