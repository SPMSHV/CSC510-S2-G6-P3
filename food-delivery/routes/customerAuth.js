import express from 'express';
import bcrypt from 'bcrypt';
import CustomerAuth from '../models/CustomerAuth.js';

const router = express.Router();

//Register new customer
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, favoriteDishes, dietRequirements, address } = req.body;
    if (!name || !email || !password || !address)
      return res.status(400).json({ error: 'name, email, password, and address required' });

    const exists = await CustomerAuth.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await CustomerAuth.create({
      name,
      email,
      passwordHash,
      favoriteDishes,
      dietRequirements,
      address
    });

    //Start session
    req.session.customerId = customer._id.toString();
    req.session.customerName = customer.name;

    res.status(201).json({
      ok: true,
      message: `Welcome ${customer.name}! Registration successful.`,
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Login customer
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

    const customer = await CustomerAuth.findOne({ email });
    if (!customer) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.customerId = customer._id.toString();
    req.session.customerName = customer.name;

    res.json({
      ok: true,
      message: `Welcome back ${customer.name}!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Check session
router.get('/me', (req, res) => {
  if (!req.session.customerId)
    return res.status(401).json({ error: 'Not logged in' });

  res.json({
    ok: true,
    message: `Welcome ${req.session.customerName}!`,
    customerId: req.session.customerId
  });
});


 //Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Logged out' });
  });
});

export default router;