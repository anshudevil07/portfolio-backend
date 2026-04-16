import mongoose from "mongoose";

const workSchema = new mongoose.Schema({
  title: String, description: String, link: String, image: String,
});

const careerSchema = new mongoose.Schema({
  company: String, role: String, duration: String, description: String,
});

const portfolioSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    email: { type: String, required: true },
    phone: String, location: String, bio: String,
    github: String, linkedin: String, twitter: String,
    website: String, resumeUrl: String,
    skills: [String],
    works: [workSchema],
    career: [careerSchema],
    whatIDo: [{ title: String, description: String, tags: [String] }],

    status: {
      type: String,
      enum: ["active", "rejected"],
      default: "active",
    },

    slug: { type: String, unique: true },

    // Custom slug chosen by user
    customSlug: { type: String, unique: true, sparse: true },

    // Edit token for user to update their portfolio
    editToken: { type: String },

    // Analytics
    analytics: {
      views: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      lastViewed: Date,
      // Daily view counts: [{ date: "2024-01-15", count: 5 }]
      dailyViews: [{ date: String, count: { type: Number, default: 0 } }],
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name + timestamp
portfolioSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug =
      this.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") +
      "-" + Date.now().toString(36);
  }
  next();
});

export default mongoose.model("Portfolio", portfolioSchema);
