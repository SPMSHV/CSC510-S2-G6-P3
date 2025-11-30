import express from "express";
const router = express.Router();

// Example route (you can remove or expand later)
router.get("/", (req, res) => {
  res.send("Order route works!");
});

export default router;
