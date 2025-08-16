// ========= Helpers =========
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

const state = {
  skills: [],
  experience: [],
  education: [],
  projects: [],
  template: 'minimal',
  accent: '#3b82f6',
  jdKeywords: new Set(),
};

// --- small utils ---
function htmlEscape(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function norm(s){ return (s||'').toLowerCase().trim(); }
function tokenize(text){
  return text
    .toLowerCase()
    .replace(/[\(\)\[\]\{\},;:!?.]/g, ' ')
    .replace(/[/|]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const STOP = new Set([
  'and','or','the','a','an','with','to','of','for','on','in','by','at','as','is','are','be','from','this','that','will','you','we','they','our','their','your','include','including','ability','plus','good','strong','must','have','has','using','use','used'
]);

const SYN = new Map([
  ['js','javascript'],
  ['node','node.js'],
  ['nodejs','node.js'],
  ['ts','typescript'],
  ['py','python'],
  ['reactjs','react'],
  ['nextjs','next.js'],
  ['next','next.js'],
  ['html5','html'],
  ['css3','css'],
  ['tailwindcss','tailwind'],
  ['mui','material ui'],
  ['gcp','google cloud'],
  ['aws','amazon web services'],
  ['azure','microsoft azure'],
  ['postgres','postgresql'],
  ['sql server','mssql'],
]);

function normalizeToken(t){
  let x = t.trim().toLowerCase();
  if(SYN.has(x)) x = SYN.get(x);
  return x;
}

// ========= Preview helpers =========
function updateLinksLine() {
  const email = $('#email').value.trim();
  const phone = $('#phone').value.trim();
  const location = $('#location').value.trim();
  const website = $('#website').value.trim();

  const parts = [email, phone, location, website].filter(Boolean);
  $('#pv-links').textContent = parts.join(' | ') || 'email | phone | location | website';
}

function renderSkills() {
  const holder = $('#skillsList');
  holder.innerHTML = '';
  state.skills.forEach((s, i) => {
    const el = document.createElement('span');
    el.className = 'chip';
    el.innerHTML = `${s} <button title="Remove" data-i="${i}">×</button>`;
    holder.appendChild(el);
  });

  // preview + ATS highlighting
  const pv = $('#pv-skills');
  pv.innerHTML = '';
  const jd = state.jdKeywords;
  state.skills.forEach(s => {
    const li = document.createElement('li');
    const match = jd.has(normalizeToken(s));
    li.className = match ? 'skill-hit' : 'skill-miss';
    li.textContent = s;
    pv.appendChild(li);
  });

  $('#pv-skills-sec').style.display = state.skills.length ? '' : 'none';
  // refresh ATS score + missing list
  computeATS();
}

function makeCard(fields = [], onChange, options={}) {
  const card = document.createElement('div');
  card.className = 'card';

  const rows = fields.map(row => {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    row.forEach(f => {
      const label = document.createElement('label');
      label.innerHTML = `${f.label}<input placeholder="${f.placeholder || ''}" data-key="${f.key}">`;
      wrap.appendChild(label);
    });
    return wrap;
  });
  rows.forEach(r => card.appendChild(r));

  // Inline "Suggest with AI" for fields containing 'desc'
  const descInput = $('input[data-key="desc"]', card);
  if (descInput) {
    const sug = document.createElement('div');
    sug.className = 'suggest-inline';
    sug.innerHTML = `
      <button type="button" class="btn mini" data-suggest>✨ Suggest with AI</button>
      <span class="small">Autofill concise impact bullet.</span>
    `;
    descInput.closest('label').after(sug);
    sug.querySelector('[data-suggest]').addEventListener('click', () => {
      openSuggestModal(card, options.type || 'exp');
    });
  }

  const controls = document.createElement('div');
  controls.className = 'controls';
  const up = document.createElement('button'); up.className='btn'; up.textContent='↑';
  const down = document.createElement('button'); down.className='btn'; down.textContent='↓';
  const del = document.createElement('button'); del.className='btn danger'; del.textContent='Delete';
  controls.append(up, down, del);
  card.appendChild(controls);

  // events
  card.addEventListener('input', e => {
    if (e.target.matches('input, textarea')) onChange();
  });
  up.addEventListener('click', () => { card.previousElementSibling?.before(card); onChange(); });
  down.addEventListener('click', () => { card.nextElementSibling?.after(card); onChange(); });
  del.addEventListener('click', () => { card.remove(); onChange(); });

  return card;
}

// ========= Sections =========
function syncExperience() {
  state.experience = $$('#expWrap .card').map(card => {
    const get = k => $(`input[data-key="${k}"]`, card).value.trim();
    return {
      role: get('role'),
      company: get('company'),
      start: get('start'),
      end: get('end'),
      desc: get('desc'),
    };
  });

  const pv = $('#pv-exp');
  pv.innerHTML = '';
  state.experience.forEach(x => {
    if (!(x.role || x.company || x.start || x.end || x.desc)) return;
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <h3>${htmlEscape(x.role || '')} — ${htmlEscape(x.company || '')}</h3>
      <div class="meta">${htmlEscape(x.start || '')} – ${htmlEscape(x.end || 'Present')}</div>
      <div>${htmlEscape(x.desc || '')}</div>
    `;
    pv.appendChild(div);
  });
  $('#pv-exp-sec').style.display = pv.children.length ? '' : 'none';
  computeATS();
}

function syncEducation() {
  state.education = $$('#eduWrap .card').map(card => {
    const get = k => $(`input[data-key="${k}"]`, card).value.trim();
    return {
      degree: get('degree'),
      inst: get('inst'),
      year: get('year'),
      score: get('score'),
    };
  });
  const pv = $('#pv-edu'); pv.innerHTML = '';
  state.education.forEach(x => {
    if (!(x.degree || x.inst || x.year || x.score)) return;
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <h3>${htmlEscape(x.degree || '')} — ${htmlEscape(x.inst || '')}</h3>
      <div class="meta">${htmlEscape(x.year || '')}${x.score ? ' · ' + htmlEscape(x.score) : ''}</div>
    `;
    pv.appendChild(div);
  });
  $('#pv-edu-sec').style.display = pv.children.length ? '' : 'none';
}

function syncProjects() {
  state.projects = $$('#projWrap .card').map(card => {
    const get = k => $(`input[data-key="${k}"]`, card).value.trim();
    return {
      name: get('name'),
      tech: get('tech'),
      link: get('link'),
      desc: get('desc'),
    };
  });
  const pv = $('#pv-proj'); pv.innerHTML = '';
  state.projects.forEach(x => {
    if (!(x.name || x.tech || x.link || x.desc)) return;
    const div = document.createElement('div');
    div.className = 'item';
    const linkHtml = x.link ? ` — <a href="${x.link}" target="_blank" rel="noopener">${htmlEscape(x.link)}</a>` : '';
    div.innerHTML = `
      <h3>${htmlEscape(x.name || '')}${linkHtml}</h3>
      <div class="meta">${htmlEscape(x.tech || '')}</div>
      <div>${htmlEscape(x.desc || '')}</div>
    `;
    pv.appendChild(div);
  });
  $('#pv-proj-sec').style.display = pv.children.length ? '' : 'none';
  computeATS();
}

// ========= Suggestion Modal (Local stub) =========
let suggestTargetCard = null;
let suggestType = 'exp';

function openSuggestModal(card, type){
  suggestTargetCard = card;
  suggestType = type;
  const role = $('#role').value || 'Software Engineer';
  const name = $('#name').value || 'Candidate';
  const skills = state.skills.slice(0,6).join(', ');
  const company = $('input[data-key="company"]', card)?.value || '';
  const project = $('input[data-key="name"]', card)?.value || '';

  const lines = generateSuggestions({role, name, skills, company, project, type});
  const list = $('#suggestList'); list.innerHTML = '';
  lines.forEach((text, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" data-i="${i}"> ${htmlEscape(text)}</label>`;
    list.appendChild(li);
  });
  $('#suggestInfo').textContent = `Based on role: ${role}${company ? ` • company: ${company}`:''}${project ? ` • project: ${project}`:''}.`;
  $('#suggestModal').showModal();
}

function generateSuggestions({role, name, skills, company, project, type}){
  const base = [
    `Delivered impact by using ${skills} to ship features with quality and speed.`,
    `Collaborated cross-functionally to clarify requirements and reduce rework.`,
    `Owned end-to-end releases with testing, docs, and monitoring.`,
  ];
  const exp = [
    `Improved ${company||'the product'} performance by 20–40% via code-splitting and caching.`,
    `Cut defects by ~30% introducing automated checks and CI gates.`,
    `Reduced page load from 3.2s to ~1.4s using lazy loading and bundle trimming.`,
    `Built reusable components that decreased dev time by ~25%.`,
    `Mentored juniors; ran weekly reviews to uplift code quality.`,
  ];
  const proj = [
    `Architected ${project||'the project'} with clean modules; boosted maintainability.`,
    `Integrated auth, payments, and analytics with robust error handling.`,
    `Implemented responsive UI and accessibility (WCAG AA).`,
    `Designed schema & queries to lower DB cost by ~15%.`,
    `Containerized app for reproducible local dev and deployments.`,
  ];
  return [...base, ...(type==='exp'?exp:proj)];
}

$('#suggestClose')?.addEventListener('click', ()=> $('#suggestModal').close());
$('#suggestUse')?.addEventListener('click', ()=>{
  if(!suggestTargetCard) return;
  const sel = $$('#suggestList input[type="checkbox"]:checked').map(x=> x.parentElement.textContent.trim());
  const inp = $('input[data-key="desc"]', suggestTargetCard);
  const existing = inp.value.trim();
  inp.value = (existing ? existing + ' ' : '') + sel.join(' ');
  suggestTargetCard.dispatchEvent(new Event('input', {bubbles:true}));
  $('#suggestModal').close();
});

// ========= ATS Analyzer =========
function extractKeywordsFromJD(text){
  const tokens = tokenize(text).map(normalizeToken).filter(t => t.length>=3 && !STOP.has(t));
  // prefer likely tech/proper tokens, and unify common hyphenations
  const uniq = new Set(tokens);
  // Try to add some bi-grams (quick & dirty)
  const words = tokenize(text);
  for(let i=0;i<words.length-1;i++){
    const two = normalizeToken(words[i] + ' ' + words[i+1]);
    if(two.includes(' ')){
      // keep some known bigrams
      if(['machine learning','data science','problem solving','cloud computing','rest api','unit testing','test automation','design systems','project management','time management','react native','next.js','node.js','sql server','microsoft azure','amazon web services','google cloud'].includes(two)){
        uniq.add(two);
      }
    }
  }
  return uniq;
}

function resumeTokens(){
  const pool = [
    $('#summary').value,
    ...state.skills,
    ...state.experience.flatMap(e=>[e.role,e.company,e.desc]),
    ...state.projects.flatMap(p=>[p.name,p.tech,p.desc]),
    state.education.map(e=>e.degree).join(' '),
  ].join(' ');
  return new Set(tokenize(pool).map(normalizeToken).filter(t=>t.length>=3 && !STOP.has(t)));
}

function computeATS(){
  const jd = state.jdKeywords;
  if(!jd || jd.size===0){
    $('#atsBadge').textContent = 'ATS: —';
    $('#pv-missing').textContent = '';
    $('#missingKeywords').innerHTML = '';
    return 0;
  }
  const rez = resumeTokens();

  const hits = [...jd].filter(k => rez.has(k));
  const miss = [...jd].filter(k => !rez.has(k));

  const score = Math.round((hits.length / Math.max(1, jd.size)) * 100);
  $('#atsBadge').textContent = `ATS: ${score}%`;
  // show missing keywords below skills in preview
  $('#pv-missing').textContent = miss.length ? `Missing keywords: ${miss.slice(0,12).join(', ')}${miss.length>12?'…':''}` : '';
  // chips in panel
  const jdEl = $('#jdKeywords'); jdEl.innerHTML = '';
  [...jd].forEach(k=>{
    const span = document.createElement('span'); span.className='chip'; span.textContent=k; jdEl.appendChild(span);
  });
  const missEl = $('#missingKeywords'); missEl.innerHTML = '';
  miss.forEach(k=>{
    const span = document.createElement('span'); span.className='chip'; span.textContent=k; missEl.appendChild(span);
  });

  // re-render skills to color hits
  const pv = $('#pv-skills'); pv.innerHTML = '';
  state.skills.forEach(s=>{
    const li = document.createElement('li');
    const match = jd.has(normalizeToken(s));
    li.className = match ? 'skill-hit' : 'skill-miss';
    li.textContent = s;
    pv.appendChild(li);
  });

  return score;
}

// ========= Init UI =========
function addExperienceCard(prefill={}) {
  const fields = [
    [
      {label:'Role', key:'role', placeholder:'Frontend Developer'},
      {label:'Company', key:'company', placeholder:'Acme Inc.'},
    ],
    [
      {label:'Start', key:'start', placeholder:'Jan 2023'},
      {label:'End', key:'end', placeholder:'Present'},
    ],
    [
      {label:'Summary (1 line)', key:'desc', placeholder:'Built modern UI for…'},
      {label:'', key:'_pad', placeholder:''},
    ],
  ];
  const card = makeCard(fields, syncExperience, {type:'exp'});
  $('#expWrap').appendChild(card);
  // prefill
  $(`input[data-key="role"]`, card).value = prefill.role || '';
  $(`input[data-key="company"]`, card).value = prefill.company || '';
  $(`input[data-key="start"]`, card).value = prefill.start || '';
  $(`input[data-key="end"]`, card).value = prefill.end || '';
  $(`input[data-key="desc"]`, card).value = prefill.desc || '';
  syncExperience();
}

function addEducationCard(prefill={}) {
  const fields = [
    [
      {label:'Degree', key:'degree', placeholder:'B.E. CSE'},
      {label:'Institute', key:'inst', placeholder:'Anna University'},
    ],
    [
      {label:'Year', key:'year', placeholder:'2021'},
      {label:'Score / CGPA', key:'score', placeholder:'8.3 CGPA'},
    ],
  ];
  const card = makeCard(fields, syncEducation);
  $('#eduWrap').appendChild(card);
  $(`input[data-key="degree"]`, card).value = prefill.degree || '';
  $(`input[data-key="inst"]`, card).value = prefill.inst || '';
  $(`input[data-key="year"]`, card).value = prefill.year || '';
  $(`input[data-key="score"]`, card).value = prefill.score || '';
  syncEducation();
}

function addProjectCard(prefill={}) {
  const fields = [
    [
      {label:'Project Name', key:'name', placeholder:'EduTrends — AI Learning'},
      {label:'Tech Stack', key:'tech', placeholder:'React, Go, Firebase'},
    ],
    [
      {label:'Link', key:'link', placeholder:'https://…'},
      {label:'One-line summary', key:'desc', placeholder:'Gamified learning OS…'},
    ],
  ];
  const card = makeCard(fields, syncProjects, {type:'proj'});
  $('#projWrap').appendChild(card);
  $(`input[data-key="name"]`, card).value = prefill.name || '';
  $(`input[data-key="tech"]`, card).value = prefill.tech || '';
  $(`input[data-key="link"]`, card).value = prefill.link || '';
  $(`input[data-key="desc"]`, card).value = prefill.desc || '';
  syncProjects();
}

window.addEventListener('DOMContentLoaded', () => {
  // Text fields → preview
  ['name','role','summary','email','phone','location','website'].forEach(id => {
    $('#' + id).addEventListener('input', () => {
      $('#pv-name').textContent = $('#name').value || 'Your Name';
      $('#pv-role').textContent = $('#role').value || 'Your Role';
      $('#pv-summary').textContent = $('#summary').value || 'Write a concise, impact-driven summary here.';
      updateLinksLine();
      computeATS();
    });
  });

  // Skills chips
  $('#skillInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      state.skills.push(e.target.value.trim());
      e.target.value = '';
      renderSkills();
    }
  });
  $('#skillsList').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const i = Number(e.target.dataset.i);
      state.skills.splice(i, 1);
      renderSkills();
    }
  });

  // Add buttons
  $('#addExp').addEventListener('click', () => addExperienceCard());
  $('#addEdu').addEventListener('click', () => addEducationCard());
  $('#addProj').addEventListener('click', () => addProjectCard());

  // Template & color
  $('#templateSelect').addEventListener('change', (e) => {
    state.template = e.target.value;
    const el = $('#resume');
    el.classList.remove('minimal','modern','compact');
    el.classList.add(state.template);
  });
  const updateAccent = () => {
    state.accent = $('#accentColor').value;
    $('#resume').style.setProperty('--accent', state.accent);
  };
  $('#accentColor').addEventListener('input', updateAccent);
  updateAccent();

  // Print → PDF
  $('#printBtn').addEventListener('click', () => window.print());

  // Save/Load/Clear (localStorage)
  $('#saveBtn').addEventListener('click', () => {
    const payload = {
      basics: {
        name: $('#name').value, role: $('#role').value, summary: $('#summary').value,
        email: $('#email').value, phone: $('#phone').value, location: $('#location').value, website: $('#website').value,
      },
      skills: state.skills,
      experience: state.experience,
      education: state.education,
      projects: state.projects,
      template: state.template,
      accent: state.accent,
      jdKeywords: [...state.jdKeywords],
    };
    localStorage.setItem('resume-data', JSON.stringify(payload));
    alert('Saved locally ✓');
  });

  $('#loadBtn').addEventListener('click', () => {
    const raw = localStorage.getItem('resume-data');
    if (!raw) return alert('No saved data found.');
    const d = JSON.parse(raw);

    // basics
    $('#name').value = d.basics.name || '';
    $('#role').value = d.basics.role || '';
    $('#summary').value = d.basics.summary || '';
    $('#email').value = d.basics.email || '';
    $('#phone').value = d.basics.phone || '';
    $('#location').value = d.basics.location || '';
    $('#website').value = d.basics.website || '';
    $('#pv-name').textContent = d.basics.name || 'Your Name';
    $('#pv-role').textContent = d.basics.role || 'Your Role';
    $('#pv-summary').textContent = d.basics.summary || 'Write a concise, impact-driven summary here.';
    updateLinksLine();

    // skills
    state.skills = d.skills || [];
    renderSkills();

    // sections
    $('#expWrap').innerHTML=''; $('#eduWrap').innerHTML=''; $('#projWrap').innerHTML='';
    (d.experience||[]).forEach(addExperienceCard);
    (d.education||[]).forEach(addEducationCard);
    (d.projects||[]).forEach(addProjectCard);

    // template & color
    $('#templateSelect').value = d.template || 'minimal';
    $('#templateSelect').dispatchEvent(new Event('change'));
    $('#accentColor').value = d.accent || '#3b82f6';
    $('#accentColor').dispatchEvent(new Event('input'));

    // JD
    state.jdKeywords = new Set(d.jdKeywords || []);
    computeATS();
  });

  $('#clearBtn').addEventListener('click', () => {
    if(!confirm('Clear the form?')) return;
    localStorage.removeItem('resume-data');
    location.reload();
  });

  // ATS: analyze & clear
  $('#analyzeBtn').addEventListener('click', () => {
    const jd = $('#jdText').value.trim();
    if(!jd){ alert('Paste a Job Description first.'); return; }
    state.jdKeywords = extractKeywordsFromJD(jd);
    renderSkills(); // also recomputes ATS
  });
  $('#clearJD').addEventListener('click', () => {
    $('#jdText').value = '';
    state.jdKeywords.clear();
    renderSkills();
  });

  // Defaults
  addExperienceCard({ role:'Frontend Developer', company:'Freelance', start:'2023', end:'Present', desc:'Built responsive UIs and improved performance.' });
  addEducationCard({ degree:'B.E. CSE', inst:'Anna University', year:'2021', score:'8.3 CGPA' });
  addProjectCard({ name:'EduTrends', tech:'React • Go • Firebase', link:'', desc:'AI mentor bot and gamified learning OS.' });
  renderSkills();
  updateLinksLine();
});