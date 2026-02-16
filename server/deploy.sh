#!/bin/bash
set -e

# ==================================================================================
# Deployment Script for Chatbot Backend to Google Cloud Run
# ==================================================================================

# ----------------- Configuration -----------------
SERVICE_NAME="chatbot-backend"
REGION="us-central1"
REPO_NAME="chatbot-repo"
ARTIFACT_REGISTRY_DOMAIN="$REGION-docker.pkg.dev"

# Ensure Google Cloud SDK is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud SDK is not installed or not in PATH."
    exit 1
fi

# Get Project ID
PROJECT_ID=$(gcloud config get-value project)
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
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION &> /dev/null; then
    echo "Creating Artifact Registry repository '$REPO_NAME'..."
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for Chatbot Backend"
else
    echo "Artifact Registry repository '$REPO_NAME' exists."
fi

# ----------------- 3. Build and Push Image -----------------
IMAGE_TAG="$ARTIFACT_REGISTRY_DOMAIN/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest"

echo "Building and pushing image to $IMAGE_TAG..."
gcloud builds submit --tag $IMAGE_TAG .

# ----------------- 4. Deploy to Cloud Run -----------------
echo "Deploying to Cloud Run..."

# Prompts for environment variables if not set in environment
if [ -z "$DATABASE_URL" ]; then
    read -p "Enter DATABASE_URL (or press Enter to skip if using Secret Manager): " DATABASE_URL
fi

ENV_VARS="NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,VERTEX_AI_LOCATION=$REGION,RUN_MIGRATIONS=true"
if [ -n "$DATABASE_URL" ]; then
    ENV_VARS="$ENV_VARS,DATABASE_URL=$DATABASE_URL"
fi

gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --set-env-vars "$ENV_VARS" \
    --port 8080

echo "========================================================"
echo "Deployment Complete!"
echo "Service URL:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
echo "========================================================"
