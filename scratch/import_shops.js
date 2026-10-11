const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

require('dotenv').config({ path: '../artifacts/api-server/.env' });
const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');

async function importShops() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('your-mongodb-atlas')) {
    console.error('Please update MONGODB_URI in .env with your actual connection string.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(process.env.DATABASE_NAME || 'botalsepaisa_operations');
    const shopsCollection = db.collection('shops');
    const countersCollection = db.collection('counters');

    console.log('Reading Excel file...');
    const wb = xlsx.readFile('../Shop (1).xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const shops = xlsx.utils.sheet_to_json(ws);

    let importedCount = 0;
    let highestNumericId = 0;

    for (const shop of shops) {
      // Check if shop already exists by shopId (e.g., BSP0001)
      const existing = await shopsCollection.findOne({ shopId: shop.shopId });
      
      let createdAtDate = new Date();
      if (shop.createdAt) {
        // Remove quotes if present
        const dateStr = shop.createdAt.replace(/"/g, '');
        createdAtDate = new Date(dateStr);
      }

      if (!existing) {
        await shopsCollection.insertOne({
          id: shop.id,
          shopId: shop.shopId,
          shopName: shop.shopName,
          ownerName: shop.ownerName,
          mobile: String(shop.mobile || ''),
          address: shop.address || '',
          createdAt: createdAtDate
        });
        console.log(`Imported: ${shop.shopId} - ${shop.shopName}`);
        importedCount++;
      } else {
        console.log(`Skipped existing: ${shop.shopId} - ${shop.shopName}`);
      }

      if (shop.id > highestNumericId) {
        highestNumericId = shop.id;
      }
    }

    // Update the counter to avoid generating duplicate IDs for new shops in the future
    const currentCounter = await countersCollection.findOne({ name: 'shopId' });
    if (!currentCounter || currentCounter.value < highestNumericId) {
      await countersCollection.updateOne(
        { name: 'shopId' },
        { $set: { value: highestNumericId } },
        { upsert: true }
      );
      console.log(`Updated shopId counter to ${highestNumericId}`);
    }

    console.log(`Successfully imported ${importedCount} shops!`);
  } catch (err) {
    console.error('Error importing shops:', err);
  } finally {
    await client.close();
    console.log('Done.');
  }
}

importShops();
