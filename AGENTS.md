# AGENTS.md

How to keep this GitHub Pages site up to date. The page is static (`index.html`, `app.js`, `styles.css`) and renders `data/games.json`. Almost every change is a data change.

## Rules

- **LAN only.** Index a game only if it has real LAN play (system link, LAN lobby, direct IP to a machine on the local network, or a dedicated server run on the LAN). Local split-screen and online-only matchmaking do not count. Single-player games are left out.
- **PCGamingWiki is canonical** for LAN player counts. Its "Network > Multiplayer types > LAN play" row has a status, a player count and the modes the count covers. We do not use Co-Optimus anywhere: no lookups, no links, no source tag.
- **Co-op and versus are separate.** `coop` and `versus` each hold the most players one LAN session accepts in that mode, or `null` if the game lacks the mode.
- **Mods, ports and community servers are their own entries** when their limits can differ from the base game (Halo Project Reclaimer, Halo CE with Chimera, CoD4X, OpenJK, ioquake3, OpenRA). Set `mod` (a short label) and `modUrl` (its home page) on them.
- **No machine-specific details in the data.** Do not mention shortcuts, folders, drives, NAS shares, launchers, which edition we happen to own, or how we run a game. Notes describe the game, not our setup.
- **The page has no "where the numbers come from" section.** Provenance lives in the data (`src`) and shows only as a small tag on each count.

## Adding a game

1. Add an entry to `data/games.json` under `games`:

   ```json
   {
     "name": "Quake 4",
     "genre": "arena",
     "coop": { "n": 4, "src": "unverified" },
     "versus": { "n": 16, "src": "unverified" },
     "note": "Campaign co-op plus deathmatch"
   }
   ```

   - `genre` is one of the ids in `genres` (arena, tactical, coop, strategy, racing, party, survival). Add a genre object (`id`, `name`, `color`, `blurb`) if none fits; pick a colour that is not violet.
   - Start with placeholder counts and `"src": "unverified"`. PCGamingWiki overwrites them in step 4.
   - Check the game is not already listed (same game, different edition or launcher) before adding it.
2. Find its PCGamingWiki page title. If it is just the game's name, skip this step. If the wiki uses a different title, find it and add it to `data/pcgw-titles.json`:

   ```
   curl -s -A "LanPartyGamesIndex/1.0" "https://www.pcgamingwiki.com/w/api.php?action=opensearch&search=<name>&limit=5&format=json"
   ```

   ```json
   "Jedi Knight Academy": ["Jedi Academy"]
   ```

   The value is a list of titles to try, in order. Mods and builds that share a base game's page (OpenRA, SWAT 4 expansions) point at that page.
3. Fetch from PCGamingWiki, then review:

   ```
   node tools/update-pcgw.mjs "Quake 4"     # just this game
   node tools/update-pcgw.mjs               # every game
   ```

   This writes `data/pcgw.json` (page title, URL, LAN status, LAN players, LAN modes, notes, plus local/online fields for context). If a game prints under "No page found", fix its title in `pcgw-titles.json` and rerun.
4. Apply it:

   ```
   node tools/apply-pcgw.mjs --dry    # preview
   node tools/apply-pcgw.mjs          # write data/games.json
   ```

   What apply does:
   - LAN `true`, `limited` or `hackable` keeps the game. `limited` and `hackable` add a `pcgw.caveat` that the card shows.
   - LAN `false`, `unknown` or blank **removes** the game and records its name in `removedNoLan`.
   - A player count sets `n` and `"src": "pcgw"`. PCGamingWiki lists one count and a list of modes; the count goes to each mode in that list, or to every mode the game already has when no modes are listed.
   - It sets `pcgw.url` on each game, which becomes the card's PCGamingWiki link.
   - Games with no PCGamingWiki page (for example Mario Kart 8 Deluxe, a console game) are left untouched.
5. Preview and commit (see Testing).

### Overriding PCGamingWiki

PCGamingWiki's single LAN count can be wrong for one mode (Left 4 Dead 2 holds 4 in co-op, not 8). To keep a number, set `"pin": true` on that mode; apply will not overwrite it. For a mod or server whose own limits differ from the base game's page, set `"pcgwExempt": true` on the game and use one of these sources:

| `src` | Meaning |
| --- | --- |
| `pcgw` | LAN count from PCGamingWiki (canonical) |
| `checked` | Confirmed against another published source |
| `reported` | Hands-on knowledge from running it (Halo Project Reclaimer's 127, Mario Kart 8's 12) |
| `unverified` | Typical server cap; use only when nothing better exists |

Prefer a real source over `unverified`, and say what it was in the commit message.

### LAN script repos

Games with LAN server scripts get a `scripts` URL (the card shows a "LAN scripts" link). The list lives at https://zathu.net/#lan-vault. Current repos: `lanscript-cod4`, `lanscript-quake3`, `reclaimer-lan` (and `lanscript-cod5`, which has no matching game here). When a game gains a repo, add its GitHub URL as `scripts`.

## Fetching etiquette

- Use only `https://www.pcgamingwiki.com/w/api.php` (wikitext reads via `action=query&prop=revisions`). The scripts send a descriptive User-Agent, batch 25 titles per request and pause between batches.
- `index.php` endpoints such as `Special:CargoExport` sit behind a Cloudflare check, and the API refuses arbitrary Cargo queries. Do not try to get around either. If the API is unreachable, stop and tell the user.
- PCGamingWiki content is CC BY-NC-SA; the page footer credits it. Keep that line.

## Data shape

`data/games.json`: `{ sources, genres[], games[], removedNoLan[] }`. Game fields: `name`, `genre`, `coop`, `versus` (each `{ n, src, pin? }` or `null`), `note`, optional `mod`, `modUrl`, `scripts`, `pcgwExempt`, and the apply-written `pcgw` (`url`, `lan`, `checked`, `caveat?`). `data/pcgw.json` is the raw fetch cache keyed by game name. Keep both files pretty-printed with a trailing newline.

## Testing

The page fetches its data, so serve the folder:

```
python -m http.server 8000
```

Check that the game count matches, the new card renders with a PCGamingWiki link, and `?q=<name>` finds it (the text filter reads that parameter). Stop the server afterwards. Commit data and code together, with a message that says which games changed and why.
