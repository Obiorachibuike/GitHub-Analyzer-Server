import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/analyze", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "GitHub username is required." });
  }

  try {
    console.log(`🔍 Fetching GitHub data for user: @${username}`);

    const [profileRes, reposRes] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`),
      axios.get(`https://api.github.com/users/${username}/repos`)
    ]);

    const profile = profileRes.data;
    const repos = reposRes.data;

    const topRepos = repos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5);

    const prompt = `
You're an expert GitHub career advisor AI. Analyze this developer’s GitHub profile:
- Name: ${profile.name || profile.login}
- Bio: ${profile.bio}
- Followers: ${profile.followers}
- Public Repos: ${profile.public_repos}

Top Repositories:
${topRepos.map(repo => `- ${repo.name}: ${repo.description || "No description"}`).join("\n")}

Provide a smart and helpful review of their GitHub presence. Suggest what to improve, and how to stand out more.
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const aiText = response.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

    console.log("✅ Gemini response generated");

    res.json({
      message: aiText,
      profile: {
        login: profile.login,
        name: profile.name,
        followers: profile.followers,
        public_repos: profile.public_repos,
        top_repo: topRepos[0]?.name || "N/A"
      }
    });
  } catch (err) {
    console.error("❌ Error during analysis:", err.message);
    res.status(500).json({ error: "Failed to analyze profile." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
