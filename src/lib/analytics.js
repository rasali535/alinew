// Lightweight, Privacy-Focused Analytics Tracker for Ras Ali Labs Ecosystem
// Tracks product visits, signups, Ralion launches, downloads, and conversions.

class AnalyticsTracker {
  constructor() {
    this.events = [];
    this.debug = false;
  }

  logEvent(eventName, eventData = {}) {
    const payload = {
      event: eventName,
      data: eventData,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    };

    this.events.push(payload);

    if (this.debug) {
      console.log('[Ras Ali Analytics]', payload);
    }

    // Dispatch custom DOM event for listening components or telemetry integrations
    window.dispatchEvent(new CustomEvent('rasali_analytics', { detail: payload }));
  }

  trackPageView(pageName) {
    this.logEvent('page_view', { page: pageName || window.location.pathname });
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
}

export const analytics = new AnalyticsTracker();
