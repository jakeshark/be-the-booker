// api/assets.js — returns roster/feuds/announcers/show from /data
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = (p) => path.join(ROOT, "data", p);

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); }
  catch { return null; }
}

export default async function handler(req, res) {
  try {
    const roster = safeReadJSON(DATA("roster.json")) || [];
    const feuds = safeReadJSON(DATA("feuds.json")) || [];
    const announcers = safeReadJSON(DATA("announcers.json")) || [];
    const show = safeReadJSON(DATA("show.json")) || null;
    res.status(200).json({ roster, feuds, announcers, show });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
