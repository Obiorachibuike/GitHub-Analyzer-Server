

# 🔍 AI-Based GitHub Profile Reviewer

An AI-powered web application that analyzes any GitHub profile and provides smart insights using **Google Gemini Pro**.

![screenshot](./screenshot.png) <!-- Add your screenshot here -->

---

## 🚀 Features

- 🔎 Analyze any public GitHub username
- 📊 Fetch profile and repository data using GitHub API
- 🧠 Get detailed AI feedback on:
  - Project variety
  - README quality
  - Activity level
  - Popularity metrics
  - Suggested improvements
- 📄 View insights directly in the browser

---

## 🧱 Tech Stack

| Layer       | Tech                     |
|-------------|--------------------------|
| Frontend    | React + Vite + Tailwind  |
| Backend     | Node.js + Express        |
| AI Engine   | Gemini Pro via Google AI |
| Deployment  | (Optional) Vercel / Render / Railway |

---

## 🖥️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/github-profile-review.git
cd github-profile-review


---

2. Setup the Backend

cd backend
npm install

🔑 Create .env

GEMINI_API_KEY=your_google_generative_ai_api_key

🔃 Run the Server

npm run dev

The backend runs on http://localhost:3000.


---

3. Setup the Frontend

cd ../
npm install
npm run dev

The app runs on http://localhost:5173.


---

🧪 Example Prompt to Gemini

You're an expert GitHub career advisor. Analyze this GitHub user's profile:
- Name, Bio, Repos, Followers
- Top 5 repos (names + descriptions)

Give practical suggestions to improve their open source presence.


---

📷 Screenshot

> Add a screenshot of the UI once you're done with the frontend.




---

📌 Future Improvements

GitHub OAuth login for personalized insights

Downloadable AI report (PDF or Markdown)

Radar chart for skill scoring

Profile comparison mode



---

📄 License

This project is licensed under the MIT License.


---

💬 Feedback

Have ideas or suggestions? Open an issue or tweet @obiorachibuike.

---



