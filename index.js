const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(cors());

// 🧠 Log request size before parsing
app.use((req, res, next) => {
  req.on('data', chunk => {
    req._bodySize = (req._bodySize || 0) + chunk.length;
  });
  req.on('end', () => {
    console.log(`📏 Request body size: ${(req._bodySize || 0) / 1024} KB`);
  });
  next();
});

// 🚀 Increase payload size limit
app.use(express.json({ limit: '5mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 📍 Main route
app.post("/api/analyze", async (req, res) => {
  console.log("✅ /api/analyze hit");

  const { profile, repos } = req.body;
  console.log("👤 Username:", profile?.login || profile?.name);
  console.log("📦 Repos received:", repos?.length);

  const prompt = `
You're an expert GitHub career advisor AI. Analyze this developer’s GitHub profile:
- Name: ${profile.name || profile.login}
- Bio: ${profile.bio}
- Followers: ${profile.followers}
- Public Repos: ${profile.public_repos}

Top Repositories:
${repos.slice(0, 5).map((repo) => `- ${repo.name}: ${repo.description || "No description"}`).join("\n")}

Provide a smart and helpful review of their GitHub presence. Suggest what to improve, and how to stand out more.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini response:\n", text.slice(0, 300), '...'); // only log first 300 chars
    res.json({ message: text });
  } catch (err) {
    console.error("❌ Gemini Error:", err.message);
    res.status(500).json({ error: "Failed to generate AI insights." });
  }
});

// 🛑 Custom error handler for oversized requests
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    console.error("🚫 Payload too large:", (req._bodySize || 0) / 1024, "KB");
    return res.status(413).json({ error: "Payload too large. Please try again with fewer repositories." });
  }
  next(err);
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
