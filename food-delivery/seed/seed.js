// scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food_delivery_app";
const CLEAR_USERS = /^true$/i.test(process.env.CLEAR_USERS || "false");
let SEED = process.env.SEED ? Number(process.env.SEED) : null;

function rnd(){ if(SEED==null) return Math.random(); SEED=(SEED*1664525+1013904223)%4294967296; return SEED/4294967296; }
const pick = (arr)=>arr[Math.floor(rnd()*arr.length)];
const shuffle = (arr)=>{ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; };
const uniqBy = (arr, keyFn)=>{ const s=new Set(); return arr.filter(x=>{const k=keyFn(x); if(s.has(k)) return false; s.add(k); return true;}); };
const price = (min,max,step=0.5)=> Math.round(((min + rnd()*(max-min))/step))*step;

const NUM_RESTAURANTS = 25;
const ITEMS_PER_RESTAURANT = 15;
const SHARED_PER_RESTAURANT = 4;
const UNIQUE_PER_RESTAURANT = ITEMS_PER_RESTAURANT - SHARED_PER_RESTAURANT;

const cuisines = [
  "Indian","Italian","Japanese","Chinese","Mexican",
  "Thai","American","Mediterranean","Greek","Korean",
  "French","Spanish","Middle Eastern","Vietnamese","BBQ"
];

const nameAdjs = ["Spice","Urban","Golden","Royal","Crave","Garden","Cozy","Savory","Fresh","Epic"];
const nameNouns = ["Route","Table","Bistro","Kitchen","Corner","Oven","Fork","Harbor","District","House"];

