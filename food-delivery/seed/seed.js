// scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import User from "../models/User.js";
import RestaurantAdmin from "../models/RestaurantAdmin.js";
import CustomerAuth from "../models/CustomerAuth.js";
import UserPerformance from "../models/UserPerformance.js";
import bcrypt from "bcrypt";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food_delivery_app";
const CLEAR_USERS = /^true$/i.test(process.env.CLEAR_USERS || "false");
// Use fixed seed for deterministic results (can be overridden via env)
let SEED = process.env.SEED ? Number(process.env.SEED) : 12345;

function rnd(){ if(SEED==null) return Math.random(); SEED=(SEED*1664525+1013904223)%4294967296; return SEED/4294967296; }
const pick = (arr)=>arr[Math.floor(rnd()*arr.length)];
const shuffle = (arr)=>{ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; };
const uniqBy = (arr, keyFn)=>{ const s=new Set(); return arr.filter(x=>{const k=keyFn(x); if(s.has(k)) return false; s.add(k); return true;}); };
const price = (min,max,step=0.5)=> Math.round(((min + rnd()*(max-min))/step))*step;

const NUM_RESTAURANTS = 5;
const ITEMS_PER_RESTAURANT = 12;
const SHARED_PER_RESTAURANT = 2;
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
  { name:"Water Bottle", description:"Still water 500ml", base:[0.99,1.49], imageUrl:"https://images.unsplash.com/photo-1616118132534-381148898bb4?q=80&w=2564&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }
];

