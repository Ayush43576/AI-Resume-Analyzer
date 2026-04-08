# ResumeIQ 🎯
### AI-Powered ATS Resume Intelligence Platform

---

## ✅ Run Locally — Just double-click!

1. Unzip this folder
2. Double-click **`index.html`**
3. Opens in your browser — done! ✅

> Everything is inside a single `index.html` file.
> No install, no server, no internet needed (except Chart.js loads from CDN).

---

## 🌐 Deploy Free (Pick any one)

### ⭐ Vercel — Recommended (30 seconds)
1. Go to **https://vercel.com/new**
2. Drag and drop the `resumeiq` folder onto the page
3. Click **Deploy**
4. Get your live URL: `https://resumeiq.vercel.app` ✅

### Netlify (Also great)
1. Go to **https://app.netlify.com/drop**
2. Drag and drop the folder
3. Instant live URL ✅

### GitHub Pages (Free forever)
1. Create a GitHub repo named `resumeiq`
2. Upload `index.html`
3. Settings → Pages → Source: main branch
4. Live at `https://yourusername.github.io/resumeiq` ✅

---

## 📁 Structure

```
resumeiq/
├── index.html    ← Entire app (HTML + CSS + JS in one file)
└── README.md     ← This file
```

---

## 🎨 Customize Colors

Open `index.html`, find this in `<style>`:
```css
body { background: #0d0d14; }   /* Change background */
.logo span { color: #e94560; }  /* Change accent color */
```

## 📊 Add More Job Roles

Find `const SAMPLES = {` in the script and add a new entry:
```js
devops: {
  title: "DevOps Engineer Resume",
  skills: ["Docker", "Kubernetes", "AWS", "Terraform"],
  missing: ["Helm", "Ansible", "GitOps"],
  score: 71,
  breakdown: { Skills: 75, Experience: 65, Projects: 72, Education: 70 },
  jobs: [{ title: "DevOps Engineer", company: "Netflix", icon: "N", match: 80 }],
  suggestions: ["Add Terraform IaC projects to GitHub."]
}
```

---

Made with ❤️ — ResumeIQ
