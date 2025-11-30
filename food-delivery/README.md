# 🍔 BiteCode – Food Delivery Module

The **Food Delivery** component of **BiteCode** is a MERN-based web app that powers the “Order” side of the platform.  
It allows users to browse restaurants, add items to the cart, and place orders — while integrating with the coding challenge system that rewards users for solving problems before their food arrives.

---

## 🚀 Overview

This submodule serves as the **restaurant and order management system** for BiteCode.  
It provides APIs and a Bootstrap-powered frontend for core food delivery functionality, including menu browsing, cart management, and checkout.

When connected with the Judge0 frontend, the order experience becomes interactive — users can solve coding problems to **unlock discounts up to $20** on their current order.

---

## ✨ Features

- **Restaurant discovery & search** — list, filter, view details and menus
- **Cart & checkout** — add/update/remove items, create orders
- **Auth flows** — Customer & Restaurant login/register, session-backed
- **Restaurant dashboard** — manage menu, view orders (status filters, updates)
- **Driver flows** — accept/pickup/deliver, basic payouts endpoints
- **Coupons & rewards** — promo application, coding-challenge discounts
- **Static client** — Bootstrap pages in `/public` (customer/restaurant/driver)
- **Testable-by-default** — `mongodb-memory-server` harness, jsdom UI tests
- **Seeding** — one-command demo data + **stable demo credentials** CSV

---

## 🧰 Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local) or MongoDB Atlas URI

---

## 🧑‍💻 Setup Instructions

1. **Open the project** in VS Code or terminal.
2. Copy `.env.sample` → `.env` and update the database connection if needed.  
   Default:  
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/food_delivery_app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Seed the database with sample data:
   ```bash
   npm run seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Visit the app in your browser:  
   👉 http://localhost:3000

---

## 📁 Project Structure

```
food-delivery/
├─ config/
│  └─ rewards.js
├─ models/
│  ├─ CartItem.js, CustomerAuth.js, Driver.js, DriverAuth.js
│  ├─ MenuItem.js, Order.js, Restaurant.js, RestaurantAdmin.js, User.js
│  └─ ChallengeSession.js, Coupon.js
├─ public/                # Bootstrap-based client (HTML/CSS/JS)
│  ├─ index.html, restaurant.html, cart.html, orders.html
│  ├─ customer-login.html, restaurant-login.html, restaurant-welcome.html
│  └─ assets/ ... (images, css, js)
├─ routes/                # Express API routers
│  ├─ restaurants.js, menu.js, cart.js, orders.js, payments.js
│  ├─ restaurantAuth.js, customerAuth.js
│  ├─ restaurantDashboard.js, driverDashboard.js, driverRoutes.js
│  ├─ coupons.js, challenges.js
│  └─ README.md
├─ seed/                  # Data seeders + demo credentials
│  ├─ seed.js, seed_admins.js
│  ├─ seed_demo6.js, seed_demo6_admins.js
│  └─ seeded_restaurant_credentials.csv
├─ tests/                 # Jest unit/integration + jsdom UI tests
│  ├─ customer/, restaurant/, driver/, coupons/, payments/
│  ├─ frontend/ (jsdom DOM/UI tests)
│  ├─ e2e/ (Playwright specs)
│  └─ helpers/testUtils.js (mongodb-memory-server harness)
├─ uploads/               # Uploaded images (multer)
├─ server.js              # Express app bootstrap (sessions, routes, static)
├─ jest.config.mjs        # Node env tests
├─ jest.config.frontend.mjs  # jsdom tests
├─ jest.setup.frontend.js
├─ .env.sample            # Environment template
└─ package.json

---

## 🔧 Environment Setup

1. **Prereqs**
   - Node.js 20.x, npm 10+
   - MongoDB (local) or MongoDB Atlas

2. **Configure env**
   ```bash
   cp .env.sample .env
   # edit as needed
   ```
   Key vars:
   - `MONGODB_URI` (local default: `mongodb://127.0.0.1:27017/food_delivery_app`)
   - `SESSION_SECRET` (long random string)
   - `PORT` (default `3000`)
   - `JUDGE0_UI_URL` if using coding-rewards UI
   - `CHALLENGE_JWT_SECRET`

3. **Install**
   ```bash
   npm ci
   ```

4. **Seed (optional but recommended)**
   ```bash
   npm run seed         # base restaurants/menus/users
   npm run seed:admins  # admin/demo restaurant accounts
   # or demo-6 set:
   npm run seed:demo6
   npm run seed:demo6:admins
   ```
   Stable credentials are written to: `seed/seeded_restaurant_credentials.csv` (email/password per demo restaurant).

