const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");

// Create problem (admin)
router.post("/add", async (req, res) => {
  try {
    const p = new Problem(req.body);
    await p.save();
    res.json({ success: true, problem: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List problems
router.get("/", async (req, res) => {
  try {
    const problems = await Problem.find().select("-__v");
    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single problem
router.get("/:id", async (req, res) => {
  try {
    const p = await Problem.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
