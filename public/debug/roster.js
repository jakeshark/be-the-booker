const BASE = "/data/btb_seed_v0"; // where you put the seed JSONs under /public

async function loadSeed() {
  const get = (p) => fetch(`${BASE}/${p}`).then(r => r.json());
  const [
    wrestlers, teams, stables, relationships,
    staff, sponsors, networks, tv_shows, events, belts, promos
  ] = await Promise.all([
    get("wrestlers.json"),
    get("teams.json"),
    get("stables.json"),
    get("relationships.json"),
    get("staff.json"),
    get("sponsors.json"),
    get("networks.json"),
    get("tv_shows.json"),
    get("events.json"),
    get("belts.json"),
    get("promos.json"),
  ]);

  const wrestlersById = Object.fromEntries(wrestlers.map(w => [w.id, w]));
  return { wrestlers, teams, stables, relationships, staff, sponsors, networks, tv_shows, events, belts, promos, wrestlersById };
}

function text(el, v){ el.textContent = v; }

function renderCounts(data) {
  text(document.querySelector("#count-wrestlers"), data.wrestlers.length);
  text(document.querySelector("#count-teams"), data.teams.length);
  text(document.querySelector("#count-stables"), data.stables.length);
  text(document.querySelector("#count-belts"), data.belts.length);
  text(document.querySelector("#count-events"), data.events.length);
  text(document.querySelector("#count-tv"), data.tv_shows.length);
  text(document.querySelector("#count-networks"), data.networks.length);
  text(document.querySelector("#count-staff"), data.staff.length);
  text(document.querySelector("#count-sponsors"), data.sponsors.length);
  text(document.querySelector("#count-promos"), data.promos.length);
}

function renderWrestlers(data, query="") {
  const target = document.querySelector("#wrestlers");
  target.innerHTML = "";
  const q = query.trim().toLowerCase();
  const items = data.wrestlers.filter(w => !q || w.ring_name.toLowerCase().includes(q)).slice(0, 200);
  for (const w of items) {
    const card = document.createElement("div");
    card.className = "card";
    const title = document.createElement("div");
    title.innerHTML = `<strong>${w.ring_name}</strong><span class="pill">${w.id}</span>`;
    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = (w.extras?.col_2 || "").trim() ? `Extra: ${w.extras.col_2}` : "";
    card.append(title, meta);
    target.append(card);
  }
}

function renderTeams(data) {
  const el = document.querySelector("#teams-list");
  el.innerHTML = "";
  for (const t of data.teams.slice(0, 200)) {
    const names = (t.member_ids || []).map(id => data.wrestlersById[id]?.ring_name || id);
    const unresolved = (t.unresolved_member_names || []).join(", ");
    const li = document.createElement("li");
    li.innerHTML = `<strong>${t.name}</strong> — Members: ${names.length ? names.join(", ") : "(none matched)"}${unresolved ? ` • Unresolved: ${unresolved}` : ""}`;
    el.append(li);
  }
}

function renderStables(data) {
  const el = document.querySelector("#stables-list");
  el.innerHTML = "";
  for (const s of data.stables.slice(0, 200)) {
    const names = (s.member_ids || []).map(id => data.wrestlersById[id]?.ring_name || id);
    const unresolved = (s.unresolved_member_names || []).join(", ");
    const li = document.createElement("li");
    li.innerHTML = `<strong>${s.name}</strong> — Members: ${names.length ? names.join(", ") : "(none matched)"}${unresolved ? ` • Unresolved: ${unresolved}` : ""}`;
    el.append(li);
  }
}

(async () => {
  const status = document.querySelector("#status");
  try {
    const data = await loadSeed();
    document.querySelector("#counts").style.display = "";
    document.querySelector("#search").style.display = "";
    document.querySelector("#teams").style.display = "";
    document.querySelector("#stables").style.display = "";
    status.remove();

    renderCounts(data);
    renderWrestlers(data);

    const q = document.querySelector("#q");
    q.addEventListener("input", () => renderWrestlers(data, q.value));

    renderTeams(data);
    renderStables(data);
  } catch (e) {
    console.error(e);
    status.textContent = "Could not load data. Check that /public/data/btb_seed_v0/* files exist.";
  }
})();
