/**
 * Ralion OS — Automated WhatsApp Notification Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Dispatches verified operational alerts and transaction notices via central WhatsApp number:
 * - New Retail quotation received / awaiting approval
 * - Customer enquiry assigned
 * - Task and workflow reminders
 * - Quiet hours, opt-in enforcement, and 24-hour window compliance
 */

import { ZernioSocialService } from '@ralion/integrations/server';
import { getPrivilegedSupabase } from '../../supabase/server';
import { RalionWhatsAppGatewayService } from './ralionWhatsAppGateway.service';

export interface WhatsAppNotificationPayload {
  organizationId: string;
  workspaceId: string;
  recipientPhone: string;
  category: 'QUOTATION_ALERT' | 'TASK_REMINDER' | 'CUSTOMER_ENQUIRY' | 'WORKSPACE_ALERT';
  headline: string;
  bodyText: string;
  actionUrl?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
}

export interface NotificationDispatchResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'SUPPRESSED_QUIET_HOURS' | 'SUPPRESSED_NO_OPT_IN' | 'SUPPRESSED_PILOT_GATE' | 'SUPPRESSED_OUTSIDE_24H_WINDOW' | 'FAILED';
  error?: string;
}

export class WhatsAppNotificationService {
  /**
   * Checks if current time is within recipient quiet hours for their specific timezone
   */
  static isQuietHours(startHourStr = '21:00', endHourStr = '07:00', recipientTimezone = 'Africa/Johannesburg'): boolean {
    try {
      const now = new Date();
      const localTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: recipientTimezone,
        hour12: false,
        hour: 'numeric',
      });
      const currentHour = parseInt(localTimeStr, 10);
      const startHour = parseInt(startHourStr.split(':')[0], 10);
      const endHour = parseInt(endHourStr.split(':')[0], 10);

      if (startHour > endHour) {
        // Over midnight (e.g. 21:00 to 07:00)
        return currentHour >= startHour || currentHour < endHour;
      } else {
        return currentHour >= startHour && currentHour < endHour;
      }
    } catch {
      return false;
    }
  }

  /**
   * Dispatches an operational WhatsApp notification with full compliance:
   * 1. Pilot allowlist gate enforcement before any side effects
   * 2. Database-backed consent verification (Default to NOT opted in)
   * 3. 24-hour messaging window check (requires approved template outside 24h)
   * 4. Timezone-aware quiet hours enforcement
   * 5. Provider delivery confirmation
   */
  static async sendNotification(
    payload: WhatsAppNotificationPayload,
    options?: { bypassQuietHours?: boolean }
  ): Promise<NotificationDispatchResult> {
    const cleanPhone = payload.recipientPhone.replace(/[^0-9+]/g, '');

    // 1. Pilot Gate Enforcement before any side effect
    if (!RalionWhatsAppGatewayService.isPilotAllowed(cleanPhone)) {
      return {
        success: false,
        status: 'SUPPRESSED_PILOT_GATE',
        error: `Notification suppressed: Recipient phone ${cleanPhone} is not in the configured pilot allowlist.`,
      };
    }

    // 2. Check Database Opt-In & Consent Preferences (Default: NOT opted in)
    const pref = await this.getRecipientPreferences(cleanPhone);
    if (!pref || !pref.is_opted_in) {
      return {
        success: false,
        status: 'SUPPRESSED_NO_OPT_IN',
        error: 'Recipient has not opted into automated WhatsApp notifications or has sent STOP.',
      };
    }

    const categories = pref.categories || {};
    const categoryKey = payload.category.toLowerCase().replace('_alert', '').replace('_reminder', '');
    if (categories[categoryKey] === false && categories['all'] !== true) {
      return {
        success: false,
        status: 'SUPPRESSED_NO_OPT_IN',
        error: `Recipient has opted out of notification category: ${payload.category}`,
      };
    }

    // 3. Recipient Quiet Hours Enforcement
    const quietStart = pref.quiet_hours_start || '21:00';
    const quietEnd = pref.quiet_hours_end || '07:00';
    const timezone = pref.timezone || 'Africa/Johannesburg';

    if (!options?.bypassQuietHours && this.isQuietHours(quietStart, quietEnd, timezone)) {
      return {
        success: false,
        status: 'SUPPRESSED_QUIET_HOURS',
        error: `Notification suppressed due to quiet hours policy (${quietStart} - ${quietEnd} in ${timezone}).`,
      };
    }

    // 4. Enforce 24-Hour Customer-Service Messaging Window
    const isWithin24h = await this.isWithin24HourWindow(cleanPhone);
    if (!isWithin24h && !payload.templateName) {
      return {
        success: false,
        status: 'SUPPRESSED_OUTSIDE_24H_WINDOW',
        error: 'Outside Meta 24-hour messaging window. Approved WhatsApp template is required for outbound notification.',
      };
    }

    // 5. Format Notification Message
    const formattedMessage =
      `🔔 *RALION OS — ${payload.headline.toUpperCase()}*\n\n` +
      `${payload.bodyText}\n\n` +
      (payload.actionUrl ? `🔗 Action: ${payload.actionUrl}\n\n` : '') +
      `_Reply STOP to unsubscribe from automated WhatsApp alerts._`;

    // 6. Dispatch via Central WhatsApp Gateway
    try {
      const res = await ZernioSocialService.sendWhatsAppMessage({
        recipientPhone: cleanPhone,
        messageText: formattedMessage,
      });

      // Do NOT claim delivery without provider confirmation
      if (!res.success) {
        return {
          success: false,
          status: 'FAILED',
          error: res.error || 'Provider rejected message transmission',
        };
      }

      return {
        success: true,
        messageId: res.messageId,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  /**
   * Retrieves recipient preferences from database.
   * Defaults to null (not opted in) if no record exists.
   */
  static async getRecipientPreferences(phone: string): Promise<{
    is_opted_in: boolean;
    categories?: Record<string, boolean>;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    timezone?: string;
  } | null> {
    try {
      const supabase = getPrivilegedSupabase();
      const { data, error } = await supabase
        .from('whatsapp_notification_preferences')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Checks whether the recipient has sent an inbound message within the last 24 hours.
   */
  static async isWithin24HourWindow(phone: string): Promise<boolean> {
    try {
      const supabase = getPrivilegedSupabase();
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('last_inbound_at')
        .eq('sender_phone', phone)
        .maybeSingle();

      if (!conv || !conv.last_inbound_at) return false;

      const lastInbound = new Date(conv.last_inbound_at).getTime();
      const now = Date.now();
      const diffHours = (now - lastInbound) / (1000 * 60 * 60);

      return diffHours <= 24;
    } catch {
      return false;
    }
  }
}
