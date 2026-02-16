# IAM Optimization and Permissions Guide

## Overview

This document outlines the necessary Identity and Access Management (IAM) permissions for the Chatbot Backend service on Google Cloud Platform. Correctly configuring these permissions is crucial for the security and functionality of the application.

## Service Account

When you check your Cloud Run service ("chatbot-backend"), you will see a **Service Account** associated with it (usually the default Compute Engine service account, e.g., `NUMBER-compute@developer.gserviceaccount.com`, or a user-created one).

It is **highly recommended** to create a dedicated Service Account for this application to follow the Principle of Least Privilege.

### Creating a Dedicated Service Account

```bash
gcloud iam service-accounts create chatbot-sa \
    --display-name="Chatbot Backend Service Account"
```

## Required Roles

Grant the following roles to the Service Account used by Cloud Run.

### 1. Vertex AI User

Required to access Gemini models and other Vertex AI features.

* **Role:** `roles/aiplatform.user`
* **Command:**

    ```bash
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:chatbot-sa@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/aiplatform.user"
    ```

### 2. Cloud SQL Client

Required if your backend connects to a Cloud SQL instance (PostgreSQL).

* **Role:** `roles/cloudsql.client`
* **Command:**

    ```bash
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:chatbot-sa@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudsql.client"
    ```

### 3. Secret Manager Secret Accessor (Optional but Recommended)

If you store `DATABASE_URL` or API keys in Secret Manager.

* **Role:** `roles/secretmanager.secretAccessor`
* **Command:**

    ```bash
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:chatbot-sa@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor"
    ```

## Deploying with the Service Account

When deploying via `deploy.sh` or `gcloud run deploy`, specify the service account:

```bash
gcloud run deploy chatbot-backend \
    --service-account chatbot-sa@$PROJECT_ID.iam.gserviceaccount.com \
    ...
```

## Troubleshooting

* **Permission Denied (Vertex AI):** Ensure the `aiplatform.user` role is propagated. It allows prediction requests to the model.
* **Connection Error (Cloud SQL):** Ensure `cloudsql.client` is attached and the Cloud SQL Admin API is enabled. Also, check that the VPC connector is configured if using private IP, or the instance connection name is correct for public IP with Cloud SQL Auth Proxy (automatically handled by Cloud Run with the right config).
