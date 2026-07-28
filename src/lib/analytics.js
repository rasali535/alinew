// Lightweight, Privacy-Focused Analytics Tracker for Ras Ali Labs Ecosystem
// Tracks product visits, signups, Ralion launches, downloads (download_events), conversions, and product_events.
import { supabase } from './supabase';

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

  // Track Download Events & log to Supabase download_events table
  async trackDownload(platform, version = '2.4.1', product = 'Ralion Desktop') {
    this.logEvent('download', { platform, version, product });

    try {
      // Log to Supabase download_events table
      const { error } = await supabase.from('download_events').insert([
        {
          product,
          version,
          platform,
          created_at: new Date().toISOString()
        }
      ]);
      if (error) {
        console.warn('download_events insert note (fallback active):', error.message);
      }
    } catch (err) {
      console.warn('Analytics DB log note:', err.message);
    }
  }

  trackConversion(type, metadata = {}) {
    this.logEvent('conversion', { type, ...metadata });
  }

  trackProductEvent(eventType, metadata = {}) {
    this.logEvent('product_event', { eventType, ...metadata });
  }
}

export const analytics = new AnalyticsTracker();
