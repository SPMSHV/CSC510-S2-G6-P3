import express from "express";
import CartItem from "../models/CartItem.js";
import MenuItem from "../models/MenuItem.js";

const router = express.Router();

// ✅ GET /api/cart → get all cart items for the logged-in customer
router.get("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ message: "Not logged in" });

    // populate menuItemId and its restaurantId
    const cart = await CartItem.find({ userId: customerId })
      .populate({
        path: "menuItemId",
        populate: { path: "restaurantId" },
      })
      .lean();

    // decorate
    const detailedCart = cart.map(ci => {
      const item = ci.menuItemId || {};
      const restaurant = item.restaurantId || {};

      return {
        _id: ci._id,
        quantity: ci.quantity,
        menuItemId: {
          _id: item._id,
          name: item.name || "Unknown Item",
          price: item.price || 0,
          imageUrl: item.imageUrl || null,
          isAvailable: item.isAvailable ?? false,
          restaurantId: {
            _id: restaurant._id,
            name: restaurant.name || "Restaurant",
            deliveryFee: restaurant.deliveryFee ?? 0,
            etaMins: restaurant.etaMins ?? 30,
          },
        },
      };
    });

    res.json(detailedCart);
  } catch (err) {
    console.error("❌ Error loading cart:", err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ POST /api/cart  → add or update a cart item
// body: { menuItemId, restaurantId, quantity }
router.post("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    const { menuItemId, restaurantId, quantity = 1 } = req.body;
    if (!menuItemId || !restaurantId)
      return res.status(400).json({ error: "menuItemId and restaurantId required" });

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

    // Upsert (insert or increment) the cart item
    const item = await CartItem.findOneAndUpdate(
      { userId: customerId, menuItemId, restaurantId },
      { $inc: { quantity: Number(quantity) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH /api/cart/:id  → update quantity
router.patch("/:id", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ error: "quantity required" });

    if (quantity < 1) {
      await CartItem.findOneAndDelete({ _id: req.params.id, userId: customerId });
      return res.json({ ok: true, deleted: true });
    }

    const item = await CartItem.findOneAndUpdate(
      { _id: req.params.id, userId: customerId },
      { $set: { quantity } },
      { new: true }
    );

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /api/cart/:id  → remove one cart item
router.delete("/:id", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    await CartItem.findOneAndDelete({ _id: req.params.id, userId: customerId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /api/cart  → clear all cart items for customer
router.delete("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    await CartItem.deleteMany({ userId: customerId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
