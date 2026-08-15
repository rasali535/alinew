# RALION — Social Connections Troubleshooting & Error Guide

**Reference:** TS-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Common Issues & Safe User Guidance

### 1.1 "Token expired / Reconnection required"
* **Cause:** Social platform OAuth token expired or user changed their account password.
* **Resolution:** In Social Hub, click **"Reconnect"** next to the platform to refresh OAuth scopes and regenerate tokens.

### 1.2 "Content exceeds character limit"
* **Cause:** Attempting to publish more than 280 characters to X or more than 2,200 characters to Instagram/TikTok.
* **Resolution:** Use Ralion Social AI ("Repurpose Content") to generate a platform-tailored shorter version.

### 1.3 "Instagram publishing requires media"
* **Cause:** Instagram Graph API only accepts posts containing an image or video.
* **Resolution:** Attach an image (1:1 or 4:5 aspect ratio) or video reel (9:16).

### 1.4 "TikTok publishing requires video"
* **Cause:** TikTok Content Posting API only accepts MP4/MOV video files.
* **Resolution:** Upload an MP4 video file (minimum duration 3 seconds).
