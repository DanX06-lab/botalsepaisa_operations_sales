const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config({ path: '../artifacts/api-server/.env' });
const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME || 'botalsepaisa_operations');

  const wb = xlsx.readFile('../Shop (1).xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const excelShops = xlsx.utils.sheet_to_json(ws);
  const excelNames = excelShops.map(s => s.shopName).filter(Boolean);

  const existingByName = await db.collection('shops').find({
    shopName: { $in: excelNames }
  }).toArray();

  console.log('Total shops in Excel:', excelNames.length);
  console.log('Shops from Excel that ALREADY exist by name in DB:', existingByName.length);
  if (existingByName.length > 0) {
    console.log('Existing names:', existingByName.map(s => s.shopName));
  }

  await client.close();
}

check();
