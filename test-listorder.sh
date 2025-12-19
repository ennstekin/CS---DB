#!/bin/bash

source .env.local

# OAuth Token Al
TOKEN_RESPONSE=$(curl -s -X POST "https://paen.myikas.com/api/admin/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${IKAS_CLIENT_ID}&client_secret=${IKAS_CLIENT_SECRET}")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "✅ Token alındı"
echo ""

# listOrder field detaylarını öğren
echo "📋 listOrder field detayları:"
curl -s -X POST "https://api.myikas.com/api/v1/admin/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "query": "query { __type(name: \"Query\") { fields(includeDeprecated: false) { name args { name type { name kind ofType { name kind } } } type { name kind ofType { name kind } } } } }"
  }' | jq '.data.__type.fields[] | select(.name == "listOrder")'
