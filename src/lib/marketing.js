// Marketing Automation & Customer Lifecycle System for Ras Ali Labs
import { analytics } from './analytics';

class MarketingAutomation {
  constructor() {
    this.sequences = [];
  }

  // Trigger lifecycle email / in-app onboarding sequence when new signup occurs
  triggerSignupLifecycle(userEmail, orgName) {
    const signupEvent = {
      event: 'new_signup',
      email: userEmail,
      orgName: orgName || 'Default Organization',
      timestamp: new Date().toISOString(),
      messages: [
        {
          stage: 'Immediate',
          subject: 'Welcome to Ras Ali Labs — Empowered to Prosper',
          content: `Hi there,\n\nWelcome to Ras Ali Labs! Your account for ${orgName || 'your organization'} is active. Launch Ralion OS anytime at https://rasalilabs.com/ralion/dashboard.\n\nBest,\nRas Ali Labs Team`
        },
        {
          stage: 'Day 3 Tutorial',
          subject: 'Day 3 Guide: Master CRM & Projects in Ralion',
          content: `Learn how to add contacts, set up deal pipelines, and query Mari AI in under 5 minutes.\nRead docs: https://rasalilabs.com/docs`
        },
        {
          stage: 'Day 7 Feature Guide',
          subject: 'Day 7 Guide: Automate Business Workflows & USSD Sync',
          content: `Discover custom industry modules for Logistics, Health, Trade, and Growth.\nExplore solutions: https://rasalilabs.com/solutions`
        },
        {
          stage: 'Upgrade Recommendation',
          subject: 'Unlock Unlimited Mari AI Executions & Team Seats',
          content: `Upgrade to Ralion Professional for 24/7 priority support and custom API access.\nView plans: https://rasalilabs.com/pricing`
        }
      ]
    };

    this.sequences.push(signupEvent);
    analytics.logEvent('marketing_lifecycle_triggered', { email: userEmail, stage: 'welcome' });
    return signupEvent;
  }
}

export const marketing = new MarketingAutomation();
