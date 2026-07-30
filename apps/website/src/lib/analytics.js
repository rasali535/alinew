// Lightweight, Privacy-Focused Analytics & Supabase Download Tracking Engine
import { supabase } from './supabase';

const getAnonymousSessionId = () => {
  if (typeof window === 'undefined') return 'server_session';
  let sessionId = localStorage.getItem('ralion_anonymous_session_id');
  if (!sessionId) {
    sessionId = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('ralion_anonymous_session_id', sessionId);
  }
  return sessionId;
};

class AnalyticsTracker {
  constructor() {
    this.events = [];
    this.debug = false;
  }

  async logEvent(eventName, eventData = {}) {
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

  // Phase 3 — Download Tracking into Supabase 'downloads' table
  async trackDownload(platform, version = '2.4.2', product = 'Ralion', releaseId = null) {
    const anonymousSessionId = getAnonymousSessionId();
    this.logEvent('download', { platform, version, product, anonymousSessionId });

    // Temporary: Disabled Supabase tracking while files are hosted on Hostinger
    console.log('[Analytics] Download tracked locally. Supabase tracking disabled.');
  }

  trackConversion(type, metadata = {}) {
    this.logEvent('conversion', { type, ...metadata });
  }

  trackProductEvent(eventType, metadata = {}) {
    this.logEvent('product_event', { eventType, ...metadata });
  }
}

export const analytics = new AnalyticsTracker();
