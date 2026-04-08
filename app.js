/* ============================================
   ResumeIQ — Application Logic
   ============================================ */

// ── Data Store ──────────────────────────────────────────────────
const SAMPLES = {
  ds: {
    title: "Data Scientist Resume",
    skills: ["Python", "SQL", "Machine Learning", "TensorFlow", "Pandas", "NumPy", "Scikit-learn", "Statistics", "Jupyter", "R"],
    missing: ["Apache Spark", "Airflow", "dbt", "Tableau", "BigQuery"],
    score: 82,
    breakdown: { Skills: 88, Experience: 80, Projects: 75, Education: 85 },
    jobs: [
      { title: "Data Scientist",       company: "Google",     icon: "G",  match: 88 },
      { title: "ML Engineer",          company: "Meta",       icon: "M",  match: 75 },
      { title: "Data Analyst",         company: "Stripe",     icon: "S",  match: 70 },
      { title: "BI Developer",         company: "Salesforce", icon: "SF", match: 45 },
    ],
    suggestions: [
      "Add Apache Spark experience — it's required in 68% of Senior Data Scientist job listings.",
      "Include 2-3 end-to-end ML project walkthroughs with measurable outcomes in your Projects section.",
      "Quantify your impact: replace 'improved model performance' with 'improved model accuracy by 12% (F1 score: 0.91)'.",
      "Add a portfolio link (GitHub / Kaggle) in your header — recruiters expect it for DS roles.",
      "Consider adding a Data Engineering skills subsection (dbt, Airflow) to qualify for hybrid roles.",
    ]
  },
  fe: {
    title: "Frontend Developer Resume",
    skills: ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Figma", "Webpack", "Jest", "Git"],
    missing: ["Next.js", "GraphQL", "AWS", "Docker", "CI/CD", "Tailwind CSS"],
    score: 74,
    breakdown: { Skills: 78, Experience: 70, Projects: 80, Education: 68 },
    jobs: [
      { title: "Frontend Engineer",  company: "Airbnb",  icon: "A",  match: 82 },
      { title: "UI Engineer",        company: "Vercel",  icon: "V",  match: 78 },
      { title: "Full-Stack Dev",     company: "Notion",  icon: "N",  match: 62 },
      { title: "Mobile Dev (RN)",    company: "Shopify", icon: "SH", match: 38 },
    ],
    suggestions: [
      "Add Next.js — it now appears in 72% of React job listings, often as a hard requirement.",
      "Include a deployed portfolio with live links and Lighthouse performance scores (aim for 90+).",
      "Add GraphQL experience to unlock full-stack and API-heavy roles.",
      "Mention web performance wins with numbers: bundle size reduction, LCP improvements, TTI metrics.",
      "Add CI/CD exposure (GitHub Actions, Vercel auto-deploys) to your DevOps skills.",
    ]
  },
  be: {
    title: "Backend Engineer Resume",
    skills: ["Node.js", "MongoDB", "Express.js", "REST APIs", "Git", "JavaScript"],
    missing: ["PostgreSQL", "Docker", "Kubernetes", "Redis", "AWS", "Microservices", "TypeScript"],
    score: 58,
    breakdown: { Skills: 55, Experience: 50, Projects: 65, Education: 60 },
    jobs: [
      { title: "Backend Engineer", company: "Twilio",     icon: "T",  match: 58 },
      { title: "Full-Stack Dev",   company: "Startup",    icon: "★",  match: 65 },
      { title: "API Developer",    company: "RapidAPI",   icon: "R",  match: 52 },
      { title: "DevOps Engineer",  company: "HashiCorp",  icon: "H",  match: 22 },
    ],
    suggestions: [
      "Add PostgreSQL — it's the #1 required database skill across backend engineering roles.",
      "Learn Docker basics and containerize one of your projects; this is now table-stakes.",
      "Expand your Experience section with quantified impact, even for freelance or internship work.",
      "Switch to TypeScript for your Node.js projects and list it — it's expected at most companies.",
      "Add open-source contributions or more side projects to compensate for limited formal experience.",
      "Consider AWS Cloud Practitioner certification — fast path to credibility for cloud-adjacent roles.",
    ]
  }
};

let analysisHistory = JSON.parse(localStorage.getItem('resumeiq_history') || '[]');

