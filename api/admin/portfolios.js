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

  if (req.method === "GET") {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const total = await Portfolio.countDocuments(query);
    const portfolios = await Portfolio.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-editToken");
    return res.json({ portfolios, total, page: Number(page), pages: Math.ceil(total / limit) });
  }

  if (req.method === "POST") {
    const { ids, action } = req.body;
    if (!ids?.length) return res.status(400).json({ error: "No IDs provided" });
    if (action === "delete") await Portfolio.deleteMany({ _id: { $in: ids } });
    else if (action === "activate") await Portfolio.updateMany({ _id: { $in: ids } }, { status: "active" });
    else if (action === "reject") await Portfolio.updateMany({ _id: { $in: ids } }, { status: "rejected" });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
