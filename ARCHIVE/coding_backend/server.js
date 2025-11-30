require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const problemsRouter = require("./routes/problems");
const submitRouter = require("./routes/submit");

const app = express();
app.use(cors());
app.use(express.json());

// connect to MongoDB
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/codeeats";
//mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
 // .then(() => console.log("✅ Connected to MongoDB"))
  //.catch((err) => console.error("MongoDB connect error:", err));

// API routes
app.use("/api/problems", problemsRouter);
app.use("/api/submit", submitRouter);

// Serve a small static frontend page from /public
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
