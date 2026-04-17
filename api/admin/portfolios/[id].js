import { connectDB } from "../../../lib/db.js";
import { setCors } from "../../../lib/cors.js";
import Portfolio from "../../../src/models/Portfolio.js";
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

  const { id } = req.query;
  await connectDB();

  if (req.method === "GET") {
    const portfolio = await Portfolio.findById(id).select("-editToken");
    if (!portfolio) return res.status(404).json({ error: "Not found" });
    return res.json(portfolio);
  }

  if (req.method === "PATCH") {
    const { status } = req.body;
    const portfolio = await Portfolio.findByIdAndUpdate(id, { status }, { new: true });
    return res.json(portfolio);
  }

  if (req.method === "DELETE") {
    await Portfolio.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
