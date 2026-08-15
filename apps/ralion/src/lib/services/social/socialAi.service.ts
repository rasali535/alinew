/**
 * Ralion Unified Social Media Architecture — Social AI Content Adaptor
 * Ras Ali Labs (Pty) Ltd
 * Automatically repurposes and optimizes a single content idea into platform-tailored formats.
 */

import { SocialPlatformType } from '@ralion/integrations';

export interface AdaptedContent {
  platform: SocialPlatformType;
  body: string;
  hashtags: string[];
  tips: string;
  charCount: number;
}

export class SocialAiService {
  /**
   * Repurpose a single core message into platform-optimized drafts
   */
  static adaptContent(baseIdea: string, platforms: SocialPlatformType[]): Record<SocialPlatformType, AdaptedContent> {
    const result: Partial<Record<SocialPlatformType, AdaptedContent>> = {};

    const cleanIdea = baseIdea.trim();

    for (const platform of platforms) {
      switch (platform) {
        case 'x': {
          const hook = cleanIdea.length > 200 ? cleanIdea.substring(0, 195) + '...' : cleanIdea;
          const body = `💡 ${hook}\n\nWhat are your thoughts on this? 👇 #Tech #Innovation`;
          result.x = {
            platform: 'x',
            body,
            hashtags: ['#Tech', '#Innovation', '#Enterprise'],
            tips: 'Under 280 characters with high-engagement opening hook.',
            charCount: body.length,
          };
          break;
        }

        case 'linkedin': {
          const body = `🚀 Elevating Enterprise Workflows\n\n${cleanIdea}\n\nKey Takeaways:\n• Scalable architecture driven by least-privilege security\n• Seamless multi-channel orchestration\n• Unified telemetry & AI copilot\n\nHow is your organization addressing this in 2026? Let's discuss in the comments.\n\n#Leadership #EnterpriseTech #Innovation #RasAliLabs #Productivity`;
          result.linkedin = {
            platform: 'linkedin',
            body,
            hashtags: ['#Leadership', '#EnterpriseTech', '#Innovation', '#RasAliLabs'],
            tips: 'Structured thought-leadership formatting with bullet points and executive call-to-action.',
            charCount: body.length,
          };
          break;
        }

        case 'instagram': {
          const body = `✨ Behind the innovation at Ras Ali Labs.\n\n${cleanIdea}\n\n💬 Drop a comment below if you want early access!\n.\n.\n.\n#TechCommunity #AI #ModernTech #Productivity #Engineering #BuildInPublic #Software #Innovation`;
          result.instagram = {
            platform: 'instagram',
            body,
            hashtags: ['#TechCommunity', '#AI', '#ModernTech', '#Productivity', '#Engineering', '#BuildInPublic'],
            tips: 'Visual storytelling tone with hashtag blocks for discovery.',
            charCount: body.length,
          };
          break;
        }

        case 'facebook': {
          const body = `📢 Big updates from Ras Ali Labs!\n\n${cleanIdea}\n\n👉 Learn more and explore the full suite at rasalilabs.com. What feature would you like to see next?`;
          result.facebook = {
            platform: 'facebook',
            body,
            hashtags: ['#RasAliLabs', '#TechNews'],
            tips: 'Conversational community tone with direct web link invitation.',
            charCount: body.length,
          };
          break;
        }

        case 'tiktok': {
          const body = `🔥 You won't believe how we automated this in Ralion OS! ${cleanIdea.substring(0, 100)}... Full breakdown in the link in bio! #techtok #softwareengineer #aitools #techhacks`;
          result.tiktok = {
            platform: 'tiktok',
            body,
            hashtags: ['#techtok', '#softwareengineer', '#aitools', '#techhacks'],
            tips: 'High-energy hook script tailored for short-form video captions.',
            charCount: body.length,
          };
          break;
        }

        case 'whatsapp': {
          const body = `*Ras Ali Labs Enterprise Broadcast*\n\n${cleanIdea}\n\n_Reply directly to this message to speak with our technical team._`;
          result.whatsapp = {
            platform: 'whatsapp',
            body,
            hashtags: [],
            tips: 'Clean WhatsApp markdown (*bold*, _italic_) for direct broadcast messaging.',
            charCount: body.length,
          };
          break;
        }
      }
    }

    return result as Record<SocialPlatformType, AdaptedContent>;
  }
}
