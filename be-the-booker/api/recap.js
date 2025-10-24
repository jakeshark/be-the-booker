import OpenAI from 'openai';
export default async function handler(req,res){
  try{
    if(req.method!=='POST') return res.status(405).json({error:'Use POST'});
    const { simulation } = req.body || {};
    if(!simulation) return res.status(400).json({error:'Missing simulation'});
    if(!process.env.OPENAI_API_KEY) return res.status(400).json({error:'Missing OPENAI_API_KEY'});

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are an excited but professional wrestling TV recap writer.
Given this JSON of a simulated show, write:
1) A tight TV recap (150-250 words) with commentary flavor and 2-3 memorable lines.
2) Three short locker-room emails: one request, one complaint, one medical/ops note.
JSON:\n\n${JSON.stringify(simulation, null, 2)}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Be concise, coherent, and avoid contradictions. Do not invent winners if not provided."},
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const text = completion.choices[0].message.content;
    return res.status(200).json({ recap: text });
  }catch(e){
    return res.status(500).json({error: e.message || 'Server error'});
  }
}