const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config({ path: '../artifacts/api-server/.env' });
const { MongoClient } = require('mongodb');

async function clean() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME || 'botalsepaisa_operations');
  const res = await db.collection('shops').deleteMany({
    $or: [
      { shopId: null },
      { shopId: undefined },
      { shopId: 'undefined' },
      { shopName: null },
      { shopName: undefined }
    ]
  });
  console.log('Cleaned up undefined shops:', res.deletedCount);
  await client.close();
}

clean();
