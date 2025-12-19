#!/bin/bash
source .env.local
TOKEN_RESPONSE=$(curl -s -X POST "https://paen.myikas.com/api/admin/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${IKAS_CLIENT_ID}&client_secret=${IKAS_CLIENT_SECRET}")
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Gerçek bir sipariş sorgula
curl -s -X POST "https://api.myikas.com/api/v1/admin/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "query": "query { listOrder(orderNumber: { eq: \"132141\" }, pagination: { page: 1, limit: 1 }) { data { id orderNumber totalPrice currencyCode orderLineItems { id quantity unitPrice price finalPrice finalUnitPrice variant { name } } } } }"
  }' | jq '.'
