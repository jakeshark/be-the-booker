import { getCollection } from '../lib/mongo.js';
export default async function handler(req,res){
  try{
    if(req.method!=='POST') return res.status(405).json({error:'Use POST'});
    const { name, payload } = req.body || {};
    if(!name || !payload) return res.status(400).json({error:'name and payload are required'});
    const col = await getCollection();
    const doc = { name, payload, createdAt: new Date() };
    const r = await col.insertOne(doc);
    return res.status(200).json({ id: r.insertedId });
  }catch(e){
    return res.status(500).json({error: e.message || 'Server error'});
  }
}