# ResumeIQ 🎯
### AI-Powered ATS Resume Intelligence Platform

> Score your resume like a real ATS. Detect skill gaps, match jobs, and get AI-powered improvement suggestions.

---

## 🚀 Run Locally (No install needed!)

### Option 1 — Simple double-click (easiest)
1. Unzip the folder
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
3. Done ✅

> ⚠️ Some features (localStorage history) may not work when opened as `file://` in certain browsers. Use Option 2 for full experience.

---

### Option 2 — Local dev server (recommended)

**Requires Node.js** → Download from https://nodejs.org

```bash
# 1. Unzip and enter the folder
cd resumeiq

# 2. Start a local server (pick any one method below)

# Method A — Node.js built-in (Node 18+)
npx serve .

# Method B — Python (if you have Python installed)
python3 -m http.server 3000

# Method C — VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

3. Open browser → `http://localhost:3000`

---

## 📁 Project Structure

```
resumeiq/
├── index.html          ← Main app entry point
├── src/
│   ├── style.css       ← All styles (dark theme)
│   └── app.js          ← App logic, data, scoring engine
└── README.md           ← You're reading this
```

---

## 🌐 Deploy Live (Free)

### ⭐ Option A — Vercel (Recommended — 1 minute deploy)

1. Create free account at https://vercel.com
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Inside the project folder:
   ```bash
   vercel
   ```
4. Follow prompts → Vercel gives you a live URL like:
   `https://resumeiq.vercel.app` ✅

**Or use the web UI:**
1. Go to https://vercel.com/new
2. Drag and drop the `resumeiq` folder
3. Click Deploy → live in 30 seconds

---

### Option B — Netlify (Also free, also excellent)

1. Create free account at https://netlify.com
2. Go to https://app.netlify.com/drop
3. Drag and drop the `resumeiq` folder into the page
4. Netlify gives you a URL like `https://resumeiq-abc123.netlify.app` ✅

**Or via CLI:**
```bash
npm install -g netlify-cli
netlify deploy --dir . --prod
```

---

### Option C — GitHub Pages (Free, good for portfolios)

1. Create a GitHub account and new repository named `resumeiq`
2. Upload all project files to the repo
3. Go to repo Settings → Pages → Source: `main` branch, `/ (root)`
4. Your site will be live at `https://yourusername.github.io/resumeiq` ✅

---

### Option D — Cloudflare Pages (Fast global CDN, free)

1. Create free account at https://pages.cloudflare.com
2. Connect your GitHub repo (after pushing files there)
3. Set build settings:
   - Build command: *(leave empty)*
   - Output directory: `/`
4. Deploy → live at `https://resumeiq.pages.dev` ✅

---

## 🔧 Customizing

### Add your own job roles
Edit `SAMPLES` object in `src/app.js`:
```js
myRole: {
  title: "DevOps Engineer Resume",
  skills: ["Docker", "Kubernetes", "Terraform", "AWS"],
  missing: ["Ansible", "Helm", "GitOps"],
  score: 71,
  breakdown: { Skills: 75, Experience: 65, Projects: 72, Education: 70 },
  jobs: [
    { title: "DevOps Engineer", company: "Netflix", icon: "N", match: 80 },
  ],
  suggestions: [
    "Add Terraform infrastructure-as-code projects to your GitHub.",
  ]
}
```

### Change color theme
Edit CSS variables in `src/style.css`:
```css
:root {
  --accent: #e94560;   /* ← Change this to any color */
  --bg: #0d0d14;       /* ← Main background */
  --surface: #1e1e30;  /* ← Card backgrounds */
}
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Charts | Chart.js 4.4 |
| Fonts | Syne + JetBrains Mono (Google Fonts) |
| Storage | localStorage (browser) |
| NLP (simulated) | Keyword matching engine |
| ATS Scoring | Weighted section scoring algorithm |
| Deploy | Vercel / Netlify / GitHub Pages |

---

## 🔮 Future Enhancements (v2 ideas)

- [ ] Real PDF parsing with PDF.js
- [ ] OpenAI API integration for real NLP
- [ ] User authentication with Supabase
- [ ] PostgreSQL database for multi-user history
- [ ] Email export of analysis report
- [ ] Resume comparison (before vs after)

---

Made with ❤️ using ResumeIQ
