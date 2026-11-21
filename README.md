# LAN Party Games

A GitHub Pages site listing every game on our LAN machine, grouped by genre, with the largest **co-op** and **versus** lobby each supports over a local network.

## Run it locally

The page loads `data/games.json`, so serve the folder rather than opening `index.html` directly:

    python -m http.server 8000

## Edit the data

Everything lives in `data/games.json`.

- `coop` / `versus`: `{ "n": <max players>, "src": "co-optimus" | "checked" | "unverified" }`, or `null` if the game has no such mode.
- `src` marks where a number came from. Co-Optimus only covers co-op games, so most entries are `unverified` (the usual server cap). Fix a number and change its `src` when you confirm it.
- Games with no multiplayer are left out.

## Publish

Repo Settings > Pages > Deploy from branch > `main` / root.
