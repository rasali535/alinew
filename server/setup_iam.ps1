# PowerShell Script to Set Up IAM Permissions for Cloud Run
# Usage: .\setup_iam.ps1 -ProjectId "your-project-id" -ServiceAccountEmail "service-account-email"

param (
    [string]$ProjectId,
    [string]$ServiceAccountEmail
)

# 1. Get Project ID if not provided
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    $ProjectId = gcloud config get-value project 2>$null
    if ([string]::IsNullOrWhiteSpace($ProjectId) -or $ProjectId -eq "(unset)") {
        $ProjectId = Read-Host "Please enter your Google Cloud Project ID"
    }
    else {
        Write-Host "Using current project: $ProjectId"
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    Write-Error "Project ID is required."
    exit 1
}

# 2. Get Service Account if not provided
if ([string]::IsNullOrWhiteSpace($ServiceAccountEmail)) {
    Write-Host "No Service Account provided."
    Write-Host "Attempting to find default Compute Engine Service Account..."
    
    $ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
    if ($ProjectNumber) {
        $DefaultSA = "$ProjectNumber-compute@developer.gserviceaccount.com"
        Write-Host "Default Compute Service Account: $DefaultSA"
        $UseDefault = Read-Host "Use this service account? (Y/n)"
        if ($UseDefault -eq "" -or $UseDefault -eq "Y" -or $UseDefault -eq "y") {
            $ServiceAccountEmail = $DefaultSA
        }
        else {
            $ServiceAccountEmail = Read-Host "Enter the Service Account Email to grant permissions to"
        }
    }
    else {
        $ServiceAccountEmail = Read-Host "Enter the Service Account Email to grant permissions to"
    }
}

if ([string]::IsNullOrWhiteSpace($ServiceAccountEmail)) {
    Write-Error "Service Account Email is required."
    exit 1
}

# 3. Grant Permissions
Write-Host "Granting roles to $ServiceAccountEmail in project $ProjectId..." -ForegroundColor Cyan

# Grant Vertex AI User
Write-Host "Granting roles/aiplatform.user..."
cmd /c "gcloud projects add-iam-policy-binding $ProjectId --member=`"serviceAccount:$ServiceAccountEmail`" --role=`"roles/aiplatform.user`""

# Grant Cloud SQL Client
Write-Host "Granting roles/cloudsql.client..."
cmd /c "gcloud projects add-iam-policy-binding $ProjectId --member=`"serviceAccount:$ServiceAccountEmail`" --role=`"roles/cloudsql.client`""

# Grant Secret Manager Secret Accessor (Optional but good)
Write-Host "Granting roles/secretmanager.secretAccessor..."
cmd /c "gcloud projects add-iam-policy-binding $ProjectId --member=`"serviceAccount:$ServiceAccountEmail`" --role=`"roles/secretmanager.secretAccessor`""

Write-Host "Done! Permissions granted." -ForegroundColor Green
