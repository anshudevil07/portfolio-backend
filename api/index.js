import "../src/env.js";
import express from "express";
import mongoose from "mongoose";
import portfolioRoutes from "../src/routes/portfolio.js";
import adminRoutes from "../src/routes/admin.js";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json());

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many submissions from this IP." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests." },
});

app.use("/api/portfolio/submit", submitLimiter);
app.use("/api/", apiLimiter);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/admin", adminRoutes);
app.get("/", (_, res) => res.json({ status: "Portfolio API running ✓" }));

// ✅ MongoDB connection (cached)
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("✓ MongoDB connected");
}

// ✅ Vercel serverless handler
export default async function handler(req, res) {
  // ✅ CORS HEADERS FIRST - before EVERYTHING
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  // ✅ Handle preflight IMMEDIATELY - don't touch Express
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Connect DB
    await connectDB();
    // Pass to Express AFTER headers are set
    return app(req, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