const cuisineDishes = {
  Indian:["Butter Chicken","Paneer Tikka","Garlic Naan","Dal Makhani","Chicken Biryani","Aloo Paratha","Chole Bhature","Rogan Josh","Palak Paneer","Samosa Chaat","Tandoori Chicken","Masala Dosa","Gulab Jamun","Rasmalai","Kheer","Mutton Curry","Fish Fry"],
  Italian:["Margherita Pizza","Pasta Alfredo","Lasagna","Bruschetta","Carbonara","Penne Arrabbiata","Four Cheese Pizza","Calzone","Pesto Gnocchi","Risotto Funghi","Tiramisu","Gelato","Panini Classico","Minestrone","Caprese Salad","Arancini","Cannoli"],
  Japanese:["California Roll","Salmon Nigiri","Miso Soup","Ramen Tonkotsu","Tempura Udon","Chicken Katsu","Spicy Tuna Roll","Sashimi Platter","Gyoza","Yakitori","Okonomiyaki","Karaage","Matcha Cheesecake","Unagi Don","Takoyaki","Onigiri","Tamago Nigiri"],
  Chinese:["Kung Pao Chicken","Mapo Tofu","Sweet & Sour Pork","Chow Mein","Dumplings","Beef with Broccoli","Hot & Sour Soup","Fried Rice","General Tso’s Chicken","Scallion Pancakes","Dan Dan Noodles","Sesame Chicken","Peking Duck","Wonton Soup","Char Siu","Spring Rolls","Egg Tarts"],
  Mexican:["Tacos al Pastor","Chicken Quesadilla","Guacamole","Nachos Supreme","Burrito Bowl","Carnitas Tacos","Churros","Elote","Fajitas","Salsa Verde Enchiladas","Pozole","Tostadas","Ceviche","Flan","Horchata","Tamales","Carne Asada"],
  Thai:["Pad Thai","Green Curry","Red Curry","Tom Yum Soup","Basil Chicken","Mango Sticky Rice","Pad See Ew","Massaman Curry","Papaya Salad","Tom Kha Gai","Fried Rice","Crispy Spring Rolls","Drunken Noodles","Yellow Curry","Coconut Ice Cream","Satay","Fried Banana"],
  American:["Cheeseburger","BBQ Ribs","Fried Chicken","Mac & Cheese","Caesar Salad","Buffalo Wings","Club Sandwich","Onion Rings","Apple Pie","Chocolate Shake","Steak Frites","Clam Chowder","Lobster Roll","Pancakes","Waffles","Grilled Cheese","Key Lime Pie"],
  Mediterranean:["Falafel Wrap","Hummus Plate","Shawarma Bowl","Tabbouleh","Baba Ganoush","Lamb Kofta","Greek Salad","Spinach Pie","Baklava","Halloumi Wrap","Pita Platter","Lentil Soup","Chicken Souvlaki","Stuffed Grape Leaves","Moussaka","Kebab Plate","Kunafa"],
  Greek:["Greek Salad","Souvlaki","Moussaka","Gyro Wrap","Spanakopita","Tzatziki Dip","Baklava","Loukoumades","Lamb Chops","Feta Fries","Greek Yogurt Honey","Kolokithokeftedes","Chicken Skewers","Horiatiki","Pastitsio","Kataifi","Dolmades"],
  Korean:["Bibimbap","Bulgogi","Kimchi Jjigae","Japchae","Korean Fried Chicken","Tteokbokki","Kimchi Pancake","Galbi","Sundubu Jjigae","Kimbap","Jajangmyeon","Banchan Set","Soondae","Hotteok","Samgyeopsal","Army Stew","Naengmyeon"],
  French:["Croque Monsieur","Quiche Lorraine","Ratatouille","Boeuf Bourguignon","Coq au Vin","Nicoise Salad","Soufflé","Crème Brûlée","Onion Soup","Duck Confit","Crêpes","Pain au Chocolat","Tarte Tatin","Macarons","Moules Frites","Foie Gras","Profiteroles"],
  Spanish:["Paella","Patatas Bravas","Tortilla Española","Churros con Chocolate","Gambas al Ajillo","Croquetas","Gazpacho","Empanadas","Pulpo a la Gallega","Pimientos de Padrón","Fabada","Salmorejo","Bocadillo","Flan","Sangria","Albóndigas","Tarta de Queso"],
  "Middle Eastern":["Mixed Grill","Chicken Shawarma","Lamb Kebab","Mezze Platter","Tabbouleh","Hummus","Fattoush","Manakish","Falafel","Kunafa","Baklava","Kofta Wrap","Shish Taouk","Kibbeh","Muhammara","Labneh","Maqluba"],
  Vietnamese:["Pho","Banh Mi","Bun Cha","Goi Cuon","Bun Bo Hue","Com Tam","Ca Kho To","Bun Thit Nuong","Xoi","Banh Xeo","Che Ba Mau","Bo La Lot","Banh Flan","Hu Tieu","Mi Quang","Chicken Pho","Egg Coffee"],
  BBQ:["Brisket Plate","Pulled Pork Sandwich","Burnt Ends","Smoked Sausage","BBQ Chicken","Cornbread","Coleslaw","Mac & Cheese","Banana Pudding","Rib Rack","Baked Beans","Fried Okra","Potato Salad","Peach Cobbler","Turkey Breast","Smoked Wings","Pickles & Bread"]
};

