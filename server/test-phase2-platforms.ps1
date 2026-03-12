# Phase 2 Platform Integration Test
# Script to verify platform discovery and connection status

$API_URL = "http://localhost:5000/api"

Write-Host "`n=== Phase 2 Platform Integration Test ===" -ForegroundColor Cyan

# 1. Login to get token
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = 'manoj@colorwhistle.com'
    password = 'cwopentool-adc*prod'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    $headers = @{ Authorization = "Bearer $token" }

    # 2. Test Google Connect URL
    Write-Host "Testing Google Connect URL generation..." -ForegroundColor Yellow
    $googleConnect = Invoke-RestMethod -Uri "$API_URL/platforms/google/connect" -Method GET -Headers $headers
    if ($googleConnect.data.url -match "google.com") {
        Write-Host "✅ Google Connect URL generated successfully." -ForegroundColor Green
    }

    # 3. Test Meta Connect URL
    Write-Host "Testing Meta Connect URL generation..." -ForegroundColor Yellow
    $metaConnect = Invoke-RestMethod -Uri "$API_URL/platforms/meta/connect" -Method GET -Headers $headers
    if ($metaConnect.data.url -match "facebook.com") {
        Write-Host "✅ Meta Connect URL generated successfully." -ForegroundColor Green
    }

    # 4. Test Discovered Accounts (expect empty initially)
    Write-Host "Checking discovered accounts list..." -ForegroundColor Yellow
    $accounts = Invoke-RestMethod -Uri "$API_URL/platforms/accounts" -Method GET -Headers $headers
    Write-Host "✅ Accounts retrieved. Count: $($accounts.data.Count)" -ForegroundColor Green

    Write-Host "`n=== API Layer Verification Complete ===" -ForegroundColor Cyan
    Write-Host "Note: Interactive OAuth callback must be tested via Browser UI." -ForegroundColor Gray

} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
}
