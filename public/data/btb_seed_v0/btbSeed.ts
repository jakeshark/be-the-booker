// btbSeed.ts — tiny loader for the seed JSON files (drop into your app)
export type Wrestler = { id:string; ring_name:string; extras?:Record<string,string> };
export type Team     = { id:string; name:string; member_ids:string[]; unresolved_member_names?:string[] };
export type Stable   = { id:string; name:string; member_ids:string[]; unresolved_member_names?:string[] };

export async function loadSeed(baseUrl = "/data/btb_seed_v0") {
  const fetchJSON = (p: string) => fetch(`${baseUrl}/${p}`).then(r => r.json());
  const [
    wrestlers, teams, stables, relationships,
    staff, sponsors, networks, tv_shows, events, belts, promos
  ] = await Promise.all([
    fetchJSON("wrestlers.json"),
    fetchJSON("teams.json"),
    fetchJSON("stables.json"),
    fetchJSON("relationships.json"),
    fetchJSON("staff.json"),
    fetchJSON("sponsors.json"),
    fetchJSON("networks.json"),
    fetchJSON("tv_shows.json"),
    fetchJSON("events.json"),
    fetchJSON("belts.json"),
    fetchJSON("promos.json"),
  ]);
  // quick maps
  const wrestlersById = Object.fromEntries(wrestlers.map((w:any) => [w.id, w]));
  return { wrestlers, teams, stables, relationships, staff, sponsors, networks, tv_shows, events, belts, promos, wrestlersById };
}