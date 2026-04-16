import express from "express";
import jwt from "jsonwebtoken";
import Portfolio from "../models/Portfolio.js";

const router = express.Router();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Admin login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Get all portfolios with filters
router.get("/portfolios", auth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }
    const total = await Portfolio.countDocuments(query);
    const portfolios = await Portfolio.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-editToken");
    res.json({ portfolios, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stats
router.get("/stats", auth, async (req, res) => {
  try {
    const total = await Portfolio.countDocuments();
    const active = await Portfolio.countDocuments({ status: "active" });
    const rejected = await Portfolio.countDocuments({ status: "rejected" });

    // Total views across all portfolios
    const viewsAgg = await Portfolio.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$analytics.views" } } },
    ]);
    const totalViews = viewsAgg[0]?.totalViews || 0;

    // Top 5 most viewed
    const topPortfolios = await Portfolio.find()
      .sort({ "analytics.views": -1 })
      .limit(5)
      .select("name slug analytics.views status createdAt");

    const recent = await Portfolio.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email status createdAt slug analytics.views");

    res.json({ total, active, rejected, totalViews, topPortfolios, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single portfolio
router.get("/portfolios/:id", auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id).select("-editToken");
    if (!portfolio) return res.status(404).json({ error: "Not found" });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get analytics for a portfolio
router.get("/portfolios/:id/analytics", auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id).select("name analytics");
    if (!portfolio) return res.status(404).json({ error: "Not found" });
    res.json(portfolio.analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status
router.patch("/portfolios/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const portfolio = await Portfolio.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk actions
router.post("/portfolios/bulk", auth, async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids?.length) return res.status(400).json({ error: "No IDs provided" });

    if (action === "delete") {
      await Portfolio.deleteMany({ _id: { $in: ids } });
    } else if (action === "activate") {
      await Portfolio.updateMany({ _id: { $in: ids } }, { status: "active" });
    } else if (action === "reject") {
      await Portfolio.updateMany({ _id: { $in: ids } }, { status: "rejected" });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
    res.json({ success: true, affected: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete portfolio
router.delete("/portfolios/:id", auth, async (req, res) => {
  try {
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
