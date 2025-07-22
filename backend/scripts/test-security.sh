#!/bin/bash

# Script de test de sécurité via curl
echo "🔒 Test de sécurité des validations via API"
echo "==========================================="

API_URL="https://localhost:8000"

# Test 1: Email trop long
echo -e "\n📧 Test 1: Email de 10,000 caractères"
LONG_EMAIL=$(python3 -c "print('a'*10000)")
curl -k -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${LONG_EMAIL}@test.com\",\"password\":\"test\"}" \
  -w "\nStatus Code: %{http_code}\n" \
  2>/dev/null

# Test 2: Username trop long
echo -e "\n👤 Test 2: Username de 1,000 caractères"
LONG_USERNAME=$(python3 -c "print('a'*1000)")
curl -k -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${LONG_USERNAME}\",\"email\":\"test@test.com\",\"password\":\"test123\",\"data_consent\":true}" \
  -w "\nStatus Code: %{http_code}\n" \
  2>/dev/null

# Test 3: Payload extrêmement volumineux (test DoS)
echo -e "\n💣 Test 3: Payload de 5MB (test DoS)"
HUGE_DATA=$(python3 -c "print('x'*5000000)")
curl -k -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test\",\"email\":\"test@test.com\",\"password\":\"${HUGE_DATA}\",\"data_consent\":true}" \
  -w "\nStatus Code: %{http_code}\n" \
  --max-time 10 \
  2>/dev/null

# Test 4: Tournament description trop longue
echo -e "\n🏆 Test 4: Description de tournoi de 10,000 caractères"
LONG_DESC=$(python3 -c "print('x'*10000)")
curl -k -X POST "$API_URL/api/tournaments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake_token" \
  -d "{\"name\":\"Test Tournament\",\"description\":\"${LONG_DESC}\"}" \
  -w "\nStatus Code: %{http_code}\n" \
  2>/dev/null

echo -e "\n✅ Tests de sécurité terminés"
echo "Expected results:"
echo "- Tous les tests doivent retourner 400 ou 413 (erreur client)"
echo "- Aucun test ne doit retourner 200 (succès)"
echo "- Le serveur ne doit pas crasher"
