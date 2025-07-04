const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/analyze", async (req, res) => {
  const { profile, repos } = req.body;

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
    res.json({ message: text });
  } catch (err) {
    console.error("Gemini Error:", err.message);
    res.status(500).json({ error: "Failed to generate AI insights." });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
