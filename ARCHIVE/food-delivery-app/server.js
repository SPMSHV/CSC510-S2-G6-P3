import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { fileURLToPath } from "url";
import path from "path";
import authRoutes from "./routes/authRoutes.js"; 
import restaurantRoutes from "./routes/restaurantRoutes.js";

dotenv.config();
connectDB();

// const User = require("./models/User");

// (async () => {
//   const count = await User.countDocuments();
//   console.log("User collection has", count, "documents");
// })();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/auth", authRoutes);
// app.use("/api/auth", require("./routes/authRoutes"));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile("register.html", { root: "public" });
});

// app.use("/api/restaurants", restaurantRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
