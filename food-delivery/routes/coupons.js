import express from "express";
import Coupon from "../models/Coupon.js";

const router = express.Router();

// GET /api/coupons
router.get("/", async (req, res) => {
    const userId = req.session.customerId;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const coupons = await Coupon.find({
        userId,
        applied: false,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json(coupons);
});

router.post("/validate", async (req, res) => {
    try {
        const userId = req.session.customerId;
        if (!userId) return res.status(401).json({ error: "Not logged in" });

        const { code } = req.body || {};
        if (!code) return res.status(400).json({ error: "Missing coupon code" });

        const coupon = await Coupon.findOne({
            userId,
            code,
            applied: false,
            expiresAt: { $gt: new Date() },
        });

        if (!coupon) return res.status(404).json({ error: "Invalid or expired coupon" });
        res.json({ ok: true, coupon });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


export default router;
