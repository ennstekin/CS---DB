const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function clearMails() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Deleting all mails from database...');
    
    const result = await client.query('DELETE FROM mails');
    console.log(`✓ Deleted ${result.rowCount} mails`);
  } finally {
    await client.end();
  }
}

clearMails();
