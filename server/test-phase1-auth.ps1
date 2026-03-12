# Phase 1 Authentication Test Script
# Quick PowerShell script to test login and protected endpoints

Write-Host "`n=== Phase 1 Authentication Test ===" -ForegroundColor Cyan
Write-Host "Testing login endpoint...`n" -ForegroundColor Yellow

# Test 1: Login
$loginBody = @{
    email = 'manoj@colorwhistle.com'
    password = 'cwopentool-adc*prod'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:5000/auth/login' `
        -Method POST `
        -Body $loginBody `
        -ContentType 'application/json'
    
    Write-Host "✅ TEST 1 PASSED: Login successful" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.data.user.name)" -ForegroundColor Gray
    Write-Host "   Email: $($loginResponse.data.user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($loginResponse.data.user.role)" -ForegroundColor Gray
    Write-Host "   Token: $($loginResponse.data.token.Substring(0, 30))...`n" -ForegroundColor Gray
    
    $token = $loginResponse.data.token
    
    # Test 2: Protected endpoint with valid token
    Write-Host "Testing protected endpoint with valid token..." -ForegroundColor Yellow
    
    $meResponse = Invoke-RestMethod -Uri 'http://localhost:5000/users/me' `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}
    
    Write-Host "✅ TEST 2 PASSED: Protected endpoint accessible with valid token" -ForegroundColor Green
    Write-Host "   Profile retrieved: $($meResponse.data.name)`n" -ForegroundColor Gray
    
    # Test 3: Protected endpoint without token
    Write-Host "Testing protected endpoint without token..." -ForegroundColor Yellow
    
    try {
        Invoke-RestMethod -Uri 'http://localhost:5000/users/me' -Method GET
        Write-Host "❌ TEST 3 FAILED: Should have returned 401" -ForegroundColor Red
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ TEST 3 PASSED: Correctly returned 401 Unauthorized`n" -ForegroundColor Green
        } else {
            Write-Host "❌ TEST 3 FAILED: Wrong status code" -ForegroundColor Red
        }
    }
    
    # Test 4: Invalid credentials
    Write-Host "Testing login with invalid credentials..." -ForegroundColor Yellow
    
    $invalidBody = @{
        email = 'manoj@colorwhistle.com'
        password = 'wrongpassword'
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri 'http://localhost:5000/auth/login' `
            -Method POST `
            -Body $invalidBody `
            -ContentType 'application/json'
        Write-Host "❌ TEST 4 FAILED: Should have returned 401" -ForegroundColor Red
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ TEST 4 PASSED: Correctly returned 401 for invalid credentials`n" -ForegroundColor Green
        } else {
            Write-Host "❌ TEST 4 FAILED: Wrong status code" -ForegroundColor Red
        }
    }
    
    Write-Host "`n=== All Tests Completed ===" -ForegroundColor Cyan
    Write-Host "✅ Phase 1 Authentication is working correctly!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error Code: $($errorDetails.error.code)" -ForegroundColor Red
        Write-Host "Error Message: $($errorDetails.error.message)" -ForegroundColor Red
    }
}