---

## ▶️ Development Setup

```bash
# start dev server (HTTP + static client at /public)
npm run dev
# or
npm start
```

- API base: `http://localhost:$PORT/api`
- Static client: `http://localhost:$PORT/`
- Sessions: `express-session` + cookie (SameSite=Lax, httpOnly)
- CORS: `http://localhost:3000` and `http://localhost:4000` allowed by default

**Key NPM scripts** (see `package.json`):
- `dev`, `start` — run Express server
- `seed`, `seed:admins`, `seed:demo6`, `seed:demo6:admins` — data seeders
- `test` — Jest node tests (Supertest, in-memory Mongo)
- `test:fe` — jsdom tests for UI
- `test:e2e` — Playwright specs

---

## 🧪 Testing

**Unit/Integration (Jest + Supertest)**  
- Configuration: `jest.config.mjs`  
- Harness: `tests/helpers/testUtils.js` (spins up `mongodb-memory-server`, mounts `server.js`, and returns a `supertest` agent).  
  ```

**Frontend DOM/UI (Jest + jsdom)**  
- Configuration: `jest.config.frontend.mjs` + `jest.setup.frontend.js`  
- Targets pages under `/public` (e.g., navbar links, cart UI behaviors).

**End-to-end (Playwright)**  
- Location: `tests/e2e/`
- Run locally:
  ```bash
  npm run test:e2e

---

## 🧰 Technology Stack

- **Backend**: Node.js, Express, Mongoose, express-session, connect-mongo
- **Database**: MongoDB (local/Atlas)
- **Auth/Security**: bcrypt, JWT (for challenge flows), CORS
- **Client**: Static Bootstrap pages in `/public` (HTML/CSS/JS)
- **Payments/Promos**: placeholder endpoints + coupons/rewards map (`config/rewards.js`)
- **Testing**: Jest, Supertest, mongodb-memory-server, jsdom; Playwright for E2E
- **Tooling**: cross-env, morgan, multer (uploads), dotenv

---

## 🔌 Key API Endpoints (sample)

- `GET /api/restaurants` — list/search restaurants  
- `GET /api/restaurants/:id` — details + menu  
- `POST /api/restaurant-auth/register|login|logout`, `GET /api/restaurant-auth/me`  
- `POST /api/customer-auth/register|login|logout`, `GET /api/customer-auth/me`  
- `GET/POST/PATCH /api/restaurant-dashboard/...` (menu + orders management)  
- `POST /api/cart`, `PATCH /api/cart/:id`, `DELETE /api/cart/:id`  
- `POST /api/orders` — create order; `GET /api/orders?status=...` — filter history  
- `POST /api/coupons/apply` — apply coupon to cart/order  
- `GET /api/driver/orders/new|pending`, `PATCH /api/driver/orders/accept/:id|delivered/:id`

> See the `routes/` directory for full handlers and tests under `tests/` for expected behaviors.

---

## 🔐 Demo Logins

After running seeders, open `seed/seeded_restaurant_credentials.csv` for restaurant demo emails/passwords. This file is kept constant by the seeders to support automated tests and demos.

---

## 🧭 Local Development Tips

- Use Chrome DevTools **Network** tab to inspect API requests from `/public` pages.
- Keep Playwright E2E independent of Jest by ignoring `tests/e2e` in `jest.config.mjs` (already configured).

---

## 🧯 Troubleshooting

- **Port busy**: change `PORT` in `.env` or stop the previous server.
- **Mongo not found**: ensure `MONGODB_URI` is reachable; for Jest runs we auto-start an in-memory Mongo.
- **CORS errors**: adjust `cors({ origin: [...] })` in `server.js`.
- **Session issues in tests**: in `NODE_ENV=test` MemoryStore is used (no external Mongo needed).

---

## 💡 Notes

- MongoDB must be running locally or accessible through the connection URI.  
- The frontend and backend run under the same origin — no CORS config needed.  
- Image placeholders are sourced from Unsplash; you can replace them with local assets.  
- For gamified functionality (discounts via coding), integrate with the **Judge0 frontend**.

---

## 🧾 License

This submodule is part of the **[BiteCode Platform](../README.md)**  
and is licensed under the **[MIT License](../LICENSE)**.

---

✅ *Order. Code. Earn. Every bite makes you smarter.*
