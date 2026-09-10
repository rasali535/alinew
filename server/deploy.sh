#!/bin/bash
set -euo pipefail

# ==================================================================================
# Deployment Script for Chatbot Backend to Google Cloud Run
# ==================================================================================

# ----------------- Configuration -----------------
SERVICE_NAME="chatbot-backend"
REGION="us-central1"
REPO_NAME="chatbot-repo"
ARTIFACT_REGISTRY_DOMAIN="$REGION-docker.pkg.dev"
DATABASE_SECRET_NAME="${DATABASE_SECRET_NAME:-chatbot-database-url}"

# Ensure Google Cloud SDK is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud SDK is not installed or not in PATH."
    exit 1
fi

# Get Project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "Error: No active Google Cloud project found. Run 'gcloud config set project [PROJECT_ID]'."
    exit 1
fi

echo "Deploying to Project: $PROJECT_ID"
echo "Region: $REGION"

# ----------------- 1. Enable Required Services -----------------
echo "Enabling required services..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com

# ----------------- 2. Ensure Artifact Registry Repo Exists -----------------
echo "Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &> /dev/null; then
    echo "Creating Artifact Registry repository '$REPO_NAME'..."
    gcloud artifacts repositories create "$REPO_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Docker repository for Chatbot Backend"
else
    echo "Artifact Registry repository '$REPO_NAME' exists."
fi

# Require database credentials to come from Secret Manager, never from prompts,
# shell arguments, command history, or a plaintext --set-env-vars value.
if ! gcloud secrets describe "$DATABASE_SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo "Error: Secret Manager secret '$DATABASE_SECRET_NAME' does not exist."
    echo "Create it securely before deployment and grant the Cloud Run service account secret access."
    exit 1
fi

# ----------------- 3. Build and Push Image -----------------
IMAGE_TAG="$ARTIFACT_REGISTRY_DOMAIN/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest"

echo "Building and pushing image to $IMAGE_TAG..."
gcloud builds submit --tag "$IMAGE_TAG" .

# ----------------- 4. Deploy to Cloud Run -----------------
echo "Deploying to Cloud Run..."

gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --memory 512Mi \
    --set-env-vars "NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,VERTEX_AI_LOCATION=$REGION,RUN_MIGRATIONS=true" \
    --set-secrets "DATABASE_URL=$DATABASE_SECRET_NAME:latest" \
    --port 8080

echo "========================================================"
echo "Deployment Complete!"
echo "Service URL:"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)'
echo "========================================================"
