#!/bin/bash

# 🎯 Script de test pour l'API Profile ft_transcendence
# Usage: ./test-profile-api.sh

echo "🚀 Test de l'API Profile ft_transcendence"
echo "========================================="

# Configuration
API_URL="http://localhost:8000"
EMAIL="admin@transcendence.com"
PASSWORD="admin123"

echo ""
echo "📋 Étape 1 : Test de connexion au serveur..."
if ! curl -s --connect-timeout 5 "$API_URL/health" > /dev/null 2>&1; then
	echo "❌ Erreur : Serveur non accessible sur $API_URL"
	echo "   Vérifie que ton serveur tourne avec 'make dev'"
	exit 1
fi
echo "✅ Serveur accessible !"

echo ""
echo "🔑 Étape 2 : Connexion pour récupérer le token..."

# Login pour récupérer le token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Vérifier si la connexion a réussi
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
	echo "✅ Connexion réussie !"
	
	# Extraire le token (méthode simple avec grep/sed)
	TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
	
	if [ -z "$TOKEN" ]; then
		echo "❌ Impossible d'extraire le token"
		echo "Réponse login : $LOGIN_RESPONSE"
		exit 1
	fi
	
	echo "🎫 Token récupéré : ${TOKEN:0:20}..."
else
	echo "❌ Échec de la connexion"
	echo "Réponse : $LOGIN_RESPONSE"
	echo ""
	echo "💡 Suggestions :"
	echo "   - Vérifie que l'utilisateur admin existe"
	echo "   - Lance 'make db-seed' pour créer les utilisateurs de test"
	exit 1
fi

echo ""
echo "🧪 Étape 3 : Test de l'API Profile..."

# Test cases
declare -a test_cases=(
	"Alice42:✅ Nom valide"
	"Bob123:✅ Nom valide avec chiffres"
	"Test_User:✅ Nom avec underscore"
	"TropLongNom123:❌ Trop long (>12 chars)"
	"Alice Bob:❌ Avec espace"
	"Alice-Bob:❌ Avec tiret"
	"Alice@Bob:❌ Avec caractère spécial"
	":❌ Vide"
)

echo ""
for test_case in "${test_cases[@]}"; do
	IFS=':' read -r display_name expected <<< "$test_case"
	
	echo "🔍 Test : '$display_name' → $expected"
	
	# Construire le JSON body
	if [ -z "$display_name" ]; then
		JSON_BODY='{"display_name":""}'
	else
		JSON_BODY="{\"display_name\":\"$display_name\"}"
	fi
	
	# Faire l'appel API
	RESPONSE=$(curl -s -X PATCH "$API_URL/api/profile" \
	  -H "Content-Type: application/json" \
	  -H "Authorization: Bearer $TOKEN" \
	  -d "$JSON_BODY")
	
	# Analyser la réponse
	if echo "$RESPONSE" | grep -q '"success":true'; then
		if [[ "$expected" == *"✅"* ]]; then
			echo "   ✅ PASS - Succès attendu"
		else
			echo "   ❌ FAIL - Succès inattendu"
			echo "   Réponse : $RESPONSE"
		fi
	else
		if [[ "$expected" == *"❌"* ]]; then
			echo "   ✅ PASS - Erreur attendue"
			# Afficher le message d'erreur
			ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
			if [ ! -z "$ERROR_MSG" ]; then
				echo "   📝 Message : $ERROR_MSG"
			fi
		else
			echo "   ❌ FAIL - Erreur inattendue"
			echo "   Réponse : $RESPONSE"
		fi
	fi
	echo ""
done

echo "🎯 Tests terminés !"
echo ""
echo "💡 Pour tester manuellement :"
echo "   curl -X PATCH $API_URL/api/profile \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer $TOKEN' \\"
echo "     -d '{\"display_name\":\"TestName\"}'"