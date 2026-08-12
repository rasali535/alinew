$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA"
$supabaseUrl = "https://yidsfihagwttlmhfynmf.supabase.co"
$sqlPath = Join-Path $PSScriptRoot "..\packages\database\supabase_schema.sql"
$sql = Get-Content $sqlPath -Raw

Write-Host "Loaded schema: $($sql.Length) bytes"

$headers = @{
    "apikey"                = $serviceKey
    "Authorization"         = "Bearer $serviceKey"
    "Content-Type"          = "application/json"
    "Prefer"                = "return=representation"
}

# Use the pg query endpoint on the database API
$queryUri = "$supabaseUrl/pg/query"

$bodyJson = (@{ query = $sql } | ConvertTo-Json -Depth 5 -Compress)

Write-Host "Trying $queryUri ..."
try {
    $resp = Invoke-RestMethod -Uri $queryUri -Method POST -Headers $headers -Body $bodyJson -TimeoutSec 30
    Write-Host "SUCCESS:" ($resp | ConvertTo-Json -Depth 5)
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Write-Host "pg/query failed ($code): $body"
    
    # Fallback: try /sql endpoint
    $sqlUri = "$supabaseUrl/sql"
    Write-Host "Trying $sqlUri ..."
    try {
        $resp2 = Invoke-RestMethod -Uri $sqlUri -Method POST -Headers $headers -Body $bodyJson -TimeoutSec 30
        Write-Host "SUCCESS via /sql:" ($resp2 | ConvertTo-Json -Depth 5)
    } catch {
        $code2 = $_.Exception.Response.StatusCode.value__
        $body2 = $_.ErrorDetails.Message
        Write-Host "sql endpoint failed ($code2): $body2"
        Write-Host ""
        Write-Host "=== MANUAL STEPS REQUIRED ==="
        Write-Host "The Supabase service role key cannot execute DDL via REST."
        Write-Host "Please run the schema manually in the Supabase SQL Editor:"
        Write-Host "1. Go to https://supabase.com/dashboard/project/yidsfihagwttlmhfynmf/editor"
        Write-Host "2. Paste the contents of: packages\database\supabase_schema.sql"
        Write-Host "3. Click Run"
    }
}
