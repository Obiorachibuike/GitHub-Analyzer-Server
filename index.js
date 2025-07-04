import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 🔹 Utility: Scrape GitHub contribution calendar
const scrapeContributions = async (username) => {
  try {
    const res = await axios.get(`https://github.com/users/${username}/contributions`);
    const $ = cheerio.load(res.data);
    const data = [];

    $("rect.ContributionCalendar-day").each((_, el) => {
      const date = $(el).attr("data-date");
      const count = parseInt($(el).attr("data-count") || "0", 10);
      data.push({ date, count });
    });

    const total = data.reduce((acc, cur) => acc + cur.count, 0);
    return { total, daily: data };
  } catch {
    return { total: 0, daily: [] };
  }
};

// 🔹 Route: Analyze GitHub Profile
app.post("/api/analyze", async (req, res) => {
  const { username } = req.body;

  if (!username) return res.status(400).json({ error: "GitHub username is required." });

  try {
    const headers = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "AI-GitHub-Reviewer"
    };

    const profileRes = await axios.get(`https://api.github.com/users/${username}`, { headers });
    const profile = profileRes.data;

    const isOrg = profile.type === "Organization";

    const reposURL = isOrg
      ? `https://api.github.com/orgs/${username}/repos`
      : `https://api.github.com/users/${username}/repos`;

    const reposRes = await axios.get(reposURL, { headers });
    const repos = reposRes.data;

    const gistsRes = await axios.get(`https://api.github.com/users/${username}/gists`, { headers });
    const gists = gistsRes.data.map(g => ({
      id: g.id,
      url: g.html_url,
      description: g.description,
      files: Object.keys(g.files).length,
      created_at: g.created_at
    }));

    const { total: totalContributions, daily: contributions } = await scrapeContributions(username);

    const topRepos = repos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5);

    const prompt = `
You're an expert GitHub career advisor AI. Analyze the following:

Name: ${profile.name || profile.login}
Type: ${profile.type}
Bio: ${profile.bio}
Followers: ${profile.followers}
Public Repos: ${profile.public_repos}
Public Gists: ${profile.public_gists}
Total Contributions (Last 1 Year): ${totalContributions}

Top Repositories:
${topRepos.map(repo => `- ${repo.name}: ${repo.description || "No description"}`).join("\n")}

Structure response in:
## Summary
## Strengths
## Recommendations
`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const extract = (section) => {
      const match = new RegExp(`## ${section}\\n+([\\s\\S]*?)(\\n##|$)`, "i").exec(text);
      return match ? match[1].trim() : null;
    };

    const summary = extract("Summary");
    const strengths = extract("Strengths");
    const recommendations = extract("Recommendations");

    res.json({
      type: profile.type,
      profile: {
        login: profile.login,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        html_url: profile.html_url,
        blog: profile.blog,
        company: profile.company,
        followers: profile.followers,
        public_repos: profile.public_repos,
        public_gists: profile.public_gists,
        twitter_url: profile.twitter_username ? `https://twitter.com/${profile.twitter_username}` : null,
        top_repo: topRepos[0]?.name,
        top_repo_url: topRepos[0]?.html_url,
        repos: repos.map(r => ({
          name: r.name,
          url: r.html_url,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language
        })),
        gists,
        total_contributions: totalContributions,
        contributions // for chart heatmap
      },
      ai_analysis: {
        summary,
        strengths,
        recommendations
      }
    });
  } catch (err) {
    console.error("❌ Error:", err.message || err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// 🔹 Route: PDF Report Generation
app.post("/api/pdf", async (req, res) => {
  const { profile, ai_analysis } = req.body;

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #2563eb; }
          h2 { border-bottom: 1px solid #ccc; margin-top: 20px; }
          p, li { font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>GitHub Profile Report: ${profile.login}</h1>
        <img src="${profile.avatar_url}" width="100"/>

        <h2>Summary</h2>
        <p>${ai_analysis.summary}</p>

        <h2>Strengths</h2>
        <p>${ai_analysis.strengths}</p>

        <h2>Recommendations</h2>
        <p>${ai_analysis.recommendations}</p>

        <h2>Stats</h2>
        <ul>
          <li>Followers: ${profile.followers}</li>
          <li>Public Repos: ${profile.public_repos}</li>
          <li>Public Gists: ${profile.public_gists}</li>
          <li>Total Contributions: ${profile.total_contributions}</li>
        </ul>

        <h2>Top Repo</h2>
        <p>${profile.top_repo}: <a href="${profile.top_repo_url}">${profile.top_repo_url}</a></p>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${profile.login}_report.pdf"`
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF error:", err);
    res.status(500).json({ error: "Could not generate PDF." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
