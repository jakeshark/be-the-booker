async function api(path, method='GET', body){ 
  const res = await fetch(path, { method, headers:{'Content-Type':'application/json'}, body: body?JSON.stringify(body):undefined });
  const json = await res.json();
  if(!res.ok) throw new Error(json.error || 'Request failed'); 
  return json;
}

let lastSimulation = null;

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

document.getElementById('runDemo').addEventListener('click', async () => {
  try{ const out = await api('/api/simulate','POST',{}); renderResults(out); }catch(e){ alert(e.message); }
});

document.getElementById('openEditor').addEventListener('click', () => { document.getElementById('editor').classList.remove('hidden'); });
document.getElementById('closeEditor').addEventListener('click', () => { document.getElementById('editor').classList.add('hidden'); });

document.getElementById('simulateCustom').addEventListener('click', async () => {
  try{
    const txt = document.getElementById('jsonInput').value.trim();
    const payload = txt ? JSON.parse(txt) : {};
    const out = await api('/api/simulate','POST',payload);
    renderResults(out);
  }catch(e){ alert('Invalid JSON or error: ' + e.message); }
});

document.getElementById('makeRecap').addEventListener('click', async () => {
  try{
    if(!lastSimulation) return alert('Run a simulation first.');
    const { recap } = await api('/api/recap','POST',{ simulation: lastSimulation });
    const el = document.getElementById('recap'); el.textContent = recap; el.classList.remove('hidden');
  }catch(e){ alert(e.message + '\n(Set OPENAI_API_KEY in Vercel env to use recap.)'); }
});

document.getElementById('saveCard').addEventListener('click', async () => {
  try{
    const txt = document.getElementById('jsonInput').value.trim();
    const payload = txt ? JSON.parse(txt) : {};
    const name = prompt('Name this card:');
    if(!name) return;
    const r = await api('/api/save-card','POST',{ name, payload });
    alert('Saved with id: ' + r.id);
  }catch(e){ alert(e.message + '\n(Set MONGODB_URI in Vercel env to use save/load.)'); }
});

document.getElementById('loadCard').addEventListener('click', async () => {
  try{
    const q = document.getElementById('loadId').value.trim();
    if(!q) return;
    const r = await fetch('/api/load-card?' + (q.match(/^[0-9a-fA-F]{24}$/)?'id=':'name=') + encodeURIComponent(q));
    const json = await r.json();
    if(!r.ok) throw new Error(json.error || 'Load failed');
    document.getElementById('jsonInput').value = JSON.stringify(json.payload, null, 2);
    alert('Loaded: ' + (json.name || json.id));
  }catch(e){ alert(e.message); }
});
