import { connectDB } from "../../lib/db.js";
import { setCors } from "../../lib/cors.js";
import Portfolio from "../../src/models/Portfolio.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function auth(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!auth(req)) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const total = await Portfolio.countDocuments();
  const active = await Portfolio.countDocuments({ status: "active" });
  const rejected = await Portfolio.countDocuments({ status: "rejected" });
  const viewsAgg = await Portfolio.aggregate([{ $group: { _id: null, totalViews: { $sum: "$analytics.views" } } }]);
  const totalViews = viewsAgg[0]?.totalViews || 0;
  const topPortfolios = await Portfolio.find().sort({ "analytics.views": -1 }).limit(5).select("name slug analytics.views status createdAt");
  const recent = await Portfolio.find().sort({ createdAt: -1 }).limit(5).select("name email status createdAt slug analytics.views");

  return res.json({ total, active, rejected, totalViews, topPortfolios, recent });
}
