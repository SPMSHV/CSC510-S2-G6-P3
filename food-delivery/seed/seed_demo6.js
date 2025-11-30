// seed/seed_demo6.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

/**
 * 🔧 EDIT ME:
 * Provide 6 restaurants, each with 5 items.
 * - name, cuisine, address, imageUrl (restaurant)
 * - items: [{ name, price, description, imageUrl, isAvailable }]
 *
 * NOTE: The script upserts by Restaurant.name and by (restaurantId + item.name).
 * So you can safely re-run and it will update the same 6 restaurants & their 5 items.
 */
const RESTAURANTS = [
  {
    name: 'Sage & Cream Cafe',
    cuisine: 'Italian',
    address: '123 Main St, Rl',
    imageUrl: '/images/restaurants/Resto1.jpg',
    items: [
      { name: 'Margherita Pizza', price: 11, description: 'A classic and simple pizza with tomato sauce, fresh mozzarella, basil, and a drizzle of olive oil.', imageUrl: '/images/menu/item1_1.jpg', isAvailable: true },
      { name: 'Espresso',         price: 7,  description: 'A strong, concentrated coffee that is the foundation of many Italian coffee drinks.', imageUrl: '/images/menu/item1_2.jpg', isAvailable: true },
      { name: 'Gelato',           price: 9,  description: 'A dense, frozen dessert similar to ice cream, but made with more milk and less cream, and served in a variety of flavors.', imageUrl: '/images/menu/item1_3.jpg', isAvailable: true },
      { name: 'Arancini',         price: 10, description: 'Fried rice balls, typically filled with ragu, cheese, and peas, that are a popular street food and appetizer.', imageUrl: '/images/menu/item1_4.jpg', isAvailable: true },
      { name: 'Caprese Salad',    price: 10, description: 'A fresh and simple salad made with sliced fresh mozzarella, tomatoes, and sweet basil, seasoned with salt and olive oil.', imageUrl: '/images/menu/item1_5.jpg', isAvailable: true },
    ],
  },
  {
    name: 'Quick Bite',
    cuisine: 'American',
    address: '456 Oak Ave, Rl',
    imageUrl: '/images/restaurants/Resto2.jpg',
    items: [
      { name: 'Hamburger',        price: 10, description: 'A ground meat patty, typically beef, served on a bun, often with various toppings.', imageUrl: '/images/menu/item2_1.jpg', isAvailable: true },
      { name: 'French Fries',     price: 8,  description: 'Thinly sliced potatoes deep-fried until crisp.', imageUrl: '/images/menu/item2_2.jpg', isAvailable: true },
      { name: 'Tacos',            price: 12, description: 'A filling like ground meat, chicken, or beef inside a corn or flour tortilla.', imageUrl: '/images/menu/item2_3.jpg', isAvailable: true },
      { name: 'Chicken Sandwich', price: 9,  description: 'A piece of breaded chicken served on a bun, often with pickles or other toppings.', imageUrl: '/images/menu/item2_4.jpg', isAvailable: true },
      { name: 'Fried Chicken',    price: 7,  description: 'Chicken pieces that are breaded or battered and deep-fried.', imageUrl: '/images/menu/item2_5.jpg', isAvailable: true },
    ],
  },
  {
    name: 'Flavor Rush',
    cuisine: 'Mexican',
    address: '789 Pine Rd, Rl',
    imageUrl: '/images/restaurants/Resto3.jpg',
    items: [
      { name: 'Burritos',    price: 9,  description: 'A large flour tortilla wrapped around fillings like rice, beans, meat, and cheese.', imageUrl: '/images/menu/item3_1.jpg', isAvailable: true },
      { name: 'Quesadillas', price: 11, description: 'A tortilla, typically a flour one, filled with cheese and other ingredients, then grilled and folded or served open-faced.', imageUrl: '/images/menu/item3_2.jpg', isAvailable: true },
      { name: 'Nachos',      price: 8,  description: 'Tortilla chips covered with melted cheese, beans, and toppings such as salsa, sour cream, and jalapeños.', imageUrl: '/images/menu/item3_3.jpg', isAvailable: true },
      { name: 'Enchiladas',  price: 12, description: 'Tortillas rolled around a filling and covered with a chili pepper sauce.', imageUrl: '/images/menu/item3_4.jpg', isAvailable: true },
      { name: 'Tacos',       price: 7,  description: 'A classic and versatile dish featuring a corn or flour tortilla filled with various meats, vegetables, and toppings.', imageUrl: '/images/menu/item3_5.jpg', isAvailable: true },
    ],
  },
  {
    name: 'Curry & Co',
    cuisine: 'Indian',
    address: '12 Market St, Rl',
    imageUrl: '/images/restaurants/Resto4.jpg',
    items: [
      { name: 'Samosa',        price: 5,  description: 'A popular fried or baked pastry with a savory filling, often containing spiced potatoes and peas.', imageUrl: '/images/menu/item4_1.jpg', isAvailable: true },
      { name: 'Butter Chicken',price: 9,  description: 'A rich and creamy tomato-based curry with tender pieces of chicken.', imageUrl: '/images/menu/item4_2.jpg', isAvailable: true },
      { name: 'Naan',          price: 2,  description: 'A leavened, oven-baked flatbread that is often brushed with butter.', imageUrl: '/images/menu/item4_3.jpg', isAvailable: true },
      { name: 'Biryani',       price: 11, description: 'A mixed rice dish with a combination of spices, and meat or vegetables.', imageUrl: '/images/menu/item4_4.jpg', isAvailable: true },
      { name: 'Masala Dosa',   price: 7,  description: 'A thin, crispy South Indian pancake made from fermented rice and lentil batter, filled with a spiced potato mixture.', imageUrl: '/images/menu/item4_5.jpg', isAvailable: true },
    ],
  },
  {
    name: 'Golden Dragon',
    cuisine: 'Chinese',
    address: '55 Lake View, Rl',
    imageUrl: '/images/restaurants/Resto5.jpg',
    items: [
      { name: 'Kung Pao Chicken', price: 9,  description: 'A stir-fried dish with chicken, peanuts, vegetables, and chili peppers, known for its sweet and savory flavor.', imageUrl: '/images/menu/item5_1.jpg', isAvailable: true },
      { name: 'Fried Rice',       price: 10, description: 'A staple dish made with stir-fried rice, often including ingredients like eggs, vegetables, and your choice of meat or seafood.', imageUrl: '/images/menu/item5_2.jpg', isAvailable: true },
      { name: 'Chow Mein',        price: 11, description: 'Stir-fried noodles with a variety of vegetables and protein options.', imageUrl: '/images/menu/item5_3.jpg', isAvailable: true },
      { name: 'Dumplings',        price: 12, description: 'Can be boiled, steamed, or fried, with various fillings, often served as an appetizer or main course.', imageUrl: '/images/menu/item5_4.jpg', isAvailable: true },
      { name: 'Wonton Soup',      price: 8,  description: 'A soup with wontons (dumplings) in a savory broth.', imageUrl: '/images/menu/item5_5.jpg', isAvailable: true },
    ],
  },
  {
    name: 'Epic Desserts',
    cuisine: 'Global',
    address: '77 Elm Blvd, Rl',
    imageUrl: '/images/restaurants/Resto6.jpg',
    items: [
      { name: 'Baklava',        price: 9,  description: 'A sweet pastry made of layers of phyllo dough stuffed with chopped nuts and soaked in honey or syrup.', imageUrl: '/images/menu/item6_1.jpg', isAvailable: true },
      { name: 'Crème Brûlée',   price: 8,  description: 'A rich and creamy custard topped with a layer of hardened, caramelized sugar that is then cracked with a spoon.', imageUrl: '/images/menu/item6_2.jpg', isAvailable: true },
      { name: 'Pastel de Nata', price: 11, description: 'A classic Portuguese egg custard tart with a flaky crust.', imageUrl: '/images/menu/item6_3.jpg', isAvailable: true },
      { name: 'Tiramisu',       price: 10, description: 'An Italian dessert made with layers of coffee-soaked ladyfingers and a rich mascarpone cream, often dusted with cocoa powder.', imageUrl: '/images/menu/item6_4.jpg', isAvailable: true },
      { name: 'Gulab Jamun',    price: 9,  description: 'Soft, deep-fried balls made from milk solids, soaked in a fragrant syrup with ingredients like rose water and cardamom.', imageUrl: '/images/menu/item6_5.jpg', isAvailable: true },
    ],
  },
];