// Shared 25% pool
const sharedMenuPool = [
  { name:"Fries", description:"Crispy golden fries", base:[3.49,4.99], imageUrl:"https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?q=80&w=800&auto=format&fit=crop" },
  { name:"Coke", description:"Chilled soft drink", base:[1.99,2.49], imageUrl:"https://images.unsplash.com/photo-1541976076758-347942db1974?q=80&w=800&auto=format&fit=crop" },
  { name:"Chocolate Brownie", description:"Fudgy brownie slice", base:[2.99,4.49], imageUrl:"https://images.unsplash.com/photo-1606313564200-e75d5e30476b?q=80&w=800&auto=format&fit=crop" },
  { name:"House Salad", description:"Greens, tomatoes, vinaigrette", base:[4.49,6.49], imageUrl:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop" },
  { name:"Cheesecake", description:"Classic NY slice", base:[4.99,6.99], imageUrl:"https://images.unsplash.com/photo-1505252585461-04db1eb84625?q=80&w=800&auto=format&fit=crop" },
  { name:"Garlic Bread", description:"Toasted, buttery, garlicky", base:[3.49,5.49], imageUrl:"https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" },
  { name:"Iced Tea", description:"Fresh brewed", base:[1.49,2.49], imageUrl:"https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=800&auto=format&fit=crop" },
  { name:"Water Bottle", description:"Still water 500ml", base:[0.99,1.49], imageUrl:"https://images.unsplash.com/photo-1526404802712-97b70d1b1b3c?q=80&w=800&auto=format&fit=crop" }
];

// 30 unique covers → use first 25
const RESTAURANT_UNIQUE_IMAGES = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1601924582971-c9e8eafc0d9b?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1590736969955-71b1f4bf3a3a?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1546554137-f86b9593a222?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1546069901-5a6b3d7c51b1?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605478601423-3a4c34c7f9ea?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541414779316-956d4d7b2a3f?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1589308078056-f04f0b3cdebe?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1617191519400-7d2e3fdc0a67?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1562967916-eb82221dfb36?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=1600&auto=format&fit=crop"
];

