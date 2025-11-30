// seed/seed_demo6_admins.js
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import Restaurant from '../models/Restaurant.js';
import RestaurantAdmin from '../models/RestaurantAdmin.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';
const DEFAULT_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Bitecode@123';

// ✅ Put your 6 restaurant names here EXACTLY as in seed_demo6.js
const RESTAURANT_NAMES = [
  'Sage & Cream Cafe',
  'Quick Bite',
  'Flavor Rush',
  'Curry & Co',
  'Golden Dragon',
  'Epic Desserts',
];

// (Optional) Provide explicit emails/passwords per restaurant.
// If a restaurant is absent here, we will use slug(name)@demo.local and DEFAULT_PASSWORD.
const ADMIN_OVERRIDES = {
  // Example:
  // 'Sage & Cream Cafe': { email: 'sagecream@demo.local', password: 'Sage@2025' },
};

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 32);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
}

async function writeCSV(rows, outPath) {
  const header = 'restaurant_name,email,password\n';
  const body = rows.map(r =>
    [r.restaurantName, r.email, r.password].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, header + body, 'utf8');
}

async function upsertAdminForRestaurant(restaurant) {
  const name = restaurant.name;
  const override = ADMIN_OVERRIDES[name] || {};
  const email = override.email || `${slug(name)}@demo.local`;
  const password = override.password || DEFAULT_PASSWORD;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert by (restaurantId) or by (email). Email should be unique.
  const existing = await RestaurantAdmin.findOne({ email });
  if (existing) {
    await RestaurantAdmin.updateOne(
      { _id: existing._id },
      { $set: { name, restaurantId: restaurant._id, passwordHash } }
    );
    return { email, password, action: 'updated' };
  }

  await RestaurantAdmin.create({
    name,
    email,
    passwordHash,
    restaurantId: restaurant._id,
  });
  return { email, password, action: 'created' };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed admins in production.');
    process.exit(1);
  }

  console.log('🔌 Connecting to Mongo…');
  await mongoose.connect(MONGODB_URI);

  const restaurants = await Restaurant.find({ name: { $in: RESTAURANT_NAMES } }).lean();
  const foundNames = new Set(restaurants.map(r => r.name));

  // Warn if any of the 6 are missing (maybe seed_demo6.js didn’t run yet)
  const missing = RESTAURANT_NAMES.filter(n => !foundNames.has(n));
  if (missing.length) {
    console.warn('⚠️  Missing restaurants (did you run seed:demo6?):', missing);
  }

  const results = [];
  let created = 0, updated = 0;

  for (const r of restaurants) {
    const res = await upsertAdminForRestaurant(r);
    results.push({ restaurantName: r.name, email: res.email, password: res.password, action: res.action });
    if (res.action === 'created') created++; else updated++;
    console.log(`  ✅ ${r.name}: ${res.action} admin → ${res.email}`);
  }

  console.log(`\n✅ Done. Admins created: ${created}, updated: ${updated}`);
  if (results.length) {
    console.log('\n🔐 Credentials:');
    for (const row of results) {
      console.log(` - ${row.restaurantName}: ${row.email}  /  ${row.password}`);
    }
    const csvPath = path.join(process.cwd(), 'seed-output', 'demo6_admin_creds.csv');
    await writeCSV(results, csvPath);
    console.log(`\n📝 CSV written: ${csvPath}`);
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(err => {
  console.error('❌ Seed demo6_admins error:', err);
  process.exit(1);
});
