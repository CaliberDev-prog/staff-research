const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    }
  })
);

app.use(express.json({ limit: "1mb" }));

const ResponseSchema = new mongoose.Schema(
  {
    representative: {
      type: String,
      trim: true,
      default: "Caliber"
    },

    server: {
      type: String,
      trim: true,
      required: true
    },

    owner: {
      type: String,
      trim: true,
      required: true
    },

    discordInvite: {
      type: String,
      trim: true,
      default: ""
    },

    category: {
      type: String,
      trim: true,
      required: true
    },

    problem: {
      type: String,
      trim: true,
      required: true
    },

    tried: {
      type: String,
      trim: true,
      default: ""
    },

    timeSpent: {
      type: String,
      trim: true,
      default: ""
    },

    wouldPay: {
      type: String,
      enum: ["Yes", "Maybe", "No"],
      default: "Maybe"
    },

    frequency: {
      type: String,
      trim: true,
      default: "Unknown"
    },

    pain: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },

    frustrating: {
      type: String,
      trim: true,
      default: ""
    },

    idea: {
      type: String,
      trim: true,
      default: ""
    },

    source: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const RepresentativeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      unique: true
    },

    discord: {
      type: String,
      trim: true,
      default: ""
    },

    role: {
      type: String,
      trim: true,
      default: "Researcher"
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const ScriptSchema = new mongoose.Schema(
  {
    rep: {
      type: String,
      trim: true,
      required: true
    },

    order: {
      type: Number,
      required: true
    },

    title: {
      type: String,
      trim: true,
      required: true
    },

    text: {
      type: String,
      trim: true,
      required: true
    }
  },
  {
    timestamps: true
  }
);

ScriptSchema.index({ rep: 1, order: 1 }, { unique: true });

const ResearchResponse = mongoose.model("ResearchResponse", ResponseSchema);
const Representative = mongoose.model("Representative", RepresentativeSchema);
const ScriptTemplate = mongoose.model("ScriptTemplate", ScriptSchema);

function requireAdmin(req, res, next) {
  const key = req.header("x-admin-key");

  if (!process.env.ADMIN_KEY) return next();

  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      error: "Invalid admin key"
    });
  }

  next();
}

function getSummaryStats(responses) {
  const totalResponses = responses.length;

  const painValues = responses
    .map((r) => Number(r.pain))
    .filter((n) => !Number.isNaN(n));

  const avgPain = painValues.length
    ? painValues.reduce((a, b) => a + b, 0) / painValues.length
    : 0;

  const wouldPay = {
    Yes: 0,
    Maybe: 0,
    No: 0
  };

  const categories = {};
  const reps = {};
  const frequency = {};

  for (const response of responses) {
    wouldPay[response.wouldPay] = (wouldPay[response.wouldPay] || 0) + 1;
    categories[response.category] = (categories[response.category] || 0) + 1;
    reps[response.representative] = (reps[response.representative] || 0) + 1;
    frequency[response.frequency] = (frequency[response.frequency] || 0) + 1;
  }

  return {
    totalResponses,
    avgPain: Number(avgPain.toFixed(2)),
    wouldPay,
    categories,
    reps,
    frequency
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Staff research API connected."
  });
});

app.get("/api/responses", async (req, res) => {
  const responses = await ResearchResponse.find()
    .sort({ createdAt: -1 })
    .lean();

  res.json(responses);
});

app.post("/api/responses", async (req, res) => {
  try {
    const response = await ResearchResponse.create(req.body);
    res.status(201).json(response);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

app.patch("/api/responses/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await ResearchResponse.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updated) {
      return res.status(404).json({
        error: "Response not found"
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

app.delete("/api/responses/:id", requireAdmin, async (req, res) => {
  const deleted = await ResearchResponse.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      error: "Response not found"
    });
  }

  res.json({
    ok: true
  });
});

app.get("/api/representatives", async (req, res) => {
  const reps = await Representative.find()
    .sort({ name: 1 })
    .lean();

  res.json(reps);
});

app.post("/api/representatives", requireAdmin, async (req, res) => {
  try {
    const rep = await Representative.findOneAndUpdate(
      { name: req.body.name },
      req.body,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.status(201).json(rep);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

app.delete("/api/representatives/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;

  const deleted = await Representative.findOneAndDelete({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
      { name: id }
    ]
  });

  if (!deleted) {
    return res.status(404).json({
      error: "Representative not found"
    });
  }

  res.json({
    ok: true
  });
});

app.get("/api/scripts", async (req, res) => {
  const scripts = await ScriptTemplate.find()
    .sort({ rep: 1, order: 1 })
    .lean();

  res.json(scripts);
});

app.post("/api/scripts", requireAdmin, async (req, res) => {
  try {
    const script = await ScriptTemplate.findOneAndUpdate(
      {
        rep: req.body.rep,
        order: req.body.order
      },
      req.body,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.status(201).json(script);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

app.delete("/api/scripts/:rep", requireAdmin, async (req, res) => {
  await ScriptTemplate.deleteMany({
    rep: req.params.rep
  });

  res.json({
    ok: true
  });
});

app.get("/api/analytics", async (req, res) => {
  const responses = await ResearchResponse.find().lean();
  res.json(getSummaryStats(responses));
});

async function seedDefaults() {
  const count = await Representative.countDocuments();

  if (count === 0) {
    await Representative.insertMany([
      {
        name: "Caliber",
        discord: "x_caliber41",
        role: "Founder",
        active: true
      },
      {
        name: "Kai",
        discord: "Kai_River",
        role: "Researcher",
        active: true
      },
      {
        name: "Logan",
        discord: "LoganM",
        role: "Researcher",
        active: true
      }
    ]);

    console.log("✅ Default representatives seeded");
  }
}

async function start() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Missing MONGODB_URI or MONGO_URI in environment variables.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  console.log("✅ MongoDB connected");

  await seedDefaults();

  app.listen(PORT, () => {
    console.log(`✅ API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
