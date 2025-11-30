import express from 'express';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();

// GET /api/restaurants
router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
    const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
