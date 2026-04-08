/* ============================================
   ResumeIQ — app.js
   ============================================ */

// ── Sample data (for the 3 demo cards) ──────────────────────────
var SAMPLES = {
  ds: {
    title: 'Data Scientist Resume', score: 82,
    breakdown: { Skills: 88, Experience: 80, Projects: 75, Education: 85 },
    skills: ['Python','SQL','Machine Learning','TensorFlow','Pandas','NumPy','Scikit-learn','Jupyter','R','Statistics'],
    missing: ['Apache Spark','Airflow','dbt','Tableau','BigQuery'],
    jobs: [
      { title:'Data Scientist',   company:'Google',    icon:'G',  match:88 },
      { title:'ML Engineer',      company:'Meta',      icon:'M',  match:75 },
      { title:'Data Analyst',     company:'Stripe',    icon:'S',  match:70 },
      { title:'BI Developer',     company:'Salesforce',icon:'SF', match:45 }
    ],
    suggestions: [
      'Add Apache Spark — required in 68% of Senior Data Scientist listings.',
      'Include 2-3 end-to-end ML projects with measurable outcomes.',
      'Quantify impact: "improved model accuracy by 12% (F1: 0.91)" beats vague claims.',
      'Add a GitHub or Kaggle portfolio link in your resume header.',
      'Add a Data Engineering section (dbt, Airflow) to qualify for hybrid DS/DE roles.'
    ]
  },
  fe: {
    title: 'Frontend Developer Resume', score: 74,
    breakdown: { Skills: 78, Experience: 70, Projects: 80, Education: 68 },
    skills: ['React','TypeScript','JavaScript','CSS','HTML','Figma','Webpack','Jest','Git'],
    missing: ['Next.js','GraphQL','AWS','Docker','CI/CD','Tailwind CSS'],
    jobs: [
      { title:'Frontend Engineer', company:'Airbnb', icon:'A',  match:82 },
      { title:'UI Engineer',       company:'Vercel', icon:'V',  match:78 },
      { title:'Full-Stack Dev',    company:'Notion', icon:'N',  match:62 },
      { title:'Mobile Dev (RN)',   company:'Shopify',icon:'SH', match:38 }
    ],
    suggestions: [
      'Add Next.js — appears in 72% of React job listings as a hard requirement.',
      'Deploy a portfolio with live links and Lighthouse scores (aim 90+).',
      'Add GraphQL to unlock full-stack and API-heavy roles.',
      'Mention performance metrics: bundle size, LCP, TTI numbers.',
      'Add CI/CD exposure (GitHub Actions, Vercel deploys).'
    ]
  },
  be: {
    title: 'Backend Engineer Resume', score: 58,
    breakdown: { Skills: 55, Experience: 50, Projects: 65, Education: 60 },
    skills: ['Node.js','MongoDB','Express.js','REST APIs','Git','JavaScript'],
    missing: ['PostgreSQL','Docker','Kubernetes','Redis','AWS','TypeScript'],
    jobs: [
      { title:'Backend Engineer', company:'Twilio',   icon:'T', match:58 },
      { title:'Full-Stack Dev',   company:'Startup',  icon:'★', match:65 },
      { title:'API Developer',    company:'RapidAPI', icon:'R', match:52 },
      { title:'DevOps Engineer',  company:'HashiCorp',icon:'H', match:22 }
    ],
    suggestions: [
      'Add PostgreSQL — #1 required database skill for backend roles.',
      'Learn Docker basics and containerize a project.',
      'Quantify experience even for freelance or internship work.',
      'Switch Node.js projects to TypeScript and list it prominently.',
      'Consider AWS Cloud Practitioner certification.'
    ]
  }
};

// ── State ────────────────────────────────────────────────────────
var analysisHistory = [];
try { analysisHistory = JSON.parse(localStorage.getItem('riq_h') || '[]'); } catch(e) {}

// ── Navigation ───────────────────────────────────────────────────
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  var panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  var tab = document.querySelector('[data-panel="' + id + '"]');
  if (tab) tab.classList.add('active');
  if (id === 'dashboard') drawDashboard();
  if (id === 'history') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── File upload ──────────────────────────────────────────────────
function triggerUpload() {
  document.getElementById('fileInput').click();
}

