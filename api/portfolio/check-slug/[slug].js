import { connectDB } from "../../../lib/db.js";
import { setCors } from "../../../lib/cors.js";
import Portfolio from "../../../src/models/Portfolio.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { slug } = req.query;
  const clean = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  await connectDB();
  const exists = await Portfolio.findOne({ $or: [{ slug: clean }, { customSlug: clean }] });
  return res.json({ available: !exists, slug: clean });
}
