/* ============================================
   ResumeIQ — Application Logic (AI-powered)
   ============================================ */

// ── State ────────────────────────────────────────────────────────
let currentAnalysis = null;
let analysisHistory = JSON.parse(localStorage.getItem('resumeiq_history') || '[]');
let chartInstances = {};

// ── Navigation ───────────────────────────────────────────────────
function showPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  const tab = document.querySelector(`[data-panel="${panelId}"]`);
  if (tab) tab.classList.add('active');

  if (panelId === 'dashboard') initDashboard();
  if (panelId === 'history')   renderHistory();
  if (panelId === 'upload')    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── File Handling ─────────────────────────────────────────────────
function triggerUpload() {
  document.getElementById('fileInput').click();
}

async function handleFile(file) {
  if (!file) return;

  const allowedTypes = ['application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
    showError('Please upload a PDF, Word document (.doc/.docx), or plain text file.');
    return;
  }

  showProcessingPanel();

  try {
    const text = await extractText(file);
    if (!text || text.trim().length < 50) {
      showError('Could not extract readable text from this file. Please try a different format.');
      return;
    }
    await runAIAnalysis(text, file.name);
  } catch (err) {
    showError('Failed to read file: ' + err.message);
  }
}

// ── Text Extraction ───────────────────────────────────────────────
async function extractText(file) {
  // Plain text
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }

  // PDF — use PDF.js if available, else send raw to server
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    if (window.pdfjsLib) {
      return await extractPDFText(file);
    }
    // Fallback: send as base64 and let server handle it (or just send filename)
    return await readAsBase64Hint(file);
  }

  // DOC/DOCX — best effort: send raw text via FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      // Crude extraction: pull out visible ASCII strings from binary
      const raw = e.target.result;
      const text = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                      .replace(/\s{3,}/g, '\n')
                      .trim();
      resolve(text.length > 100 ? text : '');
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}

async function readAsBase64Hint(file) {
  // For unsupported formats, return a hint so the API still gets something
  return `[File: ${file.name}, Size: ${Math.round(file.size / 1024)}KB — binary format, extracting metadata only]`;
}

// ── Processing UI ────────────────────────────────────────────────
function showProcessingPanel() {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-processing').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Reset steps
  const steps = ['s1', 's2', 's3', 's4', 's5', 's6'];
  steps.forEach(s => {
    const el = document.getElementById(s);
    if (el) {
      el.className = '';
      const icon = el.querySelector('.step-icon');
      if (icon) icon.textContent = '◌';
    }
  });

  // Animate processing steps
  let i = 0;
  window._processingInterval = setInterval(() => {
    if (i > 0) {
      const prev = document.getElementById(steps[i - 1]);
      if (prev) {
        prev.classList.remove('active');
        prev.classList.add('done');
        const icon = prev.querySelector('.step-icon');
        if (icon) icon.textContent = '✓';
      }
    }
    if (i < steps.length) {
      const cur = document.getElementById(steps[i]);
      if (cur) {
        cur.classList.add('active');
        const icon = cur.querySelector('.step-icon');
        if (icon) icon.textContent = '▶';
      }
      i++;
    }
    // Don't stop — let it loop slowly while AI is working
    if (i >= steps.length) {
      clearInterval(window._processingInterval);
    }
  }, 700);
}

function stopProcessingAnimation() {
  if (window._processingInterval) {
    clearInterval(window._processingInterval);
  }
}

// ── AI API Call ───────────────────────────────────────────────────
async function runAIAnalysis(resumeText, filename) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, filename })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error || 'Analysis failed. Please try again.';
      showError(msg);
      return;
    }

    stopProcessingAnimation();
    currentAnalysis = data;
    renderAnalysis(data);

  } catch (err) {
    stopProcessingAnimation();
    showError('Network error: ' + err.message);
  }
}