function handleFile(file) {
  if (!file) return;
  if (!file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
    showError('Please upload a PDF, DOCX, or TXT file.');
    return;
  }
  startProcessing();
  extractText(file).then(function(text) {
    if (!text || text.trim().length < 50) {
      showError('Could not extract text from this file. Try saving as PDF or TXT.');
      return;
    }
    callAPI(text, file.name);
  }).catch(function(err) {
    showError('Failed to read file: ' + err.message);
  });
}

function extractText(file) {
  // Plain text
  if (file.name.match(/\.txt$/i)) return file.text();
  // PDF via PDF.js
  if (file.name.match(/\.pdf$/i) && window.pdfjsLib) {
    return file.arrayBuffer().then(function(buf) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function(pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) pages.push(i);
      return Promise.all(pages.map(function(n) {
        return pdf.getPage(n).then(function(pg) {
          return pg.getTextContent().then(function(c) {
            return c.items.map(function(it){ return it.str; }).join(' ');
          });
        });
      }));
    }).then(function(arr){ return arr.join('\n'); });
  }
  // DOCX/DOC — crude ASCII extraction
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{4,}/g, '\n').trim();
      resolve(text.length > 100 ? text : '');
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

// ── Sample cards ─────────────────────────────────────────────────
function loadSample(key) {
  startProcessing();
  var steps = ['s1','s2','s3','s4','s5','s6'];
  var i = 0;
  var iv = setInterval(function() {
    if (i > 0) markStep(steps[i-1], 'done');
    if (i < steps.length) { markStep(steps[i], 'active'); i++; }
    else { clearInterval(iv); setTimeout(function(){ renderAnalysis(SAMPLES[key]); }, 300); }
  }, 380);
}

// ── Processing ───────────────────────────────────────────────────
function startProcessing() {
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('panel-processing').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  ['s1','s2','s3','s4','s5','s6'].forEach(function(id) { markStep(id, ''); });
  window._procTimer = null;
  // Animate steps while waiting for API
  var i = 0;
  var steps = ['s1','s2','s3','s4','s5','s6'];
  window._procTimer = setInterval(function() {
    if (i > 0) markStep(steps[i-1], 'done');
    if (i < steps.length) { markStep(steps[i], 'active'); i++; }
    else clearInterval(window._procTimer);
  }, 600);
}

function stopProcessing() {
  if (window._procTimer) clearInterval(window._procTimer);
}

function markStep(id, state) {
  var el = document.getElementById(id);
  if (!el) return;
  el.className = state;
  var si = el.querySelector('.si');
  if (!si) return;
  if (state === 'done') si.textContent = 'v';
  else if (state === 'active') si.textContent = '>';
  else si.textContent = 'o';
}

// ── API call ─────────────────────────────────────────────────────
function callAPI(resumeText, filename) {
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: resumeText, filename: filename || 'resume' })
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(result) {
    stopProcessing();
    if (!result.ok) {
      showError(result.data.error || 'Analysis failed. Please try again.');
      return;
    }
    renderAnalysis(result.data);
  })
  .catch(function(err) {
    stopProcessing();
    showError('Network error: ' + err.message);
  });
}

// ── Error ────────────────────────────────────────────────────────
function showError(msg) {
  stopProcessing();
  showPanel('upload');
  var banner = document.getElementById('error-banner');
  if (banner) {
    banner.textContent = '⚠️ ' + msg;
    banner.style.display = 'block';
    setTimeout(function(){ banner.style.display = 'none'; }, 8000);
  }
}

