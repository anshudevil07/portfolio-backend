import { connectDB } from "../../../lib/db.js";
import { setCors } from "../../../lib/cors.js";
import Portfolio from "../../../src/models/Portfolio.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { token } = req.query;
  await connectDB();

  if (req.method === "GET") {
    const portfolio = await Portfolio.findOne({ editToken: token });
    if (!portfolio) return res.status(404).json({ error: "Invalid edit token" });
    return res.json(portfolio);
  }

  if (req.method === "PUT") {
    const portfolio = await Portfolio.findOne({ editToken: token });
    if (!portfolio) return res.status(404).json({ error: "Invalid edit token" });

    const allowed = ["bio", "title", "phone", "location", "github", "linkedin",
      "twitter", "website", "resumeUrl", "skills", "works", "career"];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) portfolio[key] = req.body[key];
    });

    await portfolio.save();
    return res.json({ success: true, slug: portfolio.slug });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
