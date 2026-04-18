import "./env.js";

import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import portfolioRoutes from "./routes/portfolio.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// ── Serverless-safe MongoDB connection ──────────────────────────────
// Cache the connection promise so concurrent cold-start requests
// all wait on the same connect() call instead of opening many connections.
let connectionPromise = null;

function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
      })
      .then(() => {
        console.log("✓ MongoDB connected");
      })
      .catch((err) => {
        connectionPromise = null; // allow retry on next request
        throw err;
      });
  }
  return connectionPromise;
}

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

// Ensure DB is connected before any route runs
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    res.status(503).json({ error: "Database unavailable. Please try again." });
  }
});

// Rate limiting
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many submissions from this IP. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests. Please slow down." },
});

app.use("/api/portfolio/submit", submitLimiter);
app.use("/api/", apiLimiter);

app.use("/api/portfolio", portfolioRoutes);
app.use("/api/admin", adminRoutes);
app.get("/", (_, res) => res.json({ status: "Portfolio API running ✓" }));

if (process.env.NODE_ENV !== "production") {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`✓ Server running on port ${process.env.PORT || 5000}`)
  );
}

export default app;