// ── Render analysis ───────────────────────────────────────────────
function renderAnalysis(d) {
  // Score ring (circumference of r=54 circle = 339.3)
  var circ = 2 * Math.PI * 54;
  setTimeout(function() {
    var ring = document.getElementById('ringFill');
    if (ring) ring.setAttribute('stroke-dasharray',
      (circ * d.score / 100).toFixed(1) + ' ' + (circ * (1 - d.score / 100)).toFixed(1));
  }, 150);

  // Animated counter
  var cur = 0;
  var iv = setInterval(function() {
    cur = Math.min(cur + 2, d.score);
    var el = document.getElementById('scoreNum');
    if (el) el.textContent = cur;
    if (cur >= d.score) clearInterval(iv);
  }, 18);

  // Title
  var titleEl = document.getElementById('resumeTitle');
  if (titleEl) titleEl.textContent = d.title || 'Resume Analysis';

  // Verdict
  var vb = document.getElementById('verdictBadge');
  if (vb) {
    if (d.score >= 80) { vb.textContent = 'Strong Resume ✓'; vb.className = 'verdict v-good'; }
    else if (d.score >= 65) { vb.textContent = 'Needs Improvement'; vb.className = 'verdict v-mid'; }
    else { vb.textContent = 'Below ATS Threshold'; vb.className = 'verdict v-low'; }
  }

  // Score bars
  var wts = { Skills:40, Experience:25, Projects:20, Education:15 };
  var sb = document.getElementById('scoreBars');
  if (sb && d.breakdown) {
    sb.innerHTML = Object.keys(d.breakdown).map(function(k) {
      var v = d.breakdown[k];
      return '<div class="bar-item"><label><span>' + k + ' (' + (wts[k]||25) + '%)</span><span>' + v + '/100</span></label>'
        + '<div class="bar-track"><div class="bar-fill" data-t="' + v + '"></div></div></div>';
    }).join('');
    setTimeout(function() {
      document.querySelectorAll('.bar-fill[data-t]').forEach(function(el) { el.style.width = el.dataset.t + '%'; });
    }, 200);
  }

  // Skills
  var sf = document.getElementById('skillsFound');
  if (sf && d.skills) sf.innerHTML = d.skills.map(function(s){ return '<span class="sk">' + s + '</span>'; }).join('');
  var sm = document.getElementById('skillsMissing');
  if (sm && d.missing) sm.innerHTML = d.missing.map(function(s){ return '<span class="sk miss">' + s + '</span>'; }).join('');

  // Jobs
  var jl = document.getElementById('jobList');
  if (jl && d.jobs) {
    jl.innerHTML = d.jobs.map(function(j) {
      var cls = j.match >= 75 ? 'mhi' : j.match >= 55 ? 'mmi' : 'mlo';
      var bc  = j.match >= 75 ? '#3dd68c' : j.match >= 55 ? '#f5a623' : '#e94560';
      return '<div class="job-row">'
        + '<div class="javatar">' + (j.icon || (j.company||'?').slice(0,2)) + '</div>'
        + '<div class="jmeta"><div class="jtitle">' + j.title + '</div><div class="jco">' + j.company + '</div></div>'
        + '<div class="jmatch"><div class="mpct ' + cls + '">' + j.match + '%</div>'
        + '<div class="mbar"><div class="mbar-fill" style="width:' + j.match + '%;background:' + bc + '"></div></div></div>'
        + '</div>';
    }).join('');
  }

  // Suggestions
  var sl = document.getElementById('suggList');
  if (sl && d.suggestions) sl.innerHTML = d.suggestions.map(function(s){ return '<li>' + s + '</li>'; }).join('');

  // Save to history
  var prev = analysisHistory.length ? analysisHistory[analysisHistory.length - 1].score : null;
  analysisHistory.push({ title: d.title || 'Resume', score: d.score,
    date: new Date().toISOString().split('T')[0], prev: prev, data: d });
  try { localStorage.setItem('riq_h', JSON.stringify(analysisHistory)); } catch(e) {}

  // Switch to analysis panel
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('panel-analysis').classList.add('active');
  var at = document.getElementById('tab-analysis');
  if (at) at.disabled = false;
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  var an = document.querySelector('[data-panel="analysis"]');
  if (an) an.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SVG Charts (no dependencies) ────────────────────────────────
function svgNS(tag, attrs) {
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attrs).forEach(function(k){ el.setAttribute(k, attrs[k]); });
  return el;
}
function svgTxt(txt, attrs) {
  var el = svgNS('text', attrs);
  el.textContent = txt;
  return el;
}

