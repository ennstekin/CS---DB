/**
 * İkas GraphQL Schema Test
 * GraphQL introspection query ile mevcut field'ları öğreneceğiz
 */

const fetch = require('node-fetch');

async function testIkasSchema() {
  // 1. OAuth Token Al
  const tokenResponse = await fetch('https://paen.myikas.com/api/admin/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.IKAS_CLIENT_ID,
      client_secret: process.env.IKAS_CLIENT_SECRET,
    }),
  });

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  console.log('✅ Token alındı');

  // 2. GraphQL Introspection Query
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType {
          fields {
            name
            description
            args {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    }
  `;

  const schemaResponse = await fetch('https://api.myikas.com/api/v1/admin/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: introspectionQuery }),
  });

  const schemaData = await schemaResponse.json();

  console.log('\n📋 Mevcut Query Field\'ları:\n');
  console.log(JSON.stringify(schemaData, null, 2));
}

testIkasSchema().catch(console.error);
