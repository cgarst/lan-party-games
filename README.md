# LAN Party Games

A GitHub Pages site listing every game on our LAN machine, grouped by genre, with the largest **co-op** and **versus** lobby each supports over a local network.

## Run it locally

The page loads `data/games.json`, so serve the folder rather than opening `index.html` directly:

    python -m http.server 8000

## Edit the data

Everything lives in `data/games.json`.

- `coop` / `versus`: `{ "n": <max players>, "src": "pcgw" | "checked" | "reported" | "unverified" }`, or `null` if the game has no such mode.
- `src` marks where a number came from. `pcgw` is PCGamingWiki, the canonical source; the other values are for numbers PCGamingWiki lacks. See AGENTS.md for how to refresh it.
- Games with no multiplayer are left out.

## Publish

Repo Settings > Pages > Deploy from branch > `main` / root.
