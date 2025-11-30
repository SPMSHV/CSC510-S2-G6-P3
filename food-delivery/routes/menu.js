import express from 'express';
import MenuItem from '../models/MenuItem.js';

const router = express.Router();

//GET /api/menu
router.get('/', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ error: 'restaurantId is required' });
    const items = await MenuItem.find({ restaurantId, isAvailable: true }).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//POST /api/menu
router.post('/', async (req, res) => {
  try {
    const { name, price, restaurantId, description } = req.body;
    if (!name || !price || !restaurantId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const newItem = new MenuItem({ name, price, restaurantId, description });
    const saved = await newItem.save();
    res.status(201).json({
      message: "Menu item created successfully",
      item: saved,
    });
  } catch (err) {
    console.error("Error while creating menu item:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
