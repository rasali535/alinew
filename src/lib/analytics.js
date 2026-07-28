// Lightweight, Privacy-Focused Analytics Tracker for Ras Ali Labs Ecosystem
// Tracks product visits, signups, Ralion launches, downloads, conversions, and product_events.

class AnalyticsTracker {
  constructor() {
    this.events = [];
    this.debug = false;
  }

  logEvent(eventName, eventData = {}) {
    const payload = {
      event: eventName,
      data: eventData,
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      timestamp: new Date().toISOString()
    };

    this.events.push(payload);

    if (this.debug) {
      console.log('[Ras Ali Analytics]', payload);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rasali_analytics', { detail: payload }));
    }
  }

  trackPageView(pageName) {
    this.logEvent('page_view', { page: pageName || (typeof window !== 'undefined' ? window.location.pathname : '/') });
  }

  trackProductVisit(productSlug) {
    this.logEvent('product_visit', { product: productSlug });
  }

  trackSignup(method = 'sso') {
    this.logEvent('signup', { method });
  }

  trackRalionLaunch(subRoute = 'dashboard') {
    this.logEvent('ralion_launch', { subRoute });
  }

  trackDownload(platform, assetName) {
    this.logEvent('download', { platform, asset: assetName });
  }

  trackConversion(type, metadata = {}) {
    this.logEvent('conversion', { type, ...metadata });
  }

  // Product Events Tracking
  trackProductEvent(eventType, metadata = {}) {
    // Examples: user_created_customer, user_created_project, user_used_mari_ai, user_invited_team, user_upgraded_plan
    this.logEvent('product_event', { eventType, ...metadata });
  }
}

export const analytics = new AnalyticsTracker();
