const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config({ path: '../artifacts/api-server/.env' });
const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');

async function importShopsWithNewIds() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME || 'botalsepaisa_operations');
  const shopsCollection = db.collection('shops');
  const countersCollection = db.collection('counters');

  // Find the highest numeric ID currently in the DB
  const highestShop = await shopsCollection.find().sort({ id: -1 }).limit(1).toArray();
  let nextNumericId = highestShop.length > 0 ? (highestShop[0].id + 1) : 1;

  console.log(`Starting import from ID: ${nextNumericId} (BSP${String(nextNumericId).padStart(4, '0')})`);

  const wb = xlsx.readFile('../Shop (1).xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const excelShops = xlsx.utils.sheet_to_json(ws);

  let importedCount = 0;

  for (const shop of excelShops) {
    if (!shop.shopName || shop.shopName.trim() === '') {
      continue; // Skip empty rows
    }

    const currentId = nextNumericId++;
    const currentShopId = `BSP${String(currentId).padStart(4, '0')}`;

    let createdAtDate = new Date();
    if (shop.createdAt) {
      const dateStr = String(shop.createdAt).replace(/"/g, '');
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        createdAtDate = parsedDate;
      }
    }

    await shopsCollection.insertOne({
      id: currentId,
      shopId: currentShopId,
      shopName: shop.shopName.trim(),
      ownerName: (shop.ownerName || '').trim(),
      mobile: String(shop.mobile || '').trim(),
      address: (shop.address || '').trim(),
      createdAt: createdAtDate
    });

    console.log(`Added: ${currentShopId} - ${shop.shopName}`);
    importedCount++;
  }

  // Update the shopId counter in the counters collection so future shops created from the UI continue properly
  const finalHighestId = nextNumericId - 1;
  await countersCollection.updateOne(
    { name: 'shopId' },
    { $set: { value: finalHighestId } },
    { upsert: true }
  );

  console.log(`\nImport complete! Added ${importedCount} new shops.`);
  console.log(`Updated shopId counter to ${finalHighestId}.`);

  await client.close();
}

importShopsWithNewIds().catch(console.error);
