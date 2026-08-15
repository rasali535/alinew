# RALION — Social Provider Capability Matrix

**Reference:** CAP-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Provider Capabilities Breakdown

| Capability | Facebook | Instagram | WhatsApp | TikTok | LinkedIn | X (Twitter) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **OAuth 2.0 Auth** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (PKCE) |
| **Text Post Publishing** | ✓ (Page/User) | ✗ (Requires Media) | ✗ (Messaging only) | ✗ (Video only) | ✓ (Member/Org) | ✓ (Max 280 chars) |
| **Image Attachment** | ✓ | ✓ (1:1 / 4:5) | ✓ | ✗ | ✓ | ✓ |
| **Video Attachment** | ✓ | ✓ (Reels/Feed) | ✓ | ✓ (Required) | ✓ | ✓ |
| **Scheduled Publishing**| ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **Analytics & Insights**| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Comments & Replies** | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **Direct Messaging** | ✓ (Messenger) | ✓ (IG Direct) | ✓ (Cloud API) | ✗ (Restricted) | ✗ (Partner Tier) | ✓ (DM v2) |
| **Organization / Pages**| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Webhooks Support** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 2. Platform-Specific Constraints

* **Facebook:** Supports text, photo, video posts to Facebook Pages and personal feeds. Requires `pages_manage_posts` for page publishing.
* **Instagram:** Requires an Instagram Business/Creator account connected to a Facebook Page. Media (image or video) is mandatory.
* **WhatsApp:** Does not support public feed publishing. Operates through Meta WhatsApp Cloud API for 1-to-1 customer conversations and broadcast templates.
* **TikTok:** Content posting API requires video files. Direct messaging is not available through general posting scopes.
* **LinkedIn:** Supports both personal member shares (`w_member_social`) and organization page updates (`w_organization_social`).
* **X (Twitter):** Character limit strictly enforced at 280 characters for standard tier.
