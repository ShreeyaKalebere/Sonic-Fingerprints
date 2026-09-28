# PowerShell / cURL Test Script for Mode 1: Room Recognition
# Usage: ./test_room_curl.ps1

$BASE_URL = "http://localhost:5001"
$EMAIL = "curl_tester_$(Get-Random)@example.com"
$PASSWORD = "SecurePass123!"

Write-Host "1. Registering user ($EMAIL)..." -ForegroundColor Cyan
$regRes = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -Body (@{ email=$EMAIL; password=$PASSWORD } | ConvertTo-Json) -ContentType "application/json"
$TOKEN = $regRes.token
Write-Host "   Token received: $($TOKEN.Substring(0, 20))..." -ForegroundColor Green

Write-Host "`n2. Registering Room 1 (Office)..." -ForegroundColor Cyan
$r1 = curl.exe -s -X POST "$BASE_URL/room/register" `
  -H "Authorization: Bearer $TOKEN" `
  -F "room_name=Executive Boardroom" `
  -F "file=@test_assets/office_sample.wav" | ConvertFrom-Json
Write-Host "   Registered Room 1 ID: $($r1.room_id)" -ForegroundColor Green

Write-Host "`n3. Registering Room 2 (Kitchen)..." -ForegroundColor Cyan
$r2 = curl.exe -s -X POST "$BASE_URL/room/register" `
  -H "Authorization: Bearer $TOKEN" `
  -F "room_name=Espresso Kitchen" `
  -F "file=@test_assets/kitchen_sample.wav" | ConvertFrom-Json
Write-Host "   Registered Room 2 ID: $($r2.room_id)" -ForegroundColor Green

Write-Host "`n4. Classifying audio clip..." -ForegroundColor Cyan
$cls = curl.exe -s -X POST "$BASE_URL/room/classify" `
  -H "Authorization: Bearer $TOKEN" `
  -F "file=@test_assets/street_sample.wav" | ConvertFrom-Json
Write-Host "   Top Label: $($cls.top_label)" -ForegroundColor Green

Write-Host "`n5. Matching audio clip against registered rooms..." -ForegroundColor Cyan
$match = curl.exe -s -X POST "$BASE_URL/room/match" `
  -H "Authorization: Bearer $TOKEN" `
  -F "file=@test_assets/office_query.wav" | ConvertFrom-Json
Write-Host "   Matched: $($match.matched)" -ForegroundColor Green
Write-Host "   Room: $($match.room_name)" -ForegroundColor Green
Write-Host "   Similarity: $($match.similarity)" -ForegroundColor Green
