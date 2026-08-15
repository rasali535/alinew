# RALION — Detailed Provider Capabilities & API Reference

**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Facebook (Meta Graph API v19.0+)
* **Default Scopes:** `public_profile`, `email`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_metadata`
* **Account Types:** Personal User, Facebook Business Page
* **Publishing Endpoints:** `POST /{page-id}/feed`, `POST /{page-id}/photos`, `POST /{page-id}/videos`
* **Analytics Metrics:** `page_impressions`, `page_engaged_users`, `page_fans`, `post_reactions_by_type_total`

## 2. Instagram (Meta Graph API)
* **Default Scopes:** `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `instagram_manage_comments`, `instagram_manage_messages`
* **Account Types:** Instagram Professional (Business / Creator)
* **Publishing Protocol:** Two-step media container initialization (`POST /{ig-user-id}/media`) followed by publication (`POST /{ig-user-id}/media_publish`).
* **Analytics Metrics:** `impressions`, `reach`, `profile_views`, `video_views`

## 3. WhatsApp Business (Meta Cloud API)
* **Default Scopes:** `whatsapp_business_management`, `whatsapp_business_messaging`
* **Messaging Endpoint:** `POST /{phone-number-id}/messages`
* **Message Types Supported:** Text, Interactive Buttons, List Pickers, Template Messages, Media attachments (PDF, Images, Audio).

## 4. TikTok (TikTok Content Posting API v2)
* **Default Scopes:** `user.info.basic`, `user.info.stats`, `video.list`, `video.upload`, `video.publish`
* **Publishing Endpoint:** `POST /v2/post/publish/video/init/`
* **Constraints:** Must provide direct MP4/MOV video URL. Minimum duration: 3 seconds; maximum duration: 10 minutes.

## 5. LinkedIn (REST API v2)
* **Default Scopes:** `openid`, `profile`, `email`, `w_member_social`, `r_organization_social`, `w_organization_social`, `rw_organization_admin`
* **Publishing Endpoint:** `POST /v2/ugcPosts`
* **Capabilities:** Personal Member UGC Posts, Organization Page UGC Posts, Article / Link Embeds, Image & Video Attachments.

## 6. X / Twitter (X API v2)
* **Default Scopes:** `tweet.read`, `tweet.write`, `users.read`, `offline.access`, `dm.read`, `dm.write`
* **Publishing Endpoint:** `POST /2/tweets`
* **Direct Messages Endpoint:** `POST /2/dm_conversations/with/:participant_id/messages`
