import { connectDB } from "../../lib/db.js";
import { setCors } from "../../lib/cors.js";
import Portfolio from "../../src/models/Portfolio.js";
import { sendPortfolioConfirmation, sendAdminNotification } from "../../src/services/email.js";
import crypto from "crypto";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await connectDB();
    const { customSlug, ...rest } = req.body;

    if (customSlug) {
      const clean = customSlug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const exists = await Portfolio.findOne({ $or: [{ slug: clean }, { customSlug: clean }] });
      if (exists) return res.status(400).json({ success: false, error: "This slug is already taken." });
      rest.customSlug = clean;
      rest.slug = clean;
    }

    const editToken = crypto.randomBytes(32).toString("hex");
    const portfolio = new Portfolio({ ...rest, editToken });
    await portfolio.save();

    sendPortfolioConfirmation({ name: portfolio.name, email: portfolio.email, slug: portfolio.slug, editToken });
    sendAdminNotification({ name: portfolio.name, email: portfolio.email, slug: portfolio.slug });

    return res.status(201).json({ success: true, slug: portfolio.slug, id: portfolio._id, editToken });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
