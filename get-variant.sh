#!/bin/bash
source .env.local
TOKEN_RESPONSE=$(curl -s -X POST "https://paen.myikas.com/api/admin/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${IKAS_CLIENT_ID}&client_secret=${IKAS_CLIENT_SECRET}")
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "=== OrderLineItem.variant type ==="
curl -s -X POST "https://api.myikas.com/api/v1/admin/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"query": "query { __type(name: \"OrderLineItem\") { fields(includeDeprecated: false) { name type { name kind ofType { name fields { name } } } } } }"}' | jq '.data.__type.fields[] | select(.name == "variant") | .type.ofType.fields[] | .name' | head -20

echo ""
echo "=== OrderPackageTrackingInfo type ==="  
curl -s -X POST "https://api.myikas.com/api/v1/admin/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"query": "query { __type(name: \"OrderPackage\") { fields { name type { name ofType { name fields { name } } } } } }"}' | jq '.data.__type.fields[] | select(.name == "trackingInfo") | .type.ofType.fields[] | .name'