// Predefined restaurants with specific images and details for deterministic seeding
const PREDEFINED_RESTAURANTS = [
  {
    name: "Spice Garden",
    cuisine: "Indian",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop",
    address: "123 Main St, Raleigh, NC 27601",
    rating: 4.5,
    deliveryFee: 2.99,
    menuItems: [
      { name: "Butter Chicken", description: "Creamy tomato-based curry with tender chicken", price: 14.99, imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=1200&auto=format&fit=crop" },
      { name: "Paneer Tikka", description: "Grilled cottage cheese with spices", price: 12.99, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Garlic Naan", description: "Fresh baked bread with garlic and herbs", price: 3.99, imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200&auto=format&fit=crop" },
      { name: "Dal Makhani", description: "Creamy black lentils cooked overnight", price: 11.99, imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1200&auto=format&fit=crop" },
      { name: "Chicken Biryani", description: "Fragrant basmati rice with spiced chicken", price: 15.99, imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=1200&auto=format&fit=crop" },
      { name: "Aloo Paratha", description: "Stuffed flatbread with spiced potatoes", price: 5.99, imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1200&auto=format&fit=crop" },
      { name: "Chole Bhature", description: "Spiced chickpeas with fried bread", price: 8.99, imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1200&auto=format&fit=crop" },
      { name: "Rogan Josh", description: "Aromatic lamb curry from Kashmir", price: 16.99, imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=1200&auto=format&fit=crop" },
      { name: "Palak Paneer", description: "Spinach curry with cottage cheese", price: 12.49, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Gulab Jamun", description: "Sweet milk dumplings in rose syrup", price: 4.99, imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Fries", description: "Crispy golden fries", price: 3.99, imageUrl: "https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?q=80&w=800&auto=format&fit=crop" },
      { name: "Coke", description: "Chilled soft drink", price: 2.49, imageUrl: "https://images.unsplash.com/photo-1541976076758-347942db1974?q=80&w=800&auto=format&fit=crop" }
    ]
  },
  {
    name: "Golden Bistro",
    cuisine: "Italian",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop",
    address: "456 Oak Ave, Cary, NC 27602",
    rating: 4.7,
    deliveryFee: 3.49,
    menuItems: [
      { name: "Margherita Pizza", description: "Classic pizza with tomato, mozzarella, and basil", price: 13.99, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1200&auto=format&fit=crop" },
      { name: "Pasta Alfredo", description: "Creamy fettuccine with parmesan sauce", price: 14.99, imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Lasagna", description: "Layered pasta with meat and cheese", price: 16.99, imageUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=1200&auto=format&fit=crop" },
      { name: "Bruschetta", description: "Toasted bread with tomatoes and basil", price: 8.99, imageUrl: "https://images.unsplash.com/photo-1572441713132-51c75654db73?q=80&w=1200&auto=format&fit=crop" },
      { name: "Carbonara", description: "Creamy pasta with bacon and eggs", price: 15.49, imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Four Cheese Pizza", description: "Mozzarella, gorgonzola, parmesan, and fontina", price: 16.99, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1200&auto=format&fit=crop" },
      { name: "Calzone", description: "Folded pizza with ricotta and mozzarella", price: 14.49, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1200&auto=format&fit=crop" },
      { name: "Pesto Gnocchi", description: "Potato dumplings with basil pesto", price: 15.99, imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Risotto Funghi", description: "Creamy rice with wild mushrooms", price: 17.99, imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Tiramisu", description: "Classic Italian dessert with coffee", price: 6.99, imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Garlic Bread", description: "Toasted, buttery, garlicky", price: 4.99, imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" },
      { name: "Iced Tea", description: "Fresh brewed", price: 2.49, imageUrl: "https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=800&auto=format&fit=crop" }
    ]
  },
  {
    name: "Royal Sushi",
    cuisine: "Japanese",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop",
    address: "789 Maple Rd, Durham, NC 27603",
    rating: 4.8,
    deliveryFee: 4.49,
    menuItems: [
      { name: "California Roll", description: "Crab, avocado, and cucumber", price: 8.99, imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=1200&auto=format&fit=crop" },
      { name: "Salmon Nigiri", description: "Fresh salmon over seasoned rice", price: 12.99, imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=1200&auto=format&fit=crop" },
      { name: "Miso Soup", description: "Traditional soybean soup", price: 3.99, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Ramen Tonkotsu", description: "Rich pork bone broth ramen", price: 14.99, imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=1200&auto=format&fit=crop" },
      { name: "Tempura Udon", description: "Wheat noodles with tempura", price: 13.99, imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=1200&auto=format&fit=crop" },
      { name: "Chicken Katsu", description: "Breaded and fried chicken cutlet", price: 12.49, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Spicy Tuna Roll", description: "Tuna with spicy mayo", price: 9.99, imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=1200&auto=format&fit=crop" },
      { name: "Sashimi Platter", description: "Assorted fresh raw fish", price: 18.99, imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=1200&auto=format&fit=crop" },
      { name: "Gyoza", description: "Pan-fried pork dumplings", price: 7.99, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Yakitori", description: "Grilled chicken skewers", price: 10.99, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "House Salad", description: "Greens, tomatoes, vinaigrette", price: 5.99, imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop" },
      { name: "Water Bottle", description: "Still water 500ml", price: 1.49, imageUrl: "https://images.unsplash.com/photo-1616118132534-381148898bb4?q=80&w=2564&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }
    ]
  },
  {
    name: "Crave Kitchen",
    cuisine: "Mexican",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop",
    address: "321 Cedar Ln, Morrisville, NC 27604",
    rating: 4.6,
    deliveryFee: 2.49,
    menuItems: [
      { name: "Tacos al Pastor", description: "Marinated pork with pineapple", price: 11.99, imageUrl: "https://images.unsplash.com/photo-1565299585323-38174c1a3e0e?q=80&w=1200&auto=format&fit=crop" },
      { name: "Chicken Quesadilla", description: "Grilled tortilla with cheese and chicken", price: 10.99, imageUrl: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Guacamole", description: "Fresh avocado dip with chips", price: 7.99, imageUrl: "https://images.unsplash.com/photo-1588168333984-ffbc16b89c55?q=80&w=1200&auto=format&fit=crop" },
      { name: "Nachos Supreme", description: "Loaded nachos with all toppings", price: 12.99, imageUrl: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?q=80&w=1200&auto=format&fit=crop" },
      { name: "Burrito Bowl", description: "Rice, beans, meat, and veggies", price: 11.49, imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=1200&auto=format&fit=crop" },
      { name: "Carnitas Tacos", description: "Slow-cooked pork tacos", price: 12.99, imageUrl: "https://images.unsplash.com/photo-1565299585323-38174c1a3e0e?q=80&w=1200&auto=format&fit=crop" },
      { name: "Churros", description: "Fried dough with cinnamon sugar", price: 5.99, imageUrl: "https://images.unsplash.com/photo-1581873372796-635b67ca2008?q=80&w=1200&auto=format&fit=crop" },
      { name: "Elote", description: "Mexican street corn", price: 6.99, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Fajitas", description: "Sizzling peppers, onions, and meat", price: 15.99, imageUrl: "https://images.unsplash.com/photo-1565299585323-38174c1a3e0e?q=80&w=1200&auto=format&fit=crop" },
      { name: "Salsa Verde Enchiladas", description: "Chicken enchiladas with green sauce", price: 13.99, imageUrl: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?q=80&w=1200&auto=format&fit=crop" },
      { name: "Fries", description: "Crispy golden fries", price: 3.99, imageUrl: "https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?q=80&w=800&auto=format&fit=crop" },
      { name: "Coke", description: "Chilled soft drink", price: 2.49, imageUrl: "https://images.unsplash.com/photo-1541976076758-347942db1974?q=80&w=800&auto=format&fit=crop" }
    ]
  },
  {
    name: "Epic Table",
    cuisine: "American",
    imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1600&auto=format&fit=crop",
    address: "654 Pine St, Apex, NC 27605",
    rating: 4.4,
    deliveryFee: 3.99,
    menuItems: [
      { name: "Cheeseburger", description: "Classic beef patty with cheese", price: 11.99, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop" },
      { name: "BBQ Ribs", description: "Slow-smoked ribs with BBQ sauce", price: 18.99, imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop" },
      { name: "Fried Chicken", description: "Crispy buttermilk fried chicken", price: 13.99, imageUrl: "https://images.unsplash.com/photo-1626087921236-3b3466b5a77b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Mac & Cheese", description: "Creamy macaroni and cheese", price: 8.99, imageUrl: "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?q=80&w=1200&auto=format&fit=crop" },
      { name: "Caesar Salad", description: "Romaine with caesar dressing", price: 9.99, imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=1200&auto=format&fit=crop" },
      { name: "Buffalo Wings", description: "Spicy chicken wings with blue cheese", price: 12.99, imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?q=80&w=1200&auto=format&fit=crop" },
      { name: "Club Sandwich", description: "Triple-decker with turkey and bacon", price: 10.99, imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop" },
      { name: "Onion Rings", description: "Crispy battered onion rings", price: 6.99, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1200&auto=format&fit=crop" },
      { name: "Apple Pie", description: "Homemade apple pie with vanilla ice cream", price: 6.99, imageUrl: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?q=80&w=1200&auto=format&fit=crop" },
      { name: "Chocolate Shake", description: "Rich chocolate milkshake", price: 5.99, imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1200&auto=format&fit=crop" },
      { name: "Garlic Bread", description: "Toasted, buttery, garlicky", price: 4.99, imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" },
      { name: "Iced Tea", description: "Fresh brewed", price: 2.49, imageUrl: "https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=800&auto=format&fit=crop" }
    ]
  }
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


async function main(){
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected:", MONGODB_URI);

  console.log("🧹 Clearing restaurants & menu items…");
  await Promise.all([Restaurant.deleteMany({}), MenuItem.deleteMany({})]);

  if (CLEAR_USERS) {
    console.log("🧹 CLEAR_USERS=true → also clearing users…");
    await User.deleteMany({});
    await CustomerAuth.deleteMany({});
    await UserPerformance.deleteMany({});
  } else {
    console.log("🔒 Users left intact (set CLEAR_USERS=true to wipe).");
  }

  if (!await User.findOne({ email: "demo@example.com" })) {
    await User.create({_id: "demo-user-1", name: "Demo User", email: "demo@example.com" });
    console.log("👤 Created demo user demo@example.com");
  }

  console.log("🧹 Clearing customer auths and performance data…");
  await CustomerAuth.deleteMany({});
  await UserPerformance.deleteMany({});

  console.log("🧹 Clearing restaurant admins…");
  await RestaurantAdmin.deleteMany({});

  console.log(`🍽️  Creating ${NUM_RESTAURANTS} restaurants…`);
  const createdRestaurants = [];

  for (let i = 0; i < PREDEFINED_RESTAURANTS.length; i++){
    const restaurantData = PREDEFINED_RESTAURANTS[i];

    const r = await Restaurant.create({
      name: restaurantData.name,
      cuisine: restaurantData.cuisine,
      imageUrl: restaurantData.imageUrl,
      rating: restaurantData.rating,
      deliveryFee: restaurantData.deliveryFee,
      address: restaurantData.address
    });

    // ---- Create RestaurantAdmin ----
    const slug = slugify(restaurantData.name);
    const email = `demo+${String(i+1).padStart(2,"0")}-${slug}@bitecode.dev`;
    const passwordPlain = "Bitecode@123";
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    await RestaurantAdmin.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      restaurantId: r._id
    });

    createdRestaurants.push(r);

    // ---- Menu items from predefined data ----
    await MenuItem.insertMany(restaurantData.menuItems.map(m => ({
      restaurantId: r._id,
      name: m.name,
      description: m.description,
      price: m.price,
      imageUrl: m.imageUrl,
      isAvailable: true
    })));

    process.stdout.write(`  • ${restaurantData.name} (${restaurantData.cuisine}) — ${restaurantData.menuItems.length} items\n`);
  }

  // Query actual RestaurantAdmin records from database
  const actualAdmins = await RestaurantAdmin.find({})
    .populate('restaurantId', 'name')
    .sort({ email: 1 })
    .lean();

  const actualCreds = actualAdmins.map((admin, idx) => ({
    index: idx + 1,
    name: admin.restaurantId.name,
    email: admin.email,
    password: "Bitecode@123"
  }));

  // Output credentials
  console.log("\n🔐 Restaurant demo credentials:");
  actualCreds.forEach(c => console.log(` ${String(c.index).padStart(2," ")}. ${c.name} → ${c.email}  /  ${c.password}`));
  await writeCredentialsCSV(actualCreds);

  // Create demo users (experienced and inexperienced)
  console.log("\n👤 Creating demo users…");
  const demoUsers = [
    {
      name: "Experienced User",
      email: "experienced@demo.com",
      password: "Demo@123",
      address: "100 Main St, Raleigh, NC 27601",
      performance: {
        totalOrders: 45,
        totalChallenges: 30,
        completedChallenges: 28,
        averageSolveTime: 120, // 2 minutes
        lastDifficulty: "hard"
      }
    },
    {
      name: "Inexperienced User",
      email: "inexperienced@demo.com",
      password: "Demo@123",
      address: "200 Oak Ave, Cary, NC 27602",
      performance: {
        totalOrders: 3,
        totalChallenges: 5,
        completedChallenges: 2,
        averageSolveTime: 300, // 5 minutes
        lastDifficulty: "easy"
      }
    }
  ];

  const createdUsers = [];
  for (const userData of demoUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const customer = await CustomerAuth.create({
      name: userData.name,
      email: userData.email,
      passwordHash,
      address: userData.address
    });

    await UserPerformance.create({
      userId: customer._id,
      totalOrders: userData.performance.totalOrders,
      totalChallenges: userData.performance.totalChallenges,
      completedChallenges: userData.performance.completedChallenges,
      averageSolveTime: userData.performance.averageSolveTime,
      lastDifficulty: userData.performance.lastDifficulty
    });

    createdUsers.push({
      name: userData.name,
      email: userData.email,
      password: userData.password
    });

    process.stdout.write(`  • ${userData.name} → ${userData.email}\n`);
  }

  // Output user credentials
  console.log("\n🔐 User demo credentials:");
  createdUsers.forEach((u, idx) => {
    const experience = u.email.includes("experienced") ? "Experienced" : "Inexperienced";
    console.log(` ${String(idx + 1).padStart(2," ")}. ${u.name} (${experience}) → ${u.email}  /  ${u.password}`);
  });

  const totalItems = await MenuItem.countDocuments();
  console.log(`\n🌱 Seed complete: ${createdRestaurants.length} restaurants, ${totalItems} menu items, ${createdUsers.length} demo users.`);
  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
}

main().catch(err => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
