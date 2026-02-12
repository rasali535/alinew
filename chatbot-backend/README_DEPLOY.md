# Deployment Guide

This guide explains how to deploy the Chatbot Backend to Google Cloud Run using the provided scripts.

## Prerequisites

1. **Google Cloud SDK**: Ensure `gcloud` is installed and authenticated.

    ```bash
    gcloud auth login
    gcloud config set project YOUR_PROJECT_ID
    ```

2. **Permissions**: Ensure your user account has permissions to Enable APIs, Build Images, and Deploy to Cloud Run.

## Option 1: One-Click Deployment Script ("deploy.sh")

This script automates the entire process: enabling APIs, creating the Artifact Registry repository, building the image, and deploying to Cloud Run.

### Usage (Git Bash / WSL / Linux / Mac)

Run the script from the terminal:

```bash
./deploy.sh
```

**What it does:**

* Checks if `gcloud` is installed and a project is selected.
* Enables required Google Cloud services (Run, Artifact Registry, etc.).
* Creates an Artifact Registry repository (`chatbot-repo`) if it doesn't exist.
* Builds the Docker image and pushes it to Artifact Registry.
* Deploys the service to Cloud Run with:
  * Memory: 512Mi
  * Authentication: Public (`--allow-unauthenticated`)
  * Environment Variables: `NODE_ENV`, `PROJECT_ID`, `LOCATION`, `DATABASE_URL`

## Option 2: Cloud Build ("cloudbuild.yaml")

If you prefer using Google Cloud Build directly or setting up a CI/CD trigger:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

Note: You may need to manually enable the required APIs first if using this method for the first time.

## IAM Setup

For production security, it is recommended to set up a dedicated Service Account. See [IAM_SETUP.md](IAM_SETUP.md) for details on creating a service account and granting the `Vertex AI User` and `Cloud SQL Client` roles.

## Troubleshooting

* **Database Connection:** If the app starts but fails to connect to the DB, ensure the `DATABASE_URL` environment variable is correct and the Cloud Run service account has the `Cloud SQL Client` role (if using Cloud SQL).
* **Gemini API:** If the chatbot doesn't respond, ensure the `Vertex AI API` is enabled and the service account has `Vertex AI User` role.