async function upsertRestaurant(r) {
  const update = {
    cuisine: r.cuisine,
    imageUrl: r.imageUrl,
    address: r.address,
    // optional fields present in your schema with defaults:
    // rating, deliveryFee, etaMins will be left as defaults unless provided
  };
  // Match by name so re-running updates the same record
  const doc = await Restaurant.findOneAndUpdate(
    { name: r.name },
    { $set: update },
    { new: true, upsert: true }
  );
  return doc;
}

async function upsertMenuItems(restaurantId, items) {
  let created = 0, updated = 0;
  for (const item of items) {
    const found = await MenuItem.findOne({ restaurantId, name: item.name });
    if (found) {
      await MenuItem.updateOne(
        { _id: found._id },
        {
          $set: {
            description: item.description || '',
            price: item.price,
            imageUrl: item.imageUrl || '',
            isAvailable: item.isAvailable !== false,
          },
        }
      );
      updated++;
    } else {
      await MenuItem.create({
        restaurantId,
        name: item.name,
        description: item.description || '',
        price: item.price,
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable !== false,
      });
      created++;
    }
  }
  return { created, updated };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed in production.');
    process.exit(1);
  }

  console.log('🌱 Connecting to Mongo…');
  await mongoose.connect(MONGODB_URI);

  let totalRestaurants = 0;
  let totalItemsCreated = 0;
  let totalItemsUpdated = 0;

  for (const r of RESTAURANTS) {
    const rest = await upsertRestaurant(r);
    totalRestaurants++;

    const { created, updated } = await upsertMenuItems(rest._id, r.items.slice(0, 5)); // ensure 5 items only
    totalItemsCreated += created;
    totalItemsUpdated += updated;

    console.log(`  ✅ ${r.name}: upserted restaurant; items -> +${created}/~${updated}`);
  }

  console.log(`\n✅ Done. Restaurants upserted: ${totalRestaurants}`);
  console.log(`🍽️  Menu items created: ${totalItemsCreated}, updated: ${totalItemsUpdated}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(err => {
  console.error('❌ Seed demo6 error:', err);
  process.exit(1);
});
