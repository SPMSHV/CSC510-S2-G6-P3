import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import MongoStore from "connect-mongo";
import compression from 'compression';


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTestEnv = process.env.NODE_ENV === "test";

// 🚀 PERFORMANCE: Enable response compression
if (!isTestEnv) {
  app.use(compression());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:4000"], credentials: true }));

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';



app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: isTestEnv
      ? undefined // ✅ Use MemoryStore during tests
      : MongoStore.create({
          mongoUrl:
            process.env.MONGODB_URI ||
            "mongodb://127.0.0.1:27017/food_delivery_app",
          collectionName: "sessions",
        }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);


// Routers
import restaurantAuthRouter from './routes/restaurantAuth.js';
import driverRoutes from "./routes/driverRoutes.js";
import restaurantRouter from './routes/restaurants.js';
import menuRouter from './routes/menu.js';
import cartRouter from './routes/cart.js';
import orderRouter from './routes/orders.js';
import customerAuthRouter from './routes/customerAuth.js';
import restaurantDashboardRouter from './routes/restaurantDashboard.js';
import driverDashboardRoutes from './routes/driverDashboard.js';
import paymentRouter from './routes/payments.js';
import challengeRoutes from "./routes/challenges.js";
import couponsRouter from "./routes/coupons.js";
import chessRoutes from "./routes/chess.js";
import refundsRouter from "./routes/refunds.js";


dotenv.config();

app.use(morgan('dev'));

app.options('/api/orders', cors({ origin: true, credentials: true }));
app.options('/api/orders/:id', cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------
// Serve uploaded images from /uploads directory
// -----------------------------------------------

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Make /uploads accessible publicly (for restaurant/dish photos)
app.use("/uploads", express.static(uploadsDir));
// -----------------------------------------------

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';
const PORT = process.env.PORT || 3000;

mongoose.set('strictQuery', true);
if (process.env.NODE_ENV !== 'test') {
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
}



// API routes
app.use('/api/restaurants', restaurantRouter);
app.use('/api/menu', menuRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);

app.use('/api/restaurant-auth', restaurantAuthRouter);
app.use("/api/driver", driverRoutes);
app.use('/api/customer-auth', customerAuthRouter);
app.use('/api/restaurant-dashboard', restaurantDashboardRouter);

app.use('/api/driver', driverDashboardRoutes);
app.use('/api/payments', paymentRouter);
app.use("/api/challenges", challengeRoutes);
app.use("/api/coupons", couponsRouter);
app.use("/api/chess", chessRoutes);
app.use("/api/refunds", refundsRouter);



console.log("✅ /api/orders route registered");

// 404 handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});



// Fallback for SPA-style links (optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const shouldListen =
  process.env.NODE_ENV !== 'test' || process.env.PLAYWRIGHT === '1';

if (shouldListen) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;