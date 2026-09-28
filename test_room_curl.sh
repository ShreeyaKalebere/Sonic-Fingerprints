#!/usr/bin/env bash
# cURL Test Script for Mode 1: Room Recognition
# Base URL: http://localhost:5001

BASE_URL="http://localhost:5001"
EMAIL="curl_user_$RANDOM@example.com"
PASSWORD="SecurePassword123!"

echo "=================================================="
echo "1. Registering user ($EMAIL)..."
echo "=================================================="
REGISTER_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$REGISTER_RES"
TOKEN=$(echo "$REGISTER_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n=================================================="
echo "2. Registering Room 1 ('Main Office')..."
echo "=================================================="
curl -s -X POST "$BASE_URL/room/register" \
  -H "Authorization: Bearer $TOKEN" \
  -F "room_name=Main Office" \
  -F "file=@test_assets/office_sample.wav"

echo -e "\n\n=================================================="
echo "3. Registering Room 2 ('Coffee Kitchen')..."
echo "=================================================="
curl -s -X POST "$BASE_URL/room/register" \
  -H "Authorization: Bearer $TOKEN" \
  -F "room_name=Coffee Kitchen" \
  -F "file=@test_assets/kitchen_sample.wav"

echo -e "\n\n=================================================="
echo "4. Classifying audio clip..."
echo "=================================================="
curl -s -X POST "$BASE_URL/room/classify" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_assets/street_sample.wav"

echo -e "\n\n=================================================="
echo "5. Matching query clip against rooms..."
echo "=================================================="
curl -s -X POST "$BASE_URL/room/match" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_assets/office_query.wav"

echo -e "\n\n=================================================="
echo "6. Listing user rooms..."
echo "=================================================="
curl -s -X GET "$BASE_URL/room/list" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nDone!"
