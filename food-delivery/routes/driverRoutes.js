// === Updated for Driver + Session ===
import express from "express";
import bcrypt from "bcrypt";
import Driver from "../models/Driver.js";
import DriverAuth from "../models/DriverAuth.js";
import Order from "../models/Order.js";

const router = express.Router();

// === Driver Registration ===
router.post("/register", async (req, res) => {
  try {
    const { fullName, address, vehicleType, vehicleNumber, licenseNumber, email, password } = req.body;

    const driver = new Driver({ fullName, address, vehicleType, vehicleNumber, licenseNumber });
    await driver.save();

    const hashed = await bcrypt.hash(password, 10);
    const auth = new DriverAuth({ email, password: hashed, driverId: driver._id });
    await auth.save();

    // res.redirect("/driver-login.html");
    res.json({ message: "Driver registered successfully" });

  } catch (err) {
    console.error("Driver Registration Error:", err);
    res.status(500).send("Error registering driver: " + err.message);
  }
});

// === Driver Login with session ===
// === Driver Login with session ===
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const auth = await DriverAuth.findOne({ email }).populate("driverId");
    if (!auth) return res.status(400).send("Driver not found");

    const match = await bcrypt.compare(password, auth.password);
    if (!match) return res.status(400).send("Invalid password");

    // Save driver info in session
    req.session.driverId = auth.driverId._id;
    req.session.driverName = auth.driverId.fullName;

    // Redirect to welcome page (session will store name)
    res.json({
      ok: true,
      message: `Welcome ${auth.driverId.fullName}!`,
      redirect: "/driver-dashboard.html"
    });


  } catch (err) {
    console.error("Driver Registration Error:", err);
    res.status(500).send("Error logging in driver: " + err.message);
  }
});

// === Middleware to check if driver is logged in ===
export const requireDriverLogin = (req, res, next) => {
  if (!req.session.driverId) return res.redirect("/driver-login.html");
  next();
};

// === Driver Logout ===
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Could not log out.");
    res.redirect("/driver-login.html");
  });
});

// === Welcome page for logged-in driver ===
router.get("/welcome", (req, res) => {
  try {
    if (!req.session.driverId) return res.redirect("/driver-login.html");

    // Render a plain HTML page with the driver’s name
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Welcome Driver</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="p-4">
        <div class="container">
          <h2>Welcome, ${req.session.driverName}</h2>
          <p>You are successfully logged in.</p>
          <a href="/driver/logout" class="btn btn-danger">Logout</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Error in /welcome route:", err);
    res.status(500).send("Something went wrong while loading the welcome page.");
  }
});

// 🗺️ GEOLOCATION: Update driver's current location
router.post("/location", async (req, res) => {
  try {
    const driverId = req.session.driverId;
    if (!driverId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: "Valid lat and lng numbers are required" });
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Update driver location
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        $set: {
          currentLocation: { lat, lng },
          lastLocationUpdate: new Date()
        }
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Update location history for all active orders assigned to this driver
    const activeOrders = await Order.find({
      driverId,
      status: { $in: ['out_for_delivery', 'ready_for_pickup'] }
    });

    // Append location to history for each active order
    for (const order of activeOrders) {
      if (!order.driverLocationHistory) {
        order.driverLocationHistory = [];
      }
      order.driverLocationHistory.push({
        lat,
        lng,
        timestamp: new Date()
      });
      await order.save();
    }

    res.json({
      ok: true,
      message: "Location updated successfully",
      location: { lat, lng },
      updatedOrders: activeOrders.length
    });
  } catch (err) {
    console.error("Error updating driver location:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
