const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json({ limit: "1mb" }));

const ResponseSchema = new mongoose.Schema({
  representative: { type: String, trim: true, default: "Caliber" },
  server: { type: String, trim: true, required: true },
  owner: { type: String, trim: true, required: true },
  category: { type: String, trim: true, required: true },
  problem: { type: String, trim: true, required: true },
  tried: { type: String, trim: true, default: "" },
  timeSpent: { type: String, trim: true, default: "" },
  wouldPay: { type: String, enum: ["Yes", "Maybe", "No"], default: "Maybe" },
  frequency: { type: String, trim: true, default: "Unknown" },
  pain: { type: Number, min: 1, max: 10, required: true },
  frustrating: { type: String, trim: true, default: "" },
  idea: { type: String, trim: true, default: "" }
}, { timestamps: true });

const ResearchResponse = mongoose.model("ResearchResponse", ResponseSchema);

function requireAdmin(req, res, next) {
  const key = req.header("x-admin-key");
  if (!process.env.ADMIN_KEY) return next();
  if (key !== process.env.ADMIN_KEY) return res.status(401).json({ error: "Invalid admin key" });
  next();
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Staff research API connected." });
});

app.get("/api/responses", async (req, res) => {
  const responses = await ResearchResponse.find().sort({ createdAt: -1 }).lean();
  res.json(responses);
});

app.post("/api/responses", async (req, res) => {
  try {
    const response = await ResearchResponse.create(req.body);
    res.status(201).json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/responses/:id", requireAdmin, async (req, res) => {
  const updated = await ResearchResponse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: "Response not found" });
  res.json(updated);
});

app.delete("/api/responses/:id", requireAdmin, async (req, res) => {
  const deleted = await ResearchResponse.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Response not found" });
  res.json({ ok: true });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in environment variables.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB connected");
  app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
