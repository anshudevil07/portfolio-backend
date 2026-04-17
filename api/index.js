import "../src/env.js";
import express from "express";
import mongoose from "mongoose";
import portfolioRoutes from "../src/routes/portfolio.js";
import adminRoutes from "../src/routes/admin.js";
import rateLimit from "express-rate-limit";

const app = express();

// ✅ CORS - set headers manually BEFORE everything
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  
  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// Rate limiting
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

// Connect MongoDB once
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
};

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
