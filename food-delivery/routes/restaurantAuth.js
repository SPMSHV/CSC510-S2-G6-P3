import express from 'express';
import bcrypt from 'bcrypt';
import RestaurantAdmin from '../models/RestaurantAdmin.js';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();
const norm = (e) => (e || '').trim().toLowerCase();
//Register new restaurant + admin
router.post('/register', async (req, res) => {
  try {
    let { name, cuisine, email, password, address } = req.body || {};
    if (!name || !cuisine || !email || !password || !address)
      return res.status(400).json({ error: 'name, cuisine, email, password and address required' });
    const e = norm(email);
    const exists = await RestaurantAdmin.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const restaurant = await Restaurant.create({
      name,
      cuisine,
      rating: 4.5,
      deliveryFee: 0,
      etaMins: 30,
      address
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await RestaurantAdmin.create({ email, passwordHash, restaurantId: restaurant._id });

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.adminId = String(admin._id);
      req.session.restaurantId = String(restaurant._id);
      req.session.restaurantName = restaurant.name;

    res.status(201).json({
      ok: true,
      message: `Welcome ${restaurant.name}! Registration successful.`,
      restaurant: { id: restaurant._id, name: restaurant.name, cuisine },
      admin: { email:e}
    });
  });
  } catch (err) {
    console.error("❌ Restaurant Registration Error:", err);
    res.status(500).json({ error: err.message });
  }
});
//Login existing restaurant admin
router.post('/login', async (req, res) => {
  try {
    const email = norm(req.body?.email);
    const password = req.body?.password || '';
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

    const admin = await RestaurantAdmin.findOne({ email }).populate('restaurantId');
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.adminId = String(admin._id);
      req.session.restaurantId = String(admin.restaurantId._id);
      req.session.restaurantName = admin.restaurantId.name;
      // console.log("✅ Login session set:", req.session);
    res.json({
      ok: true,
      message: `Welcome ${admin.restaurantId.name}!`,
      restaurant: { name: admin.restaurantId.name, cuisine: admin.restaurantId.cuisine }
    });
  });
  } catch (err) {
    
    console.error('❌ Restaurant Login Error:', err);
    res.status(500).json({ error: err.message });
  }
});
//Check session
router.get('/me', (req, res) => {
  if (!req.session.adminId)
    return res.status(401).json({ error: 'Not logged in' });
  res.json({
    ok: true,
    message: `Welcome ${req.session.restaurantName}!`,
    restaurantId: req.session.restaurantId
  });
});
//Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Logged out' });
  });
});

export default router;
