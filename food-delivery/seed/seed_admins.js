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

  // 🧹 Cleanup: Remove orphaned admins (admins without valid restaurants)
  const allAdmins = await RestaurantAdmin.find({}).lean();
  let orphanedCount = 0;
  for (const admin of allAdmins) {
    const restaurant = await Restaurant.findById(admin.restaurantId);
    if (!restaurant) {
      await RestaurantAdmin.deleteOne({ _id: admin._id });
      orphanedCount++;
      console.log(`🗑️  Removed orphaned admin: ${admin.email}`);
    }
  }
  if (orphanedCount > 0) {
    console.log(`🧹 Cleaned up ${orphanedCount} orphaned admin(s)\n`);
  }

  // Don't use .lean() so we get proper Mongoose documents with _id
  const restaurants = await Restaurant.find({}, { name: 1 });
  console.log(`📦 Restaurants found: ${restaurants.length}`);

  if (restaurants.length === 0) {
    console.log('⚠️  No restaurants found. Please run "npm run seed" first to create restaurants.');
    await mongoose.disconnect();
    return;
  }

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0, updated = 0, fixed = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const email = `demo+${String(i + 1).padStart(2, '0')}-${slug(r.name)}@bitecode.dev`;
    const emailLower = email.toLowerCase().trim();

    // First try to find by restaurantId (use r._id directly since it's a Mongoose document)
    let admin = await RestaurantAdmin.findOne({ restaurantId: r._id });
    
    // If not found, check if there's an admin with this email but wrong restaurantId
    if (!admin) {
      admin = await RestaurantAdmin.findOne({ email: emailLower });
      if (admin) {
        // Fix the restaurantId link
        admin.restaurantId = r._id;
        admin.passwordHash = hash;
        await admin.save();
        fixed++;
        console.log(`🔧 Fixed admin: ${emailLower} -> ${r.name}`);
        continue;
      }
    }

    if (!admin) {
      try {
        await RestaurantAdmin.create({
          email: emailLower,
          passwordHash: hash,
          restaurantId: r._id
        });
        created++;
        console.log(`➕ Created admin: ${emailLower} -> ${r.name}`);
      } catch (createErr) {
        if (createErr.code === 11000) {
          // Duplicate email - try to update existing
          admin = await RestaurantAdmin.findOne({ email: emailLower });
          if (admin) {
            admin.restaurantId = r._id;
            admin.passwordHash = hash;
            await admin.save();
            fixed++;
            console.log(`🔧 Fixed duplicate admin: ${emailLower} -> ${r.name}`);
          }
        } else {
          console.error(`❌ Error creating admin for ${r.name}:`, createErr.message);
        }
      }
    } else {
      // Verify restaurant still exists and is linked correctly
      const restaurant = await Restaurant.findById(r._id);
      if (!restaurant) {
        console.log(`⚠️  Restaurant ${r.name} not found, removing orphaned admin`);
        await RestaurantAdmin.deleteOne({ _id: admin._id });
        // Create new admin for this restaurant
        try {
          await RestaurantAdmin.create({
            email: emailLower,
            passwordHash: hash,
            restaurantId: r._id
          });
          created++;
          console.log(`➕ Created new admin: ${emailLower} -> ${r.name}`);
        } catch (createErr) {
          console.error(`❌ Error creating admin for ${r.name}:`, createErr.message);
        }
        continue;
      }

      // Verify the admin's restaurantId actually points to this restaurant
      const adminRestaurant = await Restaurant.findById(admin.restaurantId);
      const needsRestaurantId = !adminRestaurant || String(admin.restaurantId) !== String(r._id);
      
      const needsHash = !admin.passwordHash || !String(admin.passwordHash).startsWith('$2');
      const desiredEmail = emailLower;
      const needsEmail = !admin.email || admin.email !== desiredEmail;

      if (needsHash || needsEmail || needsRestaurantId) {
        admin.passwordHash = needsHash ? hash : admin.passwordHash;
        admin.email = needsEmail ? desiredEmail : admin.email.toLowerCase().trim();
        if (needsRestaurantId) {
          admin.restaurantId = r._id;
          console.log(`🔗 Fixed restaurant link for ${r.name}`);
        }
        await admin.save();
        updated++;
        console.log(`🛠  Updated admin for ${r.name} (${admin.email})`);
      }
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Updated: ${updated}, Fixed: ${fixed}`);
  console.log(`🔑 Demo password for all admins: ${DEFAULT_PASSWORD}`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(err => {
  console.error('❌ Seed admins error:', err);
  process.exit(1);
});
