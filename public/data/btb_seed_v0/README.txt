
Be The Booker — Ready-To-Load Seed (v0)
=======================================
Generated: 2025-10-24T14:27:36.201275Z

How to use this:
----------------
1) Copy the whole folder `btb_seed_v0` into your web app. Easiest path:
   - If you're using Next.js or Vite:
     put the folder at: `public/data/btb_seed_v0/`
     (so files resolve as `/data/btb_seed_v0/wrestlers.json`, etc.)

2) In your UI code, use the provided loader (ts/js):
   - Save `btbSeed.ts` in your project (e.g., `src/lib/btbSeed.ts`).
   - Example usage:
       import { loadSeed } from "@/lib/btbSeed";
       const data = await loadSeed(); // loads everything

3) What’s included
   - wrestlers.json      (IDs + names, plus raw "extras" for all other columns)
   - teams.json          (member_ids filled when we could match names; unmatched left in `unresolved_member_names`)
   - stables.json        (same idea as teams)
   - relationships.json  (basic pairs from relate.dat; unknown types marked "unknown")
   - staff.json, sponsors.json, networks.json, tv_shows.json, events.json, belts.json, promos.json
   - gameinfo_raw.json, alter_raw.json (for completeness)

4) Notes
   - This seed prefers **simple & safe** defaults.
   - We kept all original columns in `extras` so you don't lose any info.
   - We auto-created stable IDs from names (slugified). Duplicates are disambiguated.

5) Next improvements (optional)
   - If you want teams/stables perfectly linked: rename wrestlers so names match the team/stable lists exactly.
   - If your game needs more fields (like overness/charisma): pick them from `wrestlers[i].extras.col_*` and map in your code.

Enjoy!