// ── Error Display ─────────────────────────────────────────────────
function showError(message) {
  stopProcessingAnimation();
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-upload').classList.add('active');
  document.querySelector('[data-panel="upload"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Show error banner (create if doesn't exist)
  let banner = document.getElementById('error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'error-banner';
    banner.style.cssText = `
      background: rgba(233,69,96,0.15);
      border: 1px solid #e94560;
      border-radius: 10px;
      color: #e94560;
      padding: 14px 18px;
      margin: 16px 0;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    const dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.after(banner);
  }
  banner.innerHTML = `⚠️ ${message}`;
  banner.style.display = 'flex';
  setTimeout(() => { if (banner) banner.style.display = 'none'; }, 8000);
}

// ── Analysis Rendering ────────────────────────────────────────────
function renderAnalysis(d) {
  const circum = 2 * Math.PI * 50;
  const pct = d.score / 100;

  // Score ring
  setTimeout(() => {
    const ring = document.getElementById('ringFill');
    if (ring) {
      ring.style.strokeDasharray =
        `${(circum * pct).toFixed(1)} ${(circum * (1 - pct)).toFixed(1)}`;
    }
  }, 150);

  // Animated counter
  let current = 0;
  const target = d.score;
  const counter = setInterval(() => {
    current = Math.min(current + 2, target);
    const el = document.getElementById('scoreNum');
    if (el) el.textContent = current;
    if (current >= target) clearInterval(counter);
  }, 20);

  // Title
  const titleEl = document.getElementById('resumeTitle');
  if (titleEl) titleEl.textContent = d.title || 'Resume Analysis';

  // Verdict badge
  const vb = document.getElementById('verdictBadge');
  if (vb) {
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
  }

  // Section score bars
  const weights = { Skills: 40, Experience: 25, Projects: 20, Education: 15 };
  const scoreBars = document.getElementById('scoreBars');
  if (scoreBars && d.breakdown) {
    scoreBars.innerHTML = Object.entries(d.breakdown)
      .map(([k, v]) => `
        <div class="bar-item">
          <label><span>${k} (${weights[k] || 25}%)</span><span>${v}/100</span></label>
          <div class="bar-track">
            <div class="bar-fill" style="width: 0%" data-target="${v}"></div>
          </div>
        </div>`)
      .join('');

    setTimeout(() => {
      document.querySelectorAll('.bar-fill[data-target]').forEach(el => {
        el.style.width = el.dataset.target + '%';
      });
    }, 200);
  }

  // Skills found
  const skillsFound = document.getElementById('skillsFound');
  if (skillsFound && d.skills) {
    skillsFound.innerHTML = d.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
  }

  // Skills missing
  const skillsMissing = document.getElementById('skillsMissing');
  if (skillsMissing && d.missing) {
    skillsMissing.innerHTML = d.missing.map(s => `<span class="skill-tag missing">${s}</span>`).join('');
  }

  // Job matches
  const jobList = document.getElementById('jobList');
  if (jobList && d.jobs) {
    jobList.innerHTML = d.jobs.map(j => {
      const cls = j.match >= 75 ? 'match-high' : j.match >= 55 ? 'match-mid' : 'match-low';
      const barColor = j.match >= 75 ? '#3dd68c' : j.match >= 55 ? '#f5a623' : '#e94560';
      return `
        <div class="job-item">
          <div class="job-avatar">${j.icon || j.company?.slice(0,2) || '?'}</div>
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
  }

  // Suggestions
  const suggList = document.getElementById('suggList');
  if (suggList && d.suggestions) {
    suggList.innerHTML = d.suggestions.map(s => `<li>${s}</li>`).join('');
  }

  // Save to history
  const prev = analysisHistory.length > 0
    ? analysisHistory[analysisHistory.length - 1].score
    : null;
  analysisHistory.push({
    title: d.title || 'Resume',
    score: d.score,
    date: new Date().toISOString().split('T')[0],
    prev,
    data: d   // store full result for history replay
  });
  localStorage.setItem('resumeiq_history', JSON.stringify(analysisHistory));

  // Switch to analysis panel
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-analysis').classList.add('active');

  const analysisTab = document.getElementById('tab-analysis');
  if (analysisTab) analysisTab.disabled = false;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const analysisNavTab = document.querySelector('[data-panel="analysis"]');
  if (analysisNavTab) analysisNavTab.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Dashboard ─────────────────────────────────────────────────────
function initDashboard() {
  const scores = analysisHistory.map(h => h.score);
  const labels = analysisHistory.map(h => (h.title || 'Resume').replace(' Resume', '').slice(0, 16));
  const avg    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best   = scores.length ? Math.max(...scores) : 0;
  const first  = scores[0] || 0;
  const last   = scores[scores.length - 1] || 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('d-count',   scores.length);
  set('d-avg',     avg);
  set('d-best',    best);
  set('d-improve', (last - first >= 0 ? '+' : '') + (last - first));

  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};

  if (!scores.length) return;

  const gridColor  = 'rgba(255,255,255,0.06)';
  const labelColor = '#606075';

  const trendCanvas = document.getElementById('trendChart');
  if (trendCanvas) {
    chartInstances.trend = new Chart(trendCanvas, {
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
          y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: labelColor, stepSize: 20 } },
          x: { grid: { display: false }, ticks: { color: labelColor, maxRotation: 30 } }
        }
      }
    });
  }

  // Skill distribution from last analysis
  const lastData = analysisHistory[analysisHistory.length - 1]?.data;
  const pieCanvas = document.getElementById('pieChart');
  if (pieCanvas && lastData?.breakdown) {
    const bk = lastData.breakdown;
    chartInstances.pie = new Chart(pieCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(bk),
        datasets: [{
          data: Object.values(bk),
          backgroundColor: ['#e94560', '#533483', '#0f3460', '#1a6b6b'],
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
  }

  const barCanvas = document.getElementById('barChart');
  if (barCanvas) {
    chartInstances.bar = new Chart(barCanvas, {
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
          x: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: labelColor, stepSize: 20 } },
          y: { grid: { display: false }, ticks: { color: labelColor } }
        }
      }
    });
  }
}

// ── History ───────────────────────────────────────────────────────
function renderHistory() {
  const list  = document.getElementById('histList');
  const empty = document.getElementById('histEmpty');
  if (!list) return;

  if (analysisHistory.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = [...analysisHistory].reverse().map((h, i) => {
    const delta = h.prev !== null ? h.score - h.prev : null;
    const deltaHtml = delta !== null
      ? `<div class="hist-delta ${delta >= 0 ? 'delta-up' : 'delta-dn'}">${delta >= 0 ? '+' : ''}${delta} pts</div>`
      : '';
    const formattedDate = h.date
      ? new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const realIndex = analysisHistory.length - 1 - i;
    return `
      <div class="history-item" onclick="viewHistory(${realIndex})">
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
  if (entry?.data) {
    showProcessingPanel();
    setTimeout(() => {
      stopProcessingAnimation();
      renderAnalysis(entry.data);
    }, 1500);
  }
}

// ── Event Wiring ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) showPanel(btn.dataset.panel);
    });
  });

  // File input
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
  }

  // Drag & drop
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput?.click());
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  // Load PDF.js dynamically for better PDF text extraction
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  };
  document.head.appendChild(script);
});
