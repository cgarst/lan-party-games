// Refreshes data/pcgw.json from PCGamingWiki (the canonical source for LAN player counts).
//
//   node tools/update-pcgw.mjs            fetch every game in data/games.json
//   node tools/update-pcgw.mjs "Quake 4"  fetch only the named game(s)
//
// Reads the wikitext of each game's page through the MediaWiki API (api.php) in small batches and pulls
// the "Network/Multiplayer" block. Local-play and online-play fields are kept for context, but only LAN counts.
// See AGENTS.md for the full update workflow.
import fs from "node:fs";

const GAMES_FILE = "data/games.json";
const TITLES_FILE = "data/pcgw-titles.json";
const OUT_FILE = "data/pcgw.json";
const UA = "LanPartyGamesIndex/1.0 (personal LAN party list; batched API reads)";
const BATCH = 25;
const PAUSE_MS = 1500;

const games = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8")).games;
const titles = fs.existsSync(TITLES_FILE) ? JSON.parse(fs.readFileSync(TITLES_FILE, "utf8")) : {};
const previous = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) : {};

const only = process.argv.slice(2);
const targets = only.length ? games.filter((g) => only.includes(g.name)) : games;
if (only.length && targets.length !== only.length) {
  const known = new Set(games.map((g) => g.name));
  throw new Error("Not in games.json: " + only.filter((n) => !known.has(n)).join(", "));
}

const candidates = (name) => titles[name] || [name];
const wanted = [...new Set(targets.flatMap((g) => candidates(g.name)))];

async function readPages(batch) {
  const url = new URL("https://www.pcgamingwiki.com/w/api.php");
  url.search = new URLSearchParams({
    action: "query", prop: "revisions", rvprop: "content", rvslots: "main",
    redirects: "1", format: "json", titles: batch.join("|")
  });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`PCGamingWiki API returned HTTP ${res.status}`);
  return res.json();
}

// Reads "| key = value" lines from the Network/Multiplayer template only.
function multiplayerBlock(text) {
  const start = text.indexOf("{{Network/Multiplayer");
  if (start < 0) return null;
  const end = text.indexOf("\n}}", start);
  const fields = {};
  for (const line of text.slice(start, end < 0 ? undefined : end).split("\n")) {
    const m = line.match(/^\s*\|\s*([a-z ]+?)\s*=\s*(.*)$/i);
    if (m) fields[m[1].toLowerCase()] = m[2].trim();
  }
  return fields;
}

const plain = (s = "") =>
  s.replace(/<ref[\s\S]*?(\/>|<\/ref>)/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/'{2,}/g, "")
    .trim();

const pageUrl = (title) => "https://www.pcgamingwiki.com/wiki/" + encodeURIComponent(title.replace(/ /g, "_")).replace(/%3A/g, ":").replace(/%2C/g, ",").replace(/%27/g, "'");

const found = {};
for (let i = 0; i < wanted.length; i += BATCH) {
  const batch = wanted.slice(i, i + BATCH);
  const res = await readPages(batch);
  const normalized = Object.fromEntries((res.query.normalized || []).map((n) => [n.from, n.to]));
  const redirected = Object.fromEntries((res.query.redirects || []).map((r) => [r.from, r.to]));
  const byTitle = Object.fromEntries(Object.values(res.query.pages).map((p) => [p.title, p]));
  for (const asked of batch) {
    const step = normalized[asked] || asked;
    const real = redirected[step] || step;
    const page = byTitle[real];
    if (!page || page.missing !== undefined) { found[asked] = null; continue; }
    const text = page.revisions?.[0]?.slots?.main?.["*"] || "";
    const f = multiplayerBlock(text);
    found[asked] = {
      page: page.title,
      url: pageUrl(page.title),
      hasNetworkBlock: !!f,
      lan: f?.["lan play"] ?? "",
      lanPlayers: f?.["lan play players"] ?? "",
      lanModes: plain(f?.["lan play modes"]),
      lanNotes: plain(f?.["lan play notes"]),
      local: f?.["local play"] ?? "",
      localPlayers: f?.["local play players"] ?? "",
      online: f?.["online play"] ?? "",
      onlinePlayers: f?.["online play players"] ?? ""
    };
  }
  if (i + BATCH < wanted.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
}

const out = { ...previous };
const missing = [];
for (const g of targets) {
  const options = candidates(g.name).map((c) => found[c]).filter(Boolean);
  const hit = options.find((p) => p.hasNetworkBlock) || options[0];
  if (hit) out[g.name] = { ...hit, fetched: new Date().toISOString().slice(0, 10) };
  else { out[g.name] = { page: null, tried: candidates(g.name) }; missing.push(g.name); }
}

// Drop entries for games that were removed from games.json.
const names = new Set(games.map((g) => g.name));
for (const k of Object.keys(out)) if (!names.has(k)) delete out[k];

fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n");
console.log(`Fetched ${targets.length} game(s); ${missing.length} without a PCGamingWiki page.`);
if (missing.length) console.log("No page found (add a title to " + TITLES_FILE + "): " + missing.join(" | "));
for (const g of targets) {
  const v = out[g.name];
  if (v.page) console.log(`${g.name} => [${v.page}] lan=${v.lan || "-"} players=${v.lanPlayers || "-"} modes=${v.lanModes || "-"}`);
}
