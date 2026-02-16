# Dockerization and Cloud Run Deployment Script

param (
    [string]$ProjectID = "gen-lang-client-0940432200", # Set default Project ID

    [string]$Region = "us-central1",
    [string]$ServiceName = "chatbot-backend",
    [string]$DB_URL = "", # Optional: Pass DB URL as argument or rely on env
    [string]$GEMINI_API_KEY = "" # Optional: Pass API key if using it
)

Write-Host "Starting Deployment Process..." -ForegroundColor Green

# 1. Enable Required Google Cloud APIs
Write-Host "Enabling Google Cloud APIs..."
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 2. Build Docker Image locally or with Cloud Build (using Cloud Build here for minimal local deps)
Write-Host "Submitting build to Cloud Build..."
gcloud builds submit --tag gcr.io/$ProjectID/$ServiceName

# 3. Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..."
# Use --set-env-vars to pass runtime config
$envVars = "NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$ProjectID,VERTEX_AI_LOCATION=$Region"

if ($DB_URL) {
    $envVars += ",DATABASE_URL=$DB_URL"
}

if ($GEMINI_API_KEY) {
    $envVars += ",API_KEY=$GEMINI_API_KEY"
}

# Deploy command
gcloud run deploy $ServiceName `
    --image gcr.io/$ProjectID/$ServiceName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars $envVars `
    --max-instances 10 `
    --min-instances 0

Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Service URL available via: gcloud run services list"
