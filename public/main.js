// Helper to call APIs
async function api(path, method='GET', body){
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ---- State ----
let ASSETS = { roster: [], feuds: [], announcers: [], show: null };
let CARD = [];           // segments you add here
let lastSimulation = null;

// ---- UI helpers ----
const $ = (id) => document.getElementById(id);
function setStatus(msg, cls='') {
  const el = $('status'); el.textContent = msg || '';
  el.className = 'muted ' + cls;
}

// ---- Load assets (roster/feuds/announcers/show) ----
async function loadAssets(){
  setStatus('Loading assets...');
  try{
    ASSETS = await api('/api/assets');
    // populate selects
    const pSel = $('segParticipants');
    pSel.innerHTML = ASSETS.roster.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    const fSel = $('segFeud');
    fSel.innerHTML = '<option value="">— none —</option>' + ASSETS.feuds.map(f => `<option value="${f.id}">${f.id}: ${f.participants.join(' vs ')}</option>`).join('');
    setStatus('Assets loaded', 'good');
  }catch(e){
    setStatus('Failed to load assets', 'danger');
    alert('Could not load /api/assets. Did you commit /data/*.json?');
  }
}

// ---- Render current card ----
function renderCard(){
  const root = $('cardList');
  if(CARD.length === 0) {
    root.innerHTML = '<p class="muted">No segments yet. Add one above.</p>';
    return;
  }
  root.innerHTML = CARD
    .sort((a,b)=>a.placement_idx - b.placement_idx)
    .map(seg => {
      const names = (seg.participants||[]).map(id => (ASSETS.roster.find(w=>w.id===id)||{}).name || id).join(' vs ');
      return `<div class="seg">
        <h4>[${seg.type.toUpperCase()}] ${seg.id} — ${names || '(no participants)'} </h4>
        <div class="muted">Duration: ${seg.duration_min} | Intent: ${seg.intent} | Stip: ${seg.stipulation||'—'} | Risk: ${seg.risk_level||'—'} | Title: ${!!seg.title_match} | Feud: ${seg.feud_id||'—'} | Place: ${seg.placement_idx}</div>
        <div class="row">
          <button onclick="editSeg('${seg.id}')">Edit</button>
          <button onclick="delSeg('${seg.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
}
window.editSeg = (id) => {
  const s = CARD.find(x => x.id === id);
  if(!s) return;
  $('segType').value = s.type;
  $('segIntent').value = s.intent;
  $('segDuration').value = s.duration_min;
  $('segStip').value = s.stipulation || '';
  $('segRisk').value = s.risk_level || 'low';
  $('segFeud').value = s.feud_id || '';
  $('segTitle').value = String(!!s.title_match);
  $('segInterf').value = s.interference || 'none';
  $('segPlacement').value = s.placement_idx;
  // participants
  [...$('segParticipants').options].forEach(o => o.selected = s.participants.includes(o.value));
};
window.delSeg = (id) => {
  CARD = CARD.filter(s => s.id !== id);
  renderCard();
};

// ---- Build a segment from the form ----
function buildSegmentFromForm(){
  const type = $('segType').value;
  const intent = $('segIntent').value;
  const duration = parseInt($('segDuration').value || '8', 10);
  const stip = $('segStip').value.trim() || 'standard';
  const risk = $('segRisk').value;
  const feat = $('segFeud').value; // may be ''
  const title = $('segTitle').value === 'true';
  const interf = $('segInterf').value;
  const place = parseInt($('segPlacement').value || '0', 10);
  const parts = [...$('segParticipants').selectedOptions].map(o => o.value);

  const id = `S${CARD.length+1}`;
  const seg = {
    id,
    type,
    participants: parts,
    duration_min: duration,
    intent,
    stipulation: stip,
    risk_level: risk,
    placement_idx: place,
    title_match: title,
    feud_id: feat || null,        // allow null
    interference: interf
  };
  return seg;
}

// ---- Assemble payload for /api/simulate ----
function assemblePayloadFromBuilder(){
  // Use assets (roster/feuds/announcers/show) + the CARD we built
  return {
    roster: ASSETS.roster,
    feuds: ASSETS.feuds,
    announcers: ASSETS.announcers,
    show: ASSETS.show,
    segments: CARD.slice().sort((a,b)=>a.placement_idx-b.placement_idx)
  };
}

// ---- Render results ----
function renderResults(out){
  lastSimulation = out;
  const results = document.getElementById('results');
  const summary = document.getElementById('summary');
  const segments = document.getElementById('segments');
  const recap = document.getElementById('recap');
  recap.classList.add('hidden'); recap.textContent = '';
  results.classList.remove('hidden');

  summary.innerHTML = `<div class="card">
    <h3>Show <span class="badge">${out.show_id || 'N/A'}</span></h3>
    <p class="score">Final Show Score: ${out.show_score}</p>
    <p class="small">Segments: ${out.segments.length}</p>
  </div>`;

  segments.innerHTML = out.segments.map(s => {
    const title = s.participants?.join(' vs. ') || '(non-match)';
    const explain = s.explain ? `<details><summary>Explain</summary><pre>${JSON.stringify(s.explain,null,2)}</pre></details>` : '';
    return `<div class="card">
      <h3>[${s.type.toUpperCase()}] ${s.id} — ${title}</h3>
      <p>Score: <strong>${s.score}</strong> &middot; Crowd Δ ${s.crowd_delta}</p>
      ${explain}
    </div>`;
  }).join('');
}

// ---- Wire buttons ----
$('addSegment').addEventListener('click', () => {
  const seg = buildSegmentFromForm();
  // basic guardrails
  if(seg.type === 'match' && seg.participants.length < 2){
    alert('Pick at least two participants for a match.'); return;
  }
  // replace existing with same placement? keep simple: just push
  CARD.push(seg);
  renderCard();
});

$('btnSimulate').addEventListener('click', async () => {
  try{
    const payload = assemblePayloadFromBuilder();
    setStatus('Simulating...');
    const out = await api('/api/simulate','POST',payload);
    renderResults(out);
    setStatus('Simulated ✓', 'good');
  }catch(e){
    setStatus('Simulation failed', 'danger');
    alert(e.message);
  }
});

// Existing demo/editor/recap flows
$('runDemo').addEventListener('click', async () => {
  try{ setStatus('Simulating demo...'); const out = await api('/api/simulate','POST',{}); renderResults(out); setStatus('Demo ✓', 'good'); }
  catch(e){ setStatus('Demo failed', 'danger'); alert(e.message); }
});

$('openEditor').addEventListener('click', () => $('editor').classList.remove('hidden'));
$('closeEditor').addEventListener('click', () => $('editor').classList.add('hidden'));

$('simulateCustom').addEventListener('click', async () => {
  try{
    const txt = $('jsonInput').value.trim();
    const payload = txt ? JSON.parse(txt) : {};
    setStatus('Simulating JSON...');
    const out = await api('/api/simulate','POST',payload);
    renderResults(out);
    setStatus('Simulated ✓', 'good');
  }catch(e){ setStatus('Simulation failed', 'danger'); alert('Invalid JSON or error: ' + e.message); }
});

$('makeRecap').addEventListener('click', async () => {
  try{
    if(!lastSimulation) return alert('Run a simulation first.');
    setStatus('Calling AI recap...');
    const { recap } = await api('/api/recap','POST',{ simulation: lastSimulation });
    const el = $('recap'); el.textContent = recap; el.classList.remove('hidden');
    setStatus('Recap ✓', 'good');
  }catch(e){
    setStatus('Recap failed', 'danger');
    alert(
      String(e.message).includes('429')
        ? 'Your OpenAI account has hit its usage limit. Check billing at platform.openai.com.'
        : e.message + '\n(Set OPENAI_API_KEY in Vercel env to use recap.)'
    );
  }
});

// Boot
loadAssets().then(renderCard);
