// Applies data/pcgw.json (PCGamingWiki, canonical) to data/games.json.
//
//   node tools/apply-pcgw.mjs           apply and write
//   node tools/apply-pcgw.mjs --dry     print what would change, write nothing
//
// Rules (see AGENTS.md):
//  - LAN "true", "limited" or "hackable" keeps the game; "false", "unknown" or blank removes it.
//    Games with no PCGamingWiki page, and games marked "pcgwExempt", are left alone.
//  - A player count from PCGamingWiki overwrites a mode's count unless that mode is pinned ("pin": true).
//  - PCGamingWiki gives one LAN count for all modes. Its "modes" list says which modes that count covers.
//    With no modes listed, the count is applied to every mode the game already has.
import fs from "node:fs";

const dry = process.argv.includes("--dry");
const data = JSON.parse(fs.readFileSync("data/games.json", "utf8"));
const pcgw = JSON.parse(fs.readFileSync("data/pcgw.json", "utf8"));

const KEEP = new Set(["true", "limited", "hackable"]);
const log = [];
const removed = [];

const next = [];
for (const g of data.games) {
  const p = pcgw[g.name];
  if (!p || !p.page) { next.push(g); continue; }               // no PCGamingWiki page: leave as is
  g.pcgw = { url: p.url, lan: p.lan || "unknown", checked: p.fetched };
  if (g.pcgwExempt) { next.push(g); continue; }
  if (!KEEP.has(p.lan)) { removed.push(`${g.name} (LAN: ${p.lan || "blank"})`); continue; }

  const n = parseInt(p.lanPlayers, 10);
  if (Number.isFinite(n)) {
    const modes = (p.lanModes || "").toLowerCase();
    const hasCoop = /co-?op/.test(modes);
    const hasVersus = /versus|pvp|deathmatch/.test(modes);
    const set = (key) => {
      const cur = g[key];
      if (cur && cur.pin) return;
      if (cur && cur.n === n && cur.src === "pcgw") return;
      log.push(`${g.name}: ${key} ${cur ? cur.n : "none"} -> ${n}`);
      g[key] = { n, src: "pcgw" };
    };
    if (!modes) { if (g.coop) set("coop"); if (g.versus) set("versus"); }
    else { if (hasCoop) set("coop"); if (hasVersus) set("versus"); }
  }
  if (p.lan !== "true") g.pcgw.caveat = p.lan;                  // "limited" or "hackable"
  next.push(g);
}

data.games = next;
data.removedNoLan = [...new Set([...(data.removedNoLan || []), ...removed.map((r) => r.replace(/ \(LAN:.*\)$/, ""))])];
data.sources.pcgw = "PCGamingWiki, the canonical source for LAN player counts";

console.log("Changed counts:\n  " + (log.join("\n  ") || "none"));
console.log("Removed (no confirmed LAN on PCGamingWiki):\n  " + (removed.join("\n  ") || "none"));
if (!dry) { fs.writeFileSync("data/games.json", JSON.stringify(data, null, 2) + "\n"); console.log("Wrote data/games.json"); }
