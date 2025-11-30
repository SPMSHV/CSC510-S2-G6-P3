// seed/seed_admins.js
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Restaurant from '../models/Restaurant.js';
import RestaurantAdmin from '../models/RestaurantAdmin.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';
const DEFAULT_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Bitecode@123';

const slug = (s) =>
  String(s || 'restaurant')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 32);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Mongo connected');

  const restaurants = await Restaurant.find({}, { name: 1 }).lean();
  console.log(`📦 Restaurants found: ${restaurants.length}`);

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0, updated = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const email = `demo+${String(i + 1).padStart(2, '0')}-${slug(r.name)}@bitecode.dev`;

    let admin = await RestaurantAdmin.findOne({ restaurantId: r._id });
    if (!admin) {
      await RestaurantAdmin.create({
        email: email.toLowerCase().trim(),
        passwordHash: hash,
        restaurantId: r._id
      });
      created++;
      console.log(`➕ Created admin: ${email} -> ${r.name}`);
    } else {
      const needsHash = !admin.passwordHash || !String(admin.passwordHash).startsWith('$2');
      const desiredEmail = email.toLowerCase().trim();
      const needsEmail = !admin.email || admin.email !== desiredEmail;

      if (needsHash || needsEmail) {
        admin.passwordHash = needsHash ? hash : admin.passwordHash;
        admin.email = needsEmail ? desiredEmail : admin.email.toLowerCase().trim();
        await admin.save();
        updated++;
        console.log(`🛠  Updated admin for ${r.name} (${admin.email})`);
      }
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Updated: ${updated}`);
  console.log(`🔑 Demo password for all admins: ${DEFAULT_PASSWORD}`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(err => {
  console.error('❌ Seed admins error:', err);
  process.exit(1);
});