// Pre-load sample history if empty
if (analysisHistory.length === 0) {
  analysisHistory = [
    { title: "Backend Engineer Resume",    score: 58, date: "2026-03-20", prev: null, key: "be" },
    { title: "Frontend Developer Resume",  score: 74, date: "2026-03-28", prev: 58,   key: "fe" },
    { title: "Data Scientist Resume",      score: 82, date: "2026-04-02", prev: 74,   key: "ds" },
    { title: "Data Scientist Resume v2",   score: 87, date: "2026-04-05", prev: 82,   key: "ds" },
  ];
}

let chartsInitialized = false;
let chartInstances = {};

// ── Navigation ──────────────────────────────────────────────────
function showPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  const tab = document.querySelector(`[data-panel="${panelId}"]`);
  if (tab) tab.classList.add('active');

  if (panelId === 'dashboard') initDashboard();
  if (panelId === 'history')   renderHistory();
  if (panelId === 'upload') scrollTop();
}

function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ── File upload ──────────────────────────────────────────────────
function triggerUpload() {
  document.getElementById('fileInput').click();
}

function handleFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  let key = 'ds';
  if (name.includes('front') || name.includes('fe')) key = 'fe';
  else if (name.includes('back') || name.includes('be') || name.includes('node')) key = 'be';
  processResume(key, file.name.replace(/\.[^/.]+$/, ''));
}

function loadSample(key) {
  processResume(key, SAMPLES[key].title);
}

// ── Processing pipeline ──────────────────────────────────────────
function processResume(key, filename) {
  showProcessingPanel();
  const steps = ['s1', 's2', 's3', 's4', 's5', 's6'];
  steps.forEach(s => {
    const el = document.getElementById(s);
    el.className = '';
    el.querySelector('.step-icon').textContent = '◌';
  });

  let i = 0;
  const interval = setInterval(() => {
    if (i > 0) {
      const prev = document.getElementById(steps[i - 1]);
      prev.classList.remove('active');
      prev.classList.add('done');
      prev.querySelector('.step-icon').textContent = '✓';
    }
    if (i < steps.length) {
      document.getElementById(steps[i]).classList.add('active');
      document.getElementById(steps[i]).querySelector('.step-icon').textContent = '▶';
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => renderAnalysis(key), 500);
    }
  }, 400);
}

