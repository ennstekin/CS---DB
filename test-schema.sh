#!/bin/bash

# Environment variables'ı yükle
source .env.local

# 1. OAuth Token Al
TOKEN_RESPONSE=$(curl -s -X POST "https://paen.myikas.com/api/admin/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${IKAS_CLIENT_ID}&client_secret=${IKAS_CLIENT_SECRET}")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "✅ Token alındı: ${ACCESS_TOKEN:0:20}..."

# 2. Introspection Query
curl -s -X POST "https://api.myikas.com/api/v1/admin/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "query": "query { __schema { queryType { fields { name description } } } }"
  }' | jq '.data.__schema.queryType.fields[] | {name, description}' 2>/dev/null || echo "Schema field'ları alınamadı"
