import express from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import Portfolio from "../models/Portfolio.js";
import { sendPortfolioConfirmation, sendAdminNotification } from "../services/email.js";

const router = express.Router();

// Check if custom slug is available
router.get("/check-slug/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const exists = await Portfolio.findOne({
      $or: [{ slug }, { customSlug: slug }],
    });
    res.json({ available: !exists, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit new portfolio
router.post("/submit", async (req, res) => {
  try {
    const { customSlug, ...rest } = req.body;

    // Validate custom slug if provided
    if (customSlug) {
      const clean = customSlug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const exists = await Portfolio.findOne({
        $or: [{ slug: clean }, { customSlug: clean }],
      });
      if (exists) return res.status(400).json({ success: false, error: "This slug is already taken. Please choose another." });
      rest.customSlug = clean;
      rest.slug = clean; // use custom slug as the main slug
    }

    // Generate edit token
    const editToken = crypto.randomBytes(32).toString("hex");

    const portfolio = new Portfolio({ ...rest, editToken });
    await portfolio.save();

    // Send emails (non-blocking)
    sendPortfolioConfirmation({
      name: portfolio.name,
      email: portfolio.email,
      slug: portfolio.slug,
      editToken,
    });
    sendAdminNotification({
      name: portfolio.name,
      email: portfolio.email,
      slug: portfolio.slug,
    });

    res.status(201).json({
      success: true,
      slug: portfolio.slug,
      id: portfolio._id,
      editToken,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get portfolio by slug (public) + track analytics
router.get("/:slug", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      $or: [{ slug: req.params.slug }, { customSlug: req.params.slug }],
    });
    if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

    // Track view (fire and forget)
    const today = new Date().toISOString().split("T")[0];
    const visitorId = req.headers["x-visitor-id"] || req.ip;

    Portfolio.findByIdAndUpdate(portfolio._id, {
      $inc: { "analytics.views": 1 },
      $set: { "analytics.lastViewed": new Date() },
    }).exec();

    // Upsert daily view
    const dayEntry = portfolio.analytics?.dailyViews?.find(d => d.date === today);
    if (dayEntry) {
      Portfolio.updateOne(
        { _id: portfolio._id, "analytics.dailyViews.date": today },
        { $inc: { "analytics.dailyViews.$.count": 1 } }
      ).exec();
    } else {
      Portfolio.updateOne(
        { _id: portfolio._id },
        { $push: { "analytics.dailyViews": { date: today, count: 1 } } }
      ).exec();
    }

    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get QR code for a portfolio
router.get("/:slug/qr", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      $or: [{ slug: req.params.slug }, { customSlug: req.params.slug }],
    });
    if (!portfolio) return res.status(404).json({ error: "Not found" });

    const url = `${process.env.PORTFOLIO_BASE_URL}/${portfolio.slug}`;
    const qr = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: "#5eead4", light: "#0a0e17" },
    });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get portfolio by edit token (for editing)
router.get("/edit/:token", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ editToken: req.params.token });
    if (!portfolio) return res.status(404).json({ error: "Invalid edit token" });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update portfolio via edit token
router.put("/edit/:token", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ editToken: req.params.token });
    if (!portfolio) return res.status(404).json({ error: "Invalid edit token" });

    const allowed = ["bio", "title", "phone", "location", "github", "linkedin",
      "twitter", "website", "resumeUrl", "skills", "works", "career"];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) portfolio[key] = req.body[key];
    });

    await portfolio.save();
    res.json({ success: true, slug: portfolio.slug });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
