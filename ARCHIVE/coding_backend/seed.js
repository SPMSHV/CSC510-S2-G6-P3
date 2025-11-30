require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./models/Problem');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/codeeats';

async function seed() {
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  const example = {
    title: "Add Two Numbers",
    description: "Read two integers from stdin and print their sum.",
    language_id: 63, // JavaScript Node
    testCases: [
      { input: "2 3", expectedOutput: "5" },
      { input: "-5 10", expectedOutput: "5" },
      { input: "100 200", expectedOutput: "300" }
    ],
    difficulty: "easy"
  };

  // Remove if exists (so seed is idempotent)
  await Problem.deleteMany({ title: "Add Two Numbers" });
  const p = new Problem(example);
  await p.save();
  console.log('Inserted problem:', p._id);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
