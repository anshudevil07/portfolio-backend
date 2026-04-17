import { connectDB } from "../../lib/db.js";
import { setCors } from "../../lib/cors.js";
import Portfolio from "../../src/models/Portfolio.js";
import QRCode from "qrcode";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { slug } = req.query;
  await connectDB();

  // QR code route: /api/portfolio/[slug]/qr handled separately
  // GET /api/portfolio/:slug
  if (req.method === "GET") {
    const portfolio = await Portfolio.findOne({ $or: [{ slug }, { customSlug: slug }] });
    if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

    // Track view
    Portfolio.findByIdAndUpdate(portfolio._id, {
      $inc: { "analytics.views": 1 },
      $set: { "analytics.lastViewed": new Date() },
    }).exec();

    return res.json(portfolio);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
