# Wrestling Booker Simulator — Web (Vercel, OpenAI recap, MongoDB)

A Vercel-ready web app with:
- Front end in `/public`
- Simulator API `/api/simulate.js`
- AI recap API `/api/recap.js` (uses `OPENAI_API_KEY`)
- Persistence APIs `/api/save-card.js` and `/api/load-card.js` (uses `MONGODB_URI`)
- JSON Schemas for validation (AJV)
- Sample dataset in `/data`

## Local Dev
```bash
npm i -g vercel
vercel login
npm install
vercel dev
```
Open http://localhost:3000

## Deploy
```bash
vercel
```

## Environment Variables (Vercel → Project → Settings → Environment Variables)
- `OPENAI_API_KEY` — for `/api/recap.js`
- `MONGODB_URI` — e.g. mongodb+srv://user:pass@cluster0.x.mongodb.net
- `MONGODB_DB` — database name (default: `ewr`)
- `MONGODB_COLLECTION` — collection name (default: `cards`)

## Endpoints
- `POST /api/simulate` — body can include `roster, feuds, announcers, show, segments`. If omitted, uses `/data` defaults.
- `POST /api/recap` — body: `{ "simulation": <output from /api/simulate> }` → returns recap text + emails.
- `POST /api/save-card` — body: `{ "name": string, "payload": { roster, feuds, announcers, show, segments } }` → returns `_id`.
- `GET /api/load-card?id=<id>` or `GET /api/load-card?name=<name>` — returns stored payload.

## Where to tweak
- `sim/tunables.js` — scoring knobs.
- `public/main.js` — UI; calls APIs.
- `api/recap.js` — prompt style for recaps.
