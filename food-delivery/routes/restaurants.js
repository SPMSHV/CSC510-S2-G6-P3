import express from 'express';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';

const router = express.Router();

// GET /api/restaurants
// Enhanced search with filters: ?q=search&cuisine=italian&minRating=4&sortBy=rating|name|deliveryFee
router.get('/', async (req, res) => {
  try {
    const { q, cuisine, minRating, sortBy = 'rating' } = req.query;
    
    // Build filter
    const filter = {};
    
    // Text search in name
    if (q?.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { cuisine: { $regex: q.trim(), $options: 'i' } }
      ];
    }
    
    // Cuisine filter
    if (cuisine?.trim()) {
      filter.cuisine = { $regex: cuisine.trim(), $options: 'i' };
    }
    
    // Minimum rating filter
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }
    
    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'name':
        sort = { name: 1 };
        break;
      case 'deliveryFee':
        sort = { deliveryFee: 1 };
        break;
      case 'etaMins':
        sort = { etaMins: 1 };
        break;
      case 'rating':
      default:
        sort = { rating: -1 };
    }
    
    const restaurants = await Restaurant.find(filter).sort(sort);
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restaurants/search/menu
// Search menu items across restaurants
router.get('/search/menu', async (req, res) => {
  try {
    const { q, restaurantId, maxPrice, minPrice } = req.query;
    
    if (!q?.trim()) {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }
    
    const filter = {
      name: { $regex: q.trim(), $options: 'i' }
    };
    
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    }
    
    if (minPrice) {
      filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
    }
    
    if (maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
    }
    
    const menuItems = await MenuItem.find(filter)
      .populate('restaurantId', 'name cuisine rating')
      .limit(50)
      .lean();
    
    res.json(menuItems);
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
