import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Middleware: ensure restaurant is logged in
function requireRestaurant(req, res, next) {
  if (!req.session.restaurantId) {
    return res.status(401).json({ error: "Not logged in as restaurant" });
  }
  next();
}

// Ensure uploads directory path matches the one used in app.js
const baseDir = path.join(process.cwd(), "uploads");

// Multer setup (with 5MB limit + JPEG/PNG filtering)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const kind = (req.body.kind || "misc").toLowerCase(); // 'restaurant' | 'dish'
    const dir = path.join(baseDir, "restaurants", kind);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${ts}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    // broader check to handle image/x-png, etc.
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Upload Route
router.post("/upload", requireRestaurant, upload.array("photos", 10), (req, res) => {
  try {
    const urls = req.files.map((f) => {
      // Normalize path separators (Windows/macOS/Linux safe)
      const rel = f.path.split("uploads")[1].replace(/^[\\/]/, "").replace(/\\/g, "/");
      return `/uploads/${rel}`;
    });
    res.json({ ok: true, urls });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Save restaurant photo to DB
router.post("/photo", requireRestaurant, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

    const restaurantId = req.session.restaurantId;
    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { imageUrl },
      { new: true }
    );

    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    res.json({ ok: true, message: "Restaurant photo updated", restaurant });
  } catch (err) {
    console.error("❌ Restaurant photo update error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Fetch dashboard data (always fresh)
router.get("/data", requireRestaurant, async (req, res) => {
  try {
    const restaurantId = req.session.restaurantId;

    const restaurant = await Restaurant.findById(restaurantId);
    const menuItems = await MenuItem.find({ restaurantId });

    // fetch orders live (no cache)
    const orders = await Order.find({ restaurantId })
      .sort({ updatedAt: -1 })
      .lean();

    console.log(
      "📦 Restaurant dashboard fetched",
      orders.length,
      "orders:",
      orders.map(o => o.status)
    );

    res.json({
      ok: true,
      restaurantName: req.session.restaurantName || "Restaurant",
      restaurantImageUrl: restaurant?.imageUrl || null,
      menuItems,
      orders,
    });
  } catch (err) {
    console.error("❌ Dashboard data error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Create menu item
router.post("/menu", requireRestaurant, async (req, res) => {
  try {
    const { name, description, price, imageUrl, isAvailable } = req.body;
    const restaurantId = req.session.restaurantId;

    const item = await MenuItem.create({
      restaurantId,
      name,
      description,
      price,
      imageUrl,
      isAvailable: typeof isAvailable === "boolean" ? isAvailable : true, // ✅ default true
    });

    res.status(201).json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set availability (idempotent)
router.patch("/menu/:id/availability", requireRestaurant, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ error: "isAvailable (boolean) is required" });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.session.restaurantId },
      { isAvailable },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });

    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit menu item
router.put("/menu/:id", requireRestaurant, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.session.restaurantId },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete menu item
router.delete("/menu/:id", requireRestaurant, async (req, res) => {
  try {
    const deleted = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.session.restaurantId,
    });
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// // Update order status
// router.put("/order/:id/status", requireRestaurant, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const order = await Order.findOneAndUpdate(
//       { _id: req.params.id, restaurantId: req.session.restaurantId },
//       { status },
//       { new: true }
//     );
//     if (!order) return res.status(404).json({ error: "Order not found" });
//     res.json({ ok: true, order });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Single unified status route
router.patch("/orders/:id/status", requireRestaurant, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    // Restrict restaurant’s allowed statuses
    const allowedStatuses = ["preparing", "ready_for_pickup", "out_for_delivery"];
    if (!allowedStatuses.includes(status)) {
      return res.status(403).json({ error: "Unauthorized status update" });
    }

    const updated = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// public fetch by restaurantId
router.get("/orders", async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId is required" });
    }

    const orders = await Order.find({ restaurantId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