function makeRestaurantName(){ return `${pick(nameAdjs)} ${pick(nameNouns)}`; }
function slugify(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function randomAddress(){
  const streets=["Main St","Oak Ave","Maple Rd","Cedar Ln","Pine St","Elm St","Willow Way","Park Blvd","Sunset Dr","Ridge Rd"];
  const cities=["Raleigh","Cary","Durham","Morrisville","Apex"];
  const zip=27600+Math.floor(rnd()*99);
  return `${100+Math.floor(rnd()*900)} ${pick(streets)}, ${pick(cities)}, NC ${zip}`;
}
function cuisineItem(cuisine){
  const pool=cuisineDishes[cuisine] || ["Chef Special"];
  const baseName=pick(pool);
  const descs=["House favorite","Chef’s special","Fresh & flavorful","Customer favorite","Classic recipe","Made from scratch","Rich & hearty","Light & refreshing"];
  const lower=baseName.toLowerCase();
  const imgMap={
    default:"https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1200&auto=format&fit=crop",
    sushi:"https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop",
    pizza:"https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1200&auto=format&fit=crop",
    burger:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"
  };
  const imageUrl =
    lower.includes("roll")||lower.includes("sushi")||lower.includes("nigiri") ? imgMap.sushi :
    lower.includes("pizza")||lower.includes("calzone")||lower.includes("gnocchi") ? imgMap.pizza :
    lower.includes("burger")||lower.includes("cheese") ? imgMap.burger :
    imgMap.default;

  const [min,max] =
    cuisine==="Japanese"||cuisine==="French" ? [9.99,18.99] :
    cuisine==="BBQ"||cuisine==="American" ? [7.99,16.99] :
    cuisine==="Italian" ? [8.99,17.49] :
    [6.49,15.49];

  return { name: baseName, description: pick(descs), price: Number(price(min,max,0.5).toFixed(2)), imageUrl };
}
function sharedItemVariant(base){
  const p = Number(price(base.base[0], base.base[1], 0.5).toFixed(2));
  return { name: base.name, description: base.description, price: p, imageUrl: base.imageUrl };
}

// write CSV helper
async function writeCredentialsCSV(rows){
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outPath = path.join(__dirname, "seeded_restaurant_credentials.csv");
  const header = "index,name,email,password\n";
  const lines = rows.map(r => `${r.index},${JSON.stringify(r.name)},${r.email},${r.password}`).join("\n");
  await fs.writeFile(outPath, header + lines, "utf8");
  console.log(`📄 Credentials CSV: ${outPath}`);
}

// determine password fields from schema
function getPasswordField(){
  if (Restaurant.schema.path("password")) return { type: "plain", field: "password" };
  if (Restaurant.schema.path("passwordHash")) return { type: "hash", field: "passwordHash" };
  if (Restaurant.schema.path("hashedPassword")) return { type: "hash", field: "hashedPassword" };
  return null;
}

async function main(){
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected:", MONGODB_URI);

  console.log("🧹 Clearing restaurants & menu items…");
  await Promise.all([Restaurant.deleteMany({}), MenuItem.deleteMany({})]);

  if (CLEAR_USERS) {
    console.log("🧹 CLEAR_USERS=true → also clearing users…");
    await User.deleteMany({});
  } else {
    console.log("🔒 Users left intact (set CLEAR_USERS=true to wipe).");
  }

  if (!await User.findOne({ email: "demo@example.com" })) {
    await User.create({_id: "demo-user-1", name: "Demo User", email: "demo@example.com" });
    console.log("👤 Created demo user demo@example.com");
  }

  const passField = getPasswordField();
  if (!passField) {
    console.warn("⚠️ Restaurant schema has no recognizable password field (password / passwordHash / hashedPassword).");
    console.warn("   Credentials will still be listed, but login may not work unless your model stores them.");
  }

  console.log(`🍽️  Creating ${NUM_RESTAURANTS} restaurants…`);
  const createdRestaurants = [];
  const creds = [];
  let coverIndex = 0;

  for (let i = 0; i < NUM_RESTAURANTS; i++){
    const cuisine = pick(cuisines);
    const name = makeRestaurantName();
    const cover = RESTAURANT_UNIQUE_IMAGES[coverIndex % RESTAURANT_UNIQUE_IMAGES.length];
    coverIndex++;

    const r = await Restaurant.create({
      name,
      cuisine,
      imageUrl: cover,                 // unique cover per restaurant
      rating: Number((4.2 + rnd()*0.8).toFixed(1)),
      deliveryFee: Number(price(0.0, 4.49, 0.5).toFixed(2)),
      // etaMins removed by request
      address: randomAddress()
    });

    // ---- Credentials assignment ----
    const slug = slugify(name);
    const email = `demo+${String(i+1).padStart(2,"0")}-${slug}@bitecode.dev`;
    const passwordPlain = "Bitecode@123";

    r.email = email;

    if (passField?.type === "plain") {
      r[passField.field] = passwordPlain; // expect pre-save hook to hash
      await r.save();
    } else if (passField?.type === "hash") {
      const bcrypt = (await import("bcrypt")).default;
      r[passField.field] = await bcrypt.hash(passwordPlain, 10);
      await r.save();
    } else {
      // set anyway; may be ignored if schema is strict
      r.password = passwordPlain;
      await r.save().catch(()=>{ /* ignore if schema rejects */ });
    }

    creds.push({ index: i+1, name, email, password: passwordPlain });
    createdRestaurants.push(r);

    // ---- Menu items (11 unique + 4 shared) ----
    const uniques = [];
    while (uniques.length < UNIQUE_PER_RESTAURANT) {
      const it = cuisineItem(cuisine);
      if (!uniques.some(u => u.name === it.name)) uniques.push(it);
    }
    const shared = shuffle(sharedMenuPool.slice()).slice(0, SHARED_PER_RESTAURANT).map(sharedItemVariant);
    const menu = uniqBy([...uniques, ...shared], x => x.name).slice(0, ITEMS_PER_RESTAURANT);

    await MenuItem.insertMany(menu.map(m => ({
      restaurantId: r._id,
      name: m.name,
      description: m.description,
      price: m.price,
      imageUrl: m.imageUrl,
      isAvailable: true
    })));

    process.stdout.write(`  • ${name} (${cuisine}) — ${menu.length} items\n`);
  }

  // Output credentials
  console.log("\n🔐 Restaurant demo credentials:");
  creds.forEach(c => console.log(` ${String(c.index).padStart(2," ")}. ${c.name} → ${c.email}  /  ${c.password}`));
  await writeCredentialsCSV(creds);

  const totalItems = await MenuItem.countDocuments();
  console.log(`\n🌱 Seed complete: ${createdRestaurants.length} restaurants, ${totalItems} menu items.`);
  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
}

main().catch(err => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
