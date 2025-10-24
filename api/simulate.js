import fs from 'fs'; import path from 'path'; import Ajv from 'ajv'; import { scoreMatch, scorePromo, scoreAngle } from '../sim/scorers.js';
function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf-8')); }
export default async function handler(req,res){ try{ let payload={}; if(req.method==='POST'){ try{ payload=req.body||{};}catch{payload={};} }
  const base=process.cwd(), data=path.join(base,'data'), sch=path.join(base,'schemas');
  const roster=payload.roster||loadJSON(path.join(data,'roster.json'));
  const feuds=payload.feuds||loadJSON(path.join(data,'feuds.json'));
  const announcersAll=payload.announcers||loadJSON(path.join(data,'announcers.json'));
  const show=payload.show||loadJSON(path.join(data,'show.json'));
  const segments=payload.segments||loadJSON(path.join(data,'card_segments.json'));
  const ajv=new Ajv({allErrors:true,strict:false});
  const valW=ajv.compile(loadJSON(path.join(sch,'wrestler.json')));
  const valF=ajv.compile(loadJSON(path.join(sch,'feud.json')));
  const valS=ajv.compile(loadJSON(path.join(sch,'segment.json')));
  const valSh=ajv.compile(loadJSON(path.join(sch,'show.json')));
  const valA=ajv.compile(loadJSON(path.join(sch,'announcer.json')));
  for(const w of roster){ if(!valW(w)) return res.status(400).json({error:'Wrestler invalid',details:valW.errors}); }
  for(const f of feuds){ if(!valF(f)) return res.status(400).json({error:'Feud invalid',details:valF.errors}); }
  for(const a of announcersAll){ if(!valA(a)) return res.status(400).json({error:'Announcer invalid',details:valA.errors}); }
  if(!valSh(show)) return res.status(400).json({error:'Show invalid',details:valSh.errors});
  for(const s of segments){ if(!valS(s)) return res.status(400).json({error:'Segment invalid',details:valS.errors}); }
  const wrestlers=Object.fromEntries(roster.map(w=>[w.id,w])); const feudsById=Object.fromEntries(feuds.map(f=>[f.id,f])); const announcers=announcersAll.filter(a=>show.announcers.includes(a.id));
  const setOfPair=new Set((show.variety_memory?.recent_matchups||[]).map(p=>JSON.stringify(p.sort())));
  function recentMatchupsHas(pair){ return setOfPair.has(JSON.stringify([...pair].sort())); }
  let crowd=Math.max(0,Math.min(100, show.crowd_hotness_base+show.venue_quality*0.1));
  const results=[]; let prevType=null; const ordered=[...segments].sort((a,b)=>a.placement_idx-b.placement_idx);
  for(const seg of ordered){ const ctx={wrestlers,feudsById,announcers,show,preCrowd:crowd,recentMatchupsHas,prevType};
    let r; if(seg.type==='match') r=scoreMatch(seg,ctx); else if(seg.type==='promo') r=scorePromo(seg,ctx); else r=scoreAngle(seg,ctx);
    crowd=Math.max(0,Math.min(100,crowd+r.crowd_delta)); prevType=seg.type; results.push(r);
  }
  const weights=ordered.map((s,i)=>(i===2||i===5)?1.2:(i===7?1.5:1.0)); const sumW=weights.reduce((a,b)=>a+b,0);
  const showScore=Math.round(results.reduce((a,r,i)=>a+r.score*weights[i],0)/sumW);
  return res.status(200).json({show_id:show.id,show_score:showScore,segments:results}); }catch(e){ return res.status(500).json({error:e.message||'Server error'}); } }