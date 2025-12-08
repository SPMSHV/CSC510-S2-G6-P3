// seed/list_restaurant_credentials.js
import 'dotenv/config';
import mongoose from 'mongoose';
import RestaurantAdmin from '../models/RestaurantAdmin.js';
import Restaurant from '../models/Restaurant.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';
const DEFAULT_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Bitecode@123';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Mongo connected\n');

  const admins = await RestaurantAdmin.find({})
    .populate('restaurantId', 'name cuisine')
    .sort({ email: 1 })
    .lean();

  if (admins.length === 0) {
    console.log('⚠️  No restaurant admins found. Run "npm run seed:admins" first.');
    await mongoose.disconnect();
    return;
  }

  console.log('📋 Restaurant Login Credentials:\n');
  console.log('Password for all restaurants:', DEFAULT_PASSWORD);
  console.log('─'.repeat(80));
  
  admins.forEach((admin, index) => {
    const restaurant = admin.restaurantId;
    const restaurantName = restaurant?.name || 'Unknown';
    const cuisine = restaurant?.cuisine || 'N/A';
    console.log(`${String(index + 1).padStart(2, ' ')}. ${restaurantName.padEnd(25)} | ${cuisine.padEnd(15)} | ${admin.email}`);
  });

  console.log('─'.repeat(80));
  console.log(`\n✅ Found ${admins.length} restaurant admin(s)`);
  console.log(`🔑 Password: ${DEFAULT_PASSWORD}\n`);
  
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