function showProcessingPanel() {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-processing').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Analysis rendering ────────────────────────────────────────────
function renderAnalysis(key) {
  const d = SAMPLES[key];
  const circum = 2 * Math.PI * 50;
  const pct = d.score / 100;

  // Score ring
  setTimeout(() => {
    document.getElementById('ringFill').style.strokeDasharray =
      `${(circum * pct).toFixed(1)} ${(circum * (1 - pct)).toFixed(1)}`;
  }, 150);

  // Animated counter
  let current = 0;
  const target = d.score;
  const counter = setInterval(() => {
    current = Math.min(current + 2, target);
    document.getElementById('scoreNum').textContent = current;
    if (current >= target) clearInterval(counter);
  }, 20);

  // Title
  document.getElementById('resumeTitle').textContent = d.title;

  // Verdict
  const vb = document.getElementById('verdictBadge');
  if (d.score >= 80) {
    vb.textContent = 'Strong Resume ✓';
    vb.className = 'verdict-badge verdict-good';
  } else if (d.score >= 65) {
    vb.textContent = 'Needs Improvement';
    vb.className = 'verdict-badge verdict-mid';
  } else {
    vb.textContent = 'Below ATS Threshold';
    vb.className = 'verdict-badge verdict-low';
  }

  // Section bars
  const weights = { Skills: 40, Experience: 25, Projects: 20, Education: 15 };
  document.getElementById('scoreBars').innerHTML = Object.entries(d.breakdown)
    .map(([k, v]) => `
      <div class="bar-item">
        <label><span>${k} (${weights[k]}%)</span><span>${v}/100</span></label>
        <div class="bar-track">
          <div class="bar-fill" style="width: 0%" data-target="${v}"></div>
        </div>
      </div>`)
    .join('');

  // Animate bars after render
  setTimeout(() => {
    document.querySelectorAll('.bar-fill[data-target]').forEach(el => {
      el.style.width = el.dataset.target + '%';
    });
  }, 200);

  // Skills
  document.getElementById('skillsFound').innerHTML =
    d.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
  document.getElementById('skillsMissing').innerHTML =
    d.missing.map(s => `<span class="skill-tag missing">${s}</span>`).join('');

  // Jobs
  document.getElementById('jobList').innerHTML = d.jobs.map(j => {
    const cls = j.match >= 75 ? 'match-high' : j.match >= 55 ? 'match-mid' : 'match-low';
    const barColor = j.match >= 75 ? '#3dd68c' : j.match >= 55 ? '#f5a623' : '#e94560';
    return `
      <div class="job-item">
        <div class="job-avatar">${j.icon}</div>
        <div class="job-meta">
          <div class="title">${j.title}</div>
          <div class="company">${j.company}</div>
        </div>
        <div class="job-match-col">
          <div class="match-pct ${cls}">${j.match}%</div>
          <div class="match-bar-track">
            <div class="match-bar-fill" style="width:${j.match}%;background:${barColor}"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Suggestions
  document.getElementById('suggList').innerHTML =
    d.suggestions.map(s => `<li>${s}</li>`).join('');

  // Save to history
  const prev = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1].score : null;
  analysisHistory.push({
    title: d.title,
    score: d.score,
    date: new Date().toISOString().split('T')[0],
    prev,
    key
  });
  localStorage.setItem('resumeiq_history', JSON.stringify(analysisHistory));

  // Show panel
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-analysis').classList.add('active');
  document.getElementById('tab-analysis').disabled = false;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-panel="analysis"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Dashboard ─────────────────────────────────────────────────────
function initDashboard() {
  const scores = analysisHistory.map(h => h.score);
  const labels = analysisHistory.map(h => h.title.replace(' Resume', '').slice(0, 16));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const first = scores[0] || 0;
  const last = scores[scores.length - 1] || 0;

  document.getElementById('d-count').textContent = scores.length;
  document.getElementById('d-avg').textContent = avg;
  document.getElementById('d-best').textContent = best;
  document.getElementById('d-improve').textContent = (last - first >= 0 ? '+' : '') + (last - first);

  // Destroy old charts if they exist
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};

  const gridColor = 'rgba(255,255,255,0.06)';
  const labelColor = '#606075';

  // Trend line chart
  chartInstances.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'ATS Score',
        data: scores,
        borderColor: '#e94560',
        backgroundColor: 'rgba(233,69,96,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#e94560',
        pointRadius: 5,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 11 }, stepSize: 20 }
        },
        x: {
          grid: { display: false },
          ticks: { color: labelColor, font: { size: 10 }, maxRotation: 30 }
        }
      }
    }
  });

  // Skills pie chart
  chartInstances.pie = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Python/JS', 'SQL/DB', 'ML/AI', 'Infra/Cloud', 'Other'],
      datasets: [{
        data: [30, 20, 25, 15, 10],
        backgroundColor: ['#e94560', '#533483', '#0f3460', '#1a6b6b', '#3a3a5a'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: labelColor, font: { size: 11 }, boxWidth: 10, padding: 10 }
        }
      },
      cutout: '62%'
    }
  });

  // Bar chart
  chartInstances.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: labels.slice(0, 6),
      datasets: [{
        label: 'ATS Score',
        data: scores.slice(0, 6),
        backgroundColor: scores.slice(0, 6).map(s =>
          s >= 80 ? 'rgba(61,214,140,0.7)' : s >= 65 ? 'rgba(245,166,35,0.7)' : 'rgba(233,69,96,0.7)'),
        borderRadius: 5,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          min: 0, max: 100,
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 11 }, stepSize: 20 }
        },
        y: {
          grid: { display: false },
          ticks: { color: labelColor, font: { size: 11 } }
        }
      }
    }
  });
}

// ── History ───────────────────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('histList');
  const empty = document.getElementById('histEmpty');

  if (analysisHistory.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = [...analysisHistory].reverse().map((h, i) => {
    const delta = h.prev !== null ? h.score - h.prev : null;
    const deltaHtml = delta !== null
      ? `<div class="hist-delta ${delta >= 0 ? 'delta-up' : 'delta-dn'}">${delta >= 0 ? '+' : ''}${delta} pts</div>`
      : '';
    const formattedDate = h.date ? new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    return `
      <div class="history-item" onclick="viewHistory(${analysisHistory.length - 1 - i})">
        <div class="hist-ring">${h.score}</div>
        <div class="hist-info">
          <div class="hist-title">${h.title}</div>
          <div class="hist-date">${formattedDate}</div>
        </div>
        ${deltaHtml}
      </div>`;
  }).join('');
}

function viewHistory(index) {
  const entry = analysisHistory[index];
  if (entry && entry.key && SAMPLES[entry.key]) {
    processResume(entry.key, entry.title);
  }
}

// ── Event wiring ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) showPanel(btn.dataset.panel);
    });
  });

  // File input
  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

  // Drag & drop
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
});
