$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
$supabaseUrl = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { $env:NEXT_PUBLIC_SUPABASE_URL }

if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    throw "SUPABASE_URL is not configured."
}

if ([string]::IsNullOrWhiteSpace($serviceKey)) {
    throw "SUPABASE_SERVICE_ROLE_KEY is not configured."
}

$sqlPath = Join-Path $PSScriptRoot "..\packages\database\supabase_schema.sql"
$sql = Get-Content $sqlPath -Raw

Write-Host "Loaded schema: $($sql.Length) bytes"

$headers = @{
    "apikey"                = $serviceKey
    "Authorization"         = "Bearer $serviceKey"
    "Content-Type"          = "application/json"
    "Prefer"                = "return=representation"
}

# Use the pg query endpoint on the database API.
$queryUri = "$supabaseUrl/pg/query"
$bodyJson = (@{ query = $sql } | ConvertTo-Json -Depth 5 -Compress)

Write-Host "Trying Supabase pg/query endpoint ..."
try {
    $resp = Invoke-RestMethod -Uri $queryUri -Method POST -Headers $headers -Body $bodyJson -TimeoutSec 30
    Write-Host "SUCCESS:" ($resp | ConvertTo-Json -Depth 5)
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Write-Host "pg/query failed ($code): $body"

    # Fallback: try /sql endpoint without logging credentials or authenticated URLs.
    $sqlUri = "$supabaseUrl/sql"
    Write-Host "Trying Supabase sql endpoint ..."
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
        Write-Host "Run packages\database\supabase_schema.sql manually in the Supabase SQL Editor."
    }
}
