import { Router } from "express";
import { hash, compare } from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js"
import Driver from "../models/Driver.js"
import Customer from "../models/Customer.js"
const router = Router();
// Register
router.post("/register/customer", async (req, res) => {
  try {
    const { name, email, address, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role:"customer" });
    await newUser.save();
    await Customer.create({
      loginId: newUser._id,
      name,
      address
    })
    res.json({ message: "User registered successfully" });
  } catch (error) {
     // this prints the full error
    res.status(500).json({ error: error.message });
    console.error("Register error:", error);
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jsonwebtoken.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token, role: user.role });
  } catch (error) {
    
    res.status(500).json({ error: error.message });
    console.error("Register error:", error);
  }
});

router.post("/register/driver", async (req, res) => {
  try {
    const { name, email, password, phone, vehicleType, vehicleNumber, licenseNumber } = req.body;

    // Compute capacity based on vehicle type
    let vehicleCapacity = 1;
    if (vehicleType === "scooter") vehicleCapacity = 2;
    else if (vehicleType === "car") vehicleCapacity = 4;

    const hashed = await hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: "driver" });

    await Driver.create({
      loginId: user._id,
      name,
      phone,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      vehicleCapacity
    });

    res.json({ message: "Driver registered successfully" });
  } catch (err) {
    
    res.status(500).json({ error: err.message });
    console.error("Restaurant registration error:", err);
  }
});

router.post("/register/restaurant", async (req, res) => {
  try {
    const { restaurantName, email, password, phone, address, cuisine } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create the central User document
    const user = await User.create({
      name:restaurantName,
      email,
      password: hashedPassword,
      role: "restaurant"
    });

    // Create the Restaurant profile
    await Restaurant.create({
      loginId: user._id,
      restaurantName,
      phone,
      address,
      cuisine: cuisine || [],
      menu: [],       // Initialize empty menu
      ratings: 5,     // Default rating
      isOpen: true,   // Default open status
      // orders: []    // Empty order history
    });

    res.json({ message: "Restaurant registered successfully" });

  } catch (error) {
    
    res.status(500).json({ error: error.message });
    console.error("Restaurant registration error:", error);
  }
});

export default router;
