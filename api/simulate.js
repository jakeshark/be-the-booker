import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";


// === helpers ===============================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From /api, the project root is one folder up:
const ROOT = path.resolve(__dirname, "..");
const DATA = (p) => path.join(ROOT, "data", p);
const SCHEMAS = (p) => path.join(ROOT, "schemas", p);

function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    return null;
  }
}

// minimal fallback samples so GET /api/simulate won’t crash
const FALLBACK = {
  roster: [
    {
      "id":"nova","name":"Nova Nyx","alignment":"face",
      "attributes":{"workrate":79,"psychology":73,"charisma":82,"star_power":80,"selling":77,"stiffness":30,"safety":85,"mic_skill":88,"experience":66},
      "style_vector":{"brawler":0.1,"technical":0.3,"high_flyer":0.4,"power":0.1,"strong_style":0.0,"lucha":0.1},
      "pop":72,"morale":82,"momentum":18,"conditioning":88,"traits":["crowd_favorite","leader"],
      "chemistry_tags":["high_flyer","underdog"],"injury_status":{"status":"healthy","days_remaining":0},
      "fatigue":10,"region_pop_mod":{"Northeast":4}
    },
    {
      "id":"midas","name":"Magnus Midas","alignment":"heel",
      "attributes":{"workrate":68,"psychology":81,"charisma":90,"star_power":86,"selling":62,"stiffness":40,"safety":78,"mic_skill":92,"experience":82},
      "style_vector":{"brawler":0.2,"technical":0.5,"high_flyer":0.0,"power":0.3,"strong_style":0.0,"lucha":0.0},
      "pop":80,"morale":74,"momentum":25,"conditioning":70,"traits":["political","prima_donna"],
      "chemistry_tags":["talker","schemer"],"injury_status":{"status":"healthy","days_remaining":0},
      "fatigue":12,"region_pop_mod":{"Northeast":5}
    }
  ],
  feuds: [
    {"id":"nova_vs_midas","participants":["nova","midas"],"heat":62,"stakes":2,"arc_phase":"crisis","consistency":5,"chemistry":70,"need_resolution":false}
  ],
  announcers: [
    {"id":"pbp1","name":"Sam Slate","role":"pbp","skill":78,"brand_fit":80,"chemistry_map":{"col1":72}},
    {"id":"col1","name":"Rex Riot","role":"color","skill":74,"brand_fit":70,"chemistry_map":{"pbp1":72}}
  ],
  show: {
    "id":"TV-NE-001","brand_profile":65,"venue_quality":72,"production_level":75,
    "crowd_hotness_base":60,"network_morality":55,"card_time_cap":120,
    "announcers":["pbp1","col1"],"region":"Northeast",
    "variety_memory":{"recent_matchups":[["nova","midas"]],"recent_stips":["ladder"],"recent_types":["match","promo"]},
    "seed":123456
  },
  segments: [
    {"id":"S1","type":"match","participants":["nova","midas"],"duration_min":12,"intent":"crowd_work","stipulation":"standard","risk_level":"low","placement_idx":0,"title_match":true,"feud_id":"nova_vs_midas","interference":"none"}
  ]
};

// very small inline scorers (same logic as the scaffold; trimmed for clarity)
function clamp(x, min, max){ return Math.max(min, Math.min(max, x)); }
function gaussian(x, mu, sigma){ const z=(x-mu)/(sigma||1); return Math.exp(-0.5*z*z)*20-10; }
const T = {
  M_INRING:.35, M_PSYCH:.20, M_STAR:.25, M_CHEM:.20,
  M_FEUD:.08, M_STAKES:3, M_TITLE:4, M_CROWD:.05,
  M_REPEAT:6, M_ADJ:5, M_NOISE:2, M_ANN:.5, M_PROD:.4,
  P_MIC:.45, P_CHARISMA:.25, P_STAR:.15, P_PSYCH:.10, P_ANN:.05, P_ADV:4, P_DEBUT:6, P_NOISE:2,
  A_DRAMA:4, A_STAR:.2, A_HEAT:.08, A_PROD:.05
};
function announceScore(ann){ if(!ann?.length) return 0;
  const skills = ann.map(a=>a.skill||60).reduce((a,b)=>a+b,0)/ann.length;
  const pair = ann.length>=2?70:60; const fit = ann.map(a=>a.brand_fit||60).reduce((a,b)=>a+b,0)/ann.length;
  return .6*(.6*skills)+.4*((pair+fit)/2);
}
function scoreMatch(seg, ctx){
  const { wrestlers, feudsById, preCrowd, announcers, show } = ctx;
  const [aId,bId] = seg.participants; const A = wrestlers[aId].attributes; const B = wrestlers[bId].attributes;
  const inRing = ((A.workrate+A.selling)/2 + (B.workrate+B.selling)/2)/2;
  const psych  = (A.psychology+B.psychology+A.experience+B.experience)/4;
  const star   = (wrestlers[aId].pop+wrestlers[bId].pop+A.star_power+B.star_power)/4;
  const chem   = seg.feud_id && feudsById[seg.feud_id] ? feudsById[seg.feud_id].chemistry : 50;
  let base = T.M_INRING*inRing + T.M_PSYCH*psych + T.M_STAR*star + T.M_CHEM*chem;

  const feud = seg.feud_id ? feudsById[seg.feud_id] : null;
  const feudBonus = feud ? T.M_FEUD*feud.heat : 0;
  const stakes = (feud?feud.stakes:0)*T.M_STAKES + (seg.title_match?T.M_TITLE:0);
  const crowdBonus = T.M_CROWD * preCrowd;

  // crude length curve based on styles
  const sv = seg.participants.map(id => wrestlers[id].style_vector);
  const tech = sv.reduce((a,v)=>a+v.technical,0)/sv.length;
  const brawl= sv.reduce((a,v)=>a+v.brawler,0)/sv.length;
  const fly  = sv.reduce((a,v)=>a+v.high_flyer,0)/sv.length;
  let opt = 10 + 6*tech + 2*fly - 4*brawl; opt = clamp(opt,6,18);
  const lengthMod = gaussian(seg.duration_min, opt, 3);

  const repeatPenalty = 0, adjPenalty = 0, networkPenalty = 0;
  const ann = T.M_ANN * announceScore(announcers);
  const prod = T.M_PROD * show.production_level / 100;

  let raw = base + feudBonus + stakes + crowdBonus + lengthMod - repeatPenalty - adjPenalty - networkPenalty + ann + prod;
  let noise = (Math.random()*2*T.M_NOISE - T.M_NOISE);
  let score = clamp(raw + noise, 0, 100);
  const crowd_delta = Math.round((score - 50)/50 * 10);

  return { type:'match', id: seg.id, participants: seg.participants, score: Math.round(score), crowd_delta, explain:{ base:{inRing:inRing,psych,star,chem}, lengthMod } };
}

