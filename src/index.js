import "./env.js";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import portfolioRoutes from "./routes/portfolio.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// CORS configuration - allow all frontend ports
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Rate limiting — 10 submissions per IP per hour
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many submissions from this IP. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — 200 requests per 15 min
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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✓ MongoDB connected");
    if (process.env.NODE_ENV !== 'production') {
      app.listen(process.env.PORT || 5000, () =>
        console.log(`✓ Server running on port ${process.env.PORT || 5000}`)
      );
    }
  })
  .catch((err) => console.error("DB connection error:", err));

export default app;
