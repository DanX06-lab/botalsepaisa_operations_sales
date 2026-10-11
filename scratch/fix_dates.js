const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config({ path: '../artifacts/api-server/.env' });
const { MongoClient } = require('mongodb');

async function updateDates() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME || 'botalsepaisa_operations');
  
  // Set createdAt for newly imported shops to now, so they appear on page 1
  const res = await db.collection('shops').updateMany(
    { id: { $gte: 86 } },
    { $set: { createdAt: new Date() } }
  );
  
  console.log(`Updated createdAt for ${res.modifiedCount} shops.`);
  await client.close();
}

updateDates().catch(console.error);
