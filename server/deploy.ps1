# Dockerization and Cloud Run Deployment Script

param (
    [string]$ProjectID = "gen-lang-client-0940432200",
    [string]$Region = "us-central1",
    [string]$ServiceName = "chatbot-backend",
    [string]$DatabaseSecretName = "chatbot-database-url"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Deployment Process..." -ForegroundColor Green

# 1. Enable Required Google Cloud APIs
Write-Host "Enabling Google Cloud APIs..."
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Require database credentials to come from Secret Manager. Never pass a raw
# database URL or API key as a script parameter or --set-env-vars value.
gcloud secrets describe $DatabaseSecretName --project $ProjectID *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Secret Manager secret '$DatabaseSecretName' does not exist. Create it securely before deployment."
}

# 2. Build Docker Image with Cloud Build
Write-Host "Submitting build to Cloud Build..."
gcloud builds submit --tag "gcr.io/$ProjectID/$ServiceName"

# 3. Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..."
$envVars = "NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$ProjectID,VERTEX_AI_LOCATION=$Region"
$secretBinding = "DATABASE_URL=$DatabaseSecretName`:latest"

gcloud run deploy $ServiceName `
    --image "gcr.io/$ProjectID/$ServiceName" `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars $envVars `
    --set-secrets $secretBinding `
    --max-instances 10 `
    --min-instances 0

Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Service URL available via: gcloud run services list"
