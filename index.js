const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Analyze GitHub profile based on username
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

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    console.log("✅ Gemini analysis generated.");
    res.json({
      message: text,
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

app.listen(5000, () => {
  console.log("🚀 Server is running on http://localhost:5000");
});