// === handler ===============================================================
export default async function handler(req, res){
  try{
    // 1) Load payload from POST body or fallback to repo files or to inline FALLBACK
    const body = req.method === "POST" ? (req.body || {}) : {};
    const roster = body.roster || safeReadJSON(DATA("roster.json")) || FALLBACK.roster;
    const feuds = body.feuds || safeReadJSON(DATA("feuds.json")) || FALLBACK.feuds;
    const announcers = body.announcers || safeReadJSON(DATA("announcers.json")) || FALLBACK.announcers;
    const show = body.show || safeReadJSON(DATA("show.json")) || FALLBACK.show;
    const segments = body.segments || safeReadJSON(DATA("card_segments.json")) || FALLBACK.segments;

    // 2) Validate with AJV (if schemas exist)
    const ajv = new Ajv({ allErrors: true, strict: false });
    const wS = safeReadJSON(SCHEMAS("wrestler.json"));
    const fS = safeReadJSON(SCHEMAS("feud.json"));
    const sS = safeReadJSON(SCHEMAS("segment.json"));
    const shS= safeReadJSON(SCHEMAS("show.json"));
    const aS = safeReadJSON(SCHEMAS("announcer.json"));
    if(wS){ const v=ajv.compile(wS); for(const w of roster){ if(!v(w)) return res.status(400).json({error:"Wrestler invalid", details:v.errors}); } }
    if(fS){ const v=ajv.compile(fS); for(const f of feuds){ if(!v(f)) return res.status(400).json({error:"Feud invalid", details:v.errors}); } }
    if(aS){ const v=ajv.compile(aS); for(const a of announcers){ if(!v(a)) return res.status(400).json({error:"Announcer invalid", details:v.errors}); } }
    if(shS){ const v=ajv.compile(shS); if(!v(show)) return res.status(400).json({error:"Show invalid", details:v.errors}); }
    if(sS){ const v=ajv.compile(sS); for(const s of segments){ if(!v(s)) return res.status(400).json({error:"Segment invalid", details:v.errors}); } }

    // 3) Index & simulate (minimal)
    const wrestlers = Object.fromEntries(roster.map(w => [w.id, w]));
    const feudsById = Object.fromEntries(feuds.map(f => [f.id, f]));
    let crowd = clamp(show.crowd_hotness_base + show.venue_quality*0.1, 0, 100);

    const ordered = [...segments].sort((a,b)=>a.placement_idx - b.placement_idx);
    const results = [];
    for(const seg of ordered){
      if(seg.type === "match"){
        const r = scoreMatch(seg, { wrestlers, feudsById, preCrowd:crowd, announcers, show });
        crowd = clamp(crowd + r.crowd_delta, 0, 100);
        results.push(r);
      } else {
        // keep prototype tiny; treat others as neutral for now
        results.push({ type: seg.type, id: seg.id, participants: seg.participants || [], score: 60, crowd_delta: 0, explain: { note: "Prototype path" }});
      }
    }

    // 4) Show score (simple mean for now)
    const showScore = Math.round(results.reduce((a,r)=>a+r.score,0) / results.length);

    return res.status(200).json({ show_id: show.id, show_score: showScore, segments: results });
  }catch(e){
    // Return the error so we can see it in the browser
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