function drawDashboard() {
  var scores = analysisHistory.map(function(h){ return h.score; });
  var labels = analysisHistory.map(function(h){ return (h.title||'').replace(' Resume','').slice(0,14); });
  var avg    = scores.length ? Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length) : 0;
  var best   = scores.length ? Math.max.apply(null,scores) : 0;
  var imp    = scores.length ? (scores[scores.length-1] - scores[0]) : 0;

  function set(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  set('d-count', scores.length);
  set('d-avg',   avg);
  set('d-best',  best);
  set('d-improve', scores.length ? (imp >= 0 ? '+' : '') + imp : '—');

  drawTrend(scores, labels);
  var lastData = analysisHistory.length ? analysisHistory[analysisHistory.length-1].data : null;
  drawDonut(lastData);
  drawBars(scores.slice(-6), labels.slice(-6));
}

function drawTrend(scores, labels) {
  var svg = document.getElementById('trendSvg');
  if (!svg) return;
  svg.innerHTML = '';
  if (!scores.length) return;
  var W=400,H=200,pl=40,pr=20,pt=16,pb=40;
  var iW=W-pl-pr, iH=H-pt-pb;
  function sx(i){ return pl + i*(iW/Math.max(scores.length-1,1)); }
  function sy(v){ return pt + iH - (v/100)*iH; }
  // Grid
  [0,25,50,75,100].forEach(function(v){
    var y=sy(v);
    svg.appendChild(svgNS('line',{x1:pl,y1:y,x2:W-pr,y2:y,stroke:'rgba(255,255,255,0.06)','stroke-width':'1'}));
    svg.appendChild(svgTxt(v,{x:pl-6,y:y+4,'text-anchor':'end','font-size':'10',fill:'#505065','font-family':'monospace'}));
  });
  // Area
  if (scores.length > 1) {
    var d = 'M'+sx(0)+','+sy(scores[0])+' '+scores.map(function(v,i){return 'L'+sx(i)+','+sy(v);}).join(' ')
      +' L'+sx(scores.length-1)+','+(pt+iH)+' L'+sx(0)+','+(pt+iH)+' Z';
    svg.appendChild(svgNS('path',{d:d,fill:'rgba(233,69,96,0.08)'}));
    var ld='M'+scores.map(function(v,i){return sx(i)+','+sy(v);}).join(' L');
    svg.appendChild(svgNS('path',{d:ld,fill:'none',stroke:'#e94560','stroke-width':'2','stroke-linejoin':'round'}));
  }
  // Points
  scores.forEach(function(v,i){
    svg.appendChild(svgNS('circle',{cx:sx(i),cy:sy(v),r:'5',fill:'#e94560'}));
    svg.appendChild(svgNS('circle',{cx:sx(i),cy:sy(v),r:'3',fill:'#0d0d14'}));
    svg.appendChild(svgTxt(v,{x:sx(i),y:sy(v)-10,'text-anchor':'middle','font-size':'11','font-weight':'700',fill:'#f0f0f5','font-family':'monospace'}));
    svg.appendChild(svgTxt((labels[i]||'').slice(0,12),{x:sx(i),y:H-6,'text-anchor':'middle','font-size':'9',fill:'#505065'}));
  });
}

function drawDonut(lastData) {
  var svg = document.getElementById('pieSvg');
  if (!svg) return;
  svg.innerHTML = '';
  var bk = (lastData && lastData.breakdown) ? lastData.breakdown : {Skills:0,Experience:0,Projects:0,Education:0};
  var keys = Object.keys(bk), vals = keys.map(function(k){return bk[k];});
  var total = vals.reduce(function(a,b){return a+b;},0) || 1;
  var colors = ['#e94560','#533483','#0f3460','#1a6b6b'];
  var cx=130,cy=110,R=80,r=50,angle=-Math.PI/2;
  keys.forEach(function(k,i){
    var sweep = 2*Math.PI*vals[i]/total;
    var x1=cx+R*Math.cos(angle),y1=cy+R*Math.sin(angle);
    var x2=cx+R*Math.cos(angle+sweep),y2=cy+R*Math.sin(angle+sweep);
    var xi1=cx+r*Math.cos(angle),yi1=cy+r*Math.sin(angle);
    var xi2=cx+r*Math.cos(angle+sweep),yi2=cy+r*Math.sin(angle+sweep);
    var lg=sweep>Math.PI?1:0;
    var path='M '+x1+' '+y1+' A '+R+' '+R+' 0 '+lg+' 1 '+x2+' '+y2
      +' L '+xi2+' '+yi2+' A '+r+' '+r+' 0 '+lg+' 0 '+xi1+' '+yi1+' Z';
    svg.appendChild(svgNS('path',{d:path,fill:colors[i]}));
    // Legend
    var ly=30+i*32;
    svg.appendChild(svgNS('rect',{x:'240',y:ly,width:'12',height:'12',rx:'3',fill:colors[i]}));
    svg.appendChild(svgTxt(k,{x:'260',y:ly+10,'font-size':'12',fill:'#9090a8'}));
    svg.appendChild(svgTxt(vals[i],{x:'390',y:ly+10,'text-anchor':'end','font-size':'12','font-weight':'700',fill:'#f0f0f5','font-family':'monospace'}));
    angle+=sweep;
  });
}

