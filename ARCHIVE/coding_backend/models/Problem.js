const mongoose = require("mongoose");

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },        // stdin string
  expectedOutput: { type: String, required: true } // expected stdout (string)
});

const ProblemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  language_id: { type: Number, default: 63 }, // default JS (Node.js) on Judge0
  testCases: [TestCaseSchema],
  difficulty: { type: String, default: "easy" }
});

module.exports = mongoose.model("Problem", ProblemSchema);
