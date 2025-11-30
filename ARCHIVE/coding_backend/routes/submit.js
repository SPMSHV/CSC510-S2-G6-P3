const express = require("express");
const axios = require("axios");
const router = express.Router();
const Problem = require("../models/Problem");

// POST /api/submit/:problemId
// body: { source_code }
router.post("/:problemId", async (req, res) => {
  try {
    const { source_code } = req.body;
    if (!source_code) return res.status(400).json({ error: "source_code required" });

    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const results = [];
    let allPassed = true;

    for (const test of problem.testCases) {
      // Build payload - use wait=true so Judge0 responds after execution
      const payload = {
        source_code,
        language_id: problem.language_id || 63,
        stdin: test.input
      };

      const url = `${process.env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`;

      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" }
      });

      const data = response.data;
      const stdout = data.stdout ? data.stdout : "";
      const stderr = data.stderr ? data.stderr : "";
      const userOutput = stdout.trim();
      const expected = (test.expectedOutput || "").trim();
      const passed = userOutput === expected;

      if (!passed) allPassed = false;

      results.push({
        input: test.input,
        expected,
        userOutput,
        passed,
        stderr,
        status: data.status
      });
    }

    res.json({ allPassed, results });
  } catch (err) {
    console.error("Submit error:", err.message || err);
    res.status(500).json({ error: "Error running tests", details: err.message });
  }
});

module.exports = router;