function drawBars(scores, labels) {
  var svg = document.getElementById('barSvg');
  if (!svg) return;
  svg.innerHTML = '';
  if (!scores.length) return;
  var W=800,bH=32,gap=14,pl=170,pr=30,pt=10;
  var totalH = pt + scores.length*(bH+gap);
  svg.setAttribute('viewBox','0 0 '+W+' '+totalH);
  svg.style.height = totalH + 'px';
  var iW=W-pl-pr;
  scores.forEach(function(v,i){
    var y=pt+i*(bH+gap);
    var bw=v/100*iW;
    var bc=v>=80?'rgba(61,214,140,0.75)':v>=65?'rgba(245,166,35,0.75)':'rgba(233,69,96,0.75)';
    svg.appendChild(svgNS('rect',{x:pl,y:y,width:iW,height:bH,rx:'6',fill:'rgba(255,255,255,0.04)'}));
    svg.appendChild(svgNS('rect',{x:pl,y:y,width:bw,height:bH,rx:'6',fill:bc}));
    svg.appendChild(svgTxt(labels[i]||'',{x:pl-10,y:y+bH/2+5,'text-anchor':'end','font-size':'12',fill:'#9090a8'}));
    svg.appendChild(svgTxt(v,{x:pl+bw+8,y:y+bH/2+5,'font-size':'12','font-weight':'700',fill:'#f0f0f5','font-family':'monospace'}));
  });
}

// ── History ───────────────────────────────────────────────────────
function renderHistory() {
  var list  = document.getElementById('histList');
  var empty = document.getElementById('histEmpty');
  if (!list) return;
  if (!analysisHistory.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = analysisHistory.slice().reverse().map(function(h, i) {
    var idx = analysisHistory.length - 1 - i;
    var delta = h.prev !== null && h.prev !== undefined ? h.score - h.prev : null;
    var dh = delta !== null ? '<div class="hdelta ' + (delta>=0?'dup':'ddn') + '">' + (delta>=0?'+':'') + delta + ' pts</div>' : '';
    var dt = h.date ? new Date(h.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '';
    return '<div class="hist-item" onclick="replayHistory(' + idx + ')">'
      + '<div class="hring">' + h.score + '</div>'
      + '<div class="hinfo"><div class="htitle">' + h.title + '</div><div class="hdate">' + dt + '</div></div>'
      + dh + '</div>';
  }).join('');
}

function replayHistory(idx) {
  var entry = analysisHistory[idx];
  if (entry && entry.data) {
    startProcessing();
    setTimeout(function() {
      stopProcessing();
      // Mark all done
      ['s1','s2','s3','s4','s5','s6'].forEach(function(id){ markStep(id,'done'); });
      setTimeout(function(){ renderAnalysis(entry.data); }, 300);
    }, 1200);
  }
}

// ── Event wiring ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.tab').forEach(function(btn) {
    btn.addEventListener('click', function() { if (!btn.disabled) showPanel(btn.dataset.panel); });
  });

  var fi = document.getElementById('fileInput');
  if (fi) fi.addEventListener('change', function(e) {
    var f = e.target.files[0];
    e.target.value = '';
    if (f) handleFile(f);
  });

  var dz = document.getElementById('dropZone');
  if (dz) {
    dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', function(){ dz.classList.remove('drag'); });
    dz.addEventListener('drop', function(e){
      e.preventDefault(); dz.classList.remove('drag');
      var f = e.dataTransfer.files[0]; if (f) handleFile(f);
    });
    dz.addEventListener('click', function(e){
      if (e.target.tagName !== 'SPAN') triggerUpload();
    });
  }
});
