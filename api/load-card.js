import { getCollection } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';
export default async function handler(req,res){
  try{
    const { id, name } = req.query || {};
    const col = await getCollection();
    let doc = null;
    if(id){ doc = await col.findOne({_id: new ObjectId(id)}); }
    else if(name){ doc = await col.findOne({ name }); }
    else return res.status(400).json({error:'Provide id or name'});
    if(!doc) return res.status(404).json({error:'Not found'});
    return res.status(200).json({ name: doc.name, payload: doc.payload, id: doc._id });
  }catch(e){
    return res.status(500).json({error: e.message || 'Server error'});
  }
}