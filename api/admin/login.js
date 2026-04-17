import { setCors } from "../../lib/cors.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
}
