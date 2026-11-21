/* LAN party simulator: a small top-down pixel RPG that lives in the hero.
   Self-contained. Reads data/games.json only for game names to "install". */
(() => {
  "use strict";
  const root = document.getElementById("rpg");
  if (!root) return;

  // ---------- constants ----------
  const W = 384, H = 256, T = 16, COLS = 24, ROWS = 16;
  const MIN_SEC = 0.5;                 // real seconds per game minute at 1x
  const DAY_START = 720, DAY_END = 1290; // 12:00 PM .. 9:30 PM
  const FONT = '8px "Press Start 2P", monospace';

  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmt = (t) => { const h = Math.floor(t / 60) % 24, m = Math.floor(t % 60); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const toF = (c) => Math.round(c * 9 / 5 + 32);

  // ---------- content ----------
  const TIERS = [
    { cpu: "Pentium III 733", gpu: "GeForce2 MX", ram: "128 MB", os: "Windows 98 SE", speed: 0.25, crt: true, upd: "ScanDisk is checking drive C:", dur: 30 },
    { cpu: "Pentium 4 2.4", gpu: "GeForce FX 5200", ram: "512 MB", os: "Windows XP", speed: 0.4, crt: true, upd: "Installing Service Pack 2 (1 of 140)", dur: 60 },
    { cpu: "Athlon 64 3200+", gpu: "GeForce 6200", ram: "1 GB", os: "Windows XP", speed: 0.6, crt: true, upd: "Installing Service Pack 3 (1 of 90)", dur: 50 },
    { cpu: "Core 2 Duo E6600", gpu: "GeForce 8500 GT", ram: "4 GB", os: "Windows Vista", speed: 1, crt: false, upd: "Installing update 3 of 87", dur: 45 },
    { cpu: "Core i3-2100", gpu: "GeForce GT 430", ram: "8 GB", os: "Windows 7", speed: 1.5, crt: false, upd: "Configuring Windows updates", dur: 40 },
    { cpu: "Core i5-6600", gpu: "GeForce GT 1030", ram: "16 GB", os: "Windows 10", speed: 2.2, crt: false, upd: "Working on updates. Don't turn off your computer.", dur: 55 },
    // Only ever your own rig: modern 2026 hardware.
    { cpu: "Ryzen 7 9800X3D", gpu: "GeForce RTX 5080", ram: "32 GB DDR5", os: "Windows 11", speed: 4, crt: false, upd: "Working on updates. Don't turn off your computer.", dur: 25 },
    { cpu: "Core Ultra 9 285K", gpu: "GeForce RTX 5090", ram: "64 GB DDR5", os: "Windows 11", speed: 5, crt: false, upd: "Working on updates. Don't turn off your computer.", dur: 20 }
  ];
  const WASTE = [
    "It will run every game here at 900 FPS and nobody will care. Total waste.",
    "Four thousand dollars of hardware, about to play Counter-Strike 1.6 against a Pentium III.",
    "The RTX will idle at 3% while everyone else argues about pizza. Tragic.",
    "It could run anything on this list in 4K. The party runs on 640x480 and vibes.",
    "Your GPU is about to spend nine hours rendering a 2004 deathmatch. It deserves better."
  ];
  const NAMES = ["Zathu", "Nephron", "Lanarchy", "Blacktwin", "Meatpipe", "Wham", "Yung", "CainDeMoore", "Maxim", "Trees", "bortio", "Joe", "Tyrelie", "vrt"];
  const MEM_LINES = ["Justler would have loved this.", "Jeffro would've camped that corner.", "gg, Justler.", "Jeffro never even needed the CD key.", "Somewhere, Justler is winning.", "Miss you, Jeffro."];
  const FIXED = ["Nephron", "Tyrelie", "CainDeMoore"]; // always here, on their own schedules
  const SKINS = ["#f1c7a0", "#e0a97a", "#c68a5e", "#8d5a3b", "#6b4129", "#f5d6b8"];
  const HAIRS = ["#2b1d12", "#5a3a22", "#b5651d", "#d9b36c", "#1d1d24", "#8a3b2a", "#4a6fa5", "#7a3fa0"];
  const SHIRTS = ["#3fd0c9", "#ffc531", "#a6e05a", "#5b8def", "#e08fb0", "#f08a4b", "#9aa5b1", "#7bc67b", "#c97bd9"];
  const PANTS = ["#2f3b52", "#3b3b3b", "#4a3b2a", "#1f2a44"];
  const TOP = [
    { id: "pep", name: "Pepperoni", c: "#c0392b", pro: ["Pepperoni. Always.", "Pepperoni or nothing."] },
    { id: "haw", name: "Hawaiian", c: "#f2c94c", pro: ["Pineapple belongs!", "Hawaiian or riot."] },
    { id: "veg", name: "Veggie", c: "#6fbf4a", pro: ["Something green?", "Get a veggie one!"] },
    { id: "che", name: "Plain cheese", c: "#f5dc82", pro: ["Just cheese. Safe.", "Cheese. Don't overthink."] },
    { id: "mea", name: "Meat lovers", c: "#8e3b2f", pro: ["MEAT LOVERS.", "More meat. Always."] },
    { id: "half", name: "Half and half", c: "#e0903f", pro: ["Split it. Coward.", "Half and half?!"] }
  ];
  const TOPBY = Object.fromEntries(TOP.map((t) => [t.id, t]));
  const DIS = ["Pineapple is a crime.", "Anchovies?? No.", "Not veggie again.", "Cheese is boring.", "Mushrooms are wet."];
  const PQ = {
    great: ["Perfect crust.", "Still hot. Wow.", "Best pizza tonight."],
    ok: ["Solid pizza.", "Pretty good.", "It's pizza. Good."],
    bad: ["Soggy middle.", "They burnt it.", "Barely any cheese."],
    cold: ["Cold but still pizza.", "Cold pizza. Breakfast.", "Lukewarm. Eating anyway."],
    wrong: ["Not what we ordered.", "Wrong pizza. Eating it."]
  };
  const SNACKS = [
    ["Nacho cheese chips", "#e8a02e"], ["Salt & vinegar chips", "#d9d2a0"], ["BBQ chips", "#b5562b"], ["Sour cream & onion", "#c9d9a0"],
    ["Ranch chips", "#e4e0c0"], ["Flamin' hot chips", "#d1432b"], ["Pretzels", "#a8703a"], ["Cheese puffs", "#f08a2b"],
    ["Kettle chips", "#d9b36c"], ["Popcorn", "#f6efc8"], ["Gummy worms", "#e05a8a"]
  ];
  const SQ = {
    5: ["Perfect crunch.", "Chef's kiss chips.", "10/10 would crunch."],
    4: ["Pretty good chips.", "Solid. No notes."],
    3: ["Chips. They exist.", "It's fine. It's chips."],
    2: ["A bit stale...", "Way too salty."],
    1: ["Stale. Who bought these?", "Tastes like the bag."]
  };
  const CHAT = {
    gaming: ["gg", "Lag!!", "One more round", "Camper.", "That was a hit!", "Nice shot.", "Ping is 2ms. Beat that.", "Who has the CD key?", "Host migrated??", "Rematch."],
    hot: ["It's a sauna in here.", "Who cranked the heat?", "Open a window!", "I'm melting."],
    cold: ["Is the heat even on?", "Brr. Who opened that window?", "My fingers are numb.", "Hoodie time."],
    sleepy: ["I'm fine. Resting my eyes.", "Five more minutes...", "Need caffeine."],
    hungry: ["Is there pizza yet?", "Snack break?", "I could eat."]
  };
  const BANTER = ["Dude, try the new map.", "Did you see my killcam?", "Best LAN since 2009.", "Wanna play after this?", "Pass the pretzels.", "I haven't blinked in an hour.", "Nice rig.", "Who's winning? Not me.", "My ping is 1ms. Physics."];
  const IGNORE = ["has headphones on.", "is mid-match.", "pretends not to hear you.", "just nods slowly at the monitor.", "is in the zone."];
  const REASONS = ["Gotta work tomorrow.", "My ride's here.", "Dinner at my mom's.", "I have a thing.", "Dog needs out."];
  const PROBLEMS = [
    { sym: "The host's game doesn't show up in the server list.", fix: "Turn off the firewall", wrong: ["Reinstall the game", "Turn the monitor around", "Rename the PC to something funnier"] },
    { sym: "Two PCs have the same IP address.", fix: "Set a static IP", wrong: ["Plug the cable in harder", "Restart the router (it's a switch)", "Disable the sound card"] },
    { sym: "Blue screen. Third time today.", fix: "Update the graphics driver", wrong: ["Smack the case", "Raise the resolution", "Defrag it. Surely."] },
    { sym: "Missing DLL: msvcr71.dll", fix: "Install the redistributable", wrong: ["Download the DLL from a random site", "Delete System32", "Rename it to .exe"] },
    { sym: "Game version doesn't match the host's.", fix: "Patch to the same version", wrong: ["Complain loudly", "Swap to the other mouse", "Reinstall Windows"] },
    { sym: "Runs at 4 FPS.", fix: "Lower the graphics settings", wrong: ["Download more RAM", "Open the case window", "Blow on the fan"] },
    { sym: "No sound from the game.", fix: "Un-mute the speakers", wrong: ["Reflash the BIOS", "Yell at the game", "Check the ethernet cable"] },
    { sym: "The cursor is frozen.", max: 1, fix: "Clean the mouse ball", wrong: ["Replace the monitor", "Reinstall DirectX", "Hold the power button, politely"] },
    { sym: "Installer wants disc 2 of 3.", fix: "Mount the disc image", wrong: ["Insert disc 1 again", "Insert disc 3 and hope", "Cry"] },
    { sym: "Windows says the cable is unplugged. It's plugged in.", fix: "Try another cable", wrong: ["Wiggle the monitor", "Reboot into safe mode for fun", "Lick the connector"] }
  ];
  const RETRO = ["Mario Kart 64", "GoldenEye 007", "Street Fighter II", "Super Smash Bros.", "Bomberman", "Tetris", "Sonic the Hedgehog 2", "Contra (30 lives)", "Mortal Kombat", "Duck Hunt"];
  const STREAMS = ["a Zelda speedrun marathon", "a 120-star Mario 64 charity stream", "a glitch-hunting marathon", "a blindfolded Dark Souls attempt", "a 24-hour Tetris stream", "a retro RPG relay race"];
  const RETRO_LINES = ["Blue shell AGAIN?!", "No way you got that!", "Pass me P2!", "Blow on the cartridge.", "I call winner.", "That's a skill issue.", "My thumbs hurt.", "Lag? It's a CRT."];
  const STREAM_LINES = ["Chat is going crazy.", "World record pace!", "He's gonna choke it.", "Frame perfect!!", "No way. NO WAY.", "Pog.", "Donation goal hit!", "Skip the cutscene!"];
  const SOLO = ["Baldur's Gate 3", "Stardew Valley", "Skyrim", "Hades", "Disco Elysium", "Elden Ring", "Cyberpunk 2077", "The Witcher 3", "Civilization VI (turn 412)", "a 90-hour JRPG"];
  const SOLO_ASK = ["WTF are you doing?!", "Is that... single player?", "This is a LAN party!!", "Why are you playing $g?!", "Alt-tab. NOW.", "Who invited you?", "We're all RIGHT HERE.", "You drove here for THIS?", "Bro. Bro. BRO."];
  const YELLS = [
    "Oh, c'mon!!", "Son of a b—!", "WHAT THE HECK", "Ah, damn it!", "Bullsh—!", "Piece of s—!", "Are you KIDDING me?!", "F—ing LAG!", "Holy crap!",
    "Who did that?!", "No no no NO!", "Hell yeah!", "Absolute garbage!", "That's BS!", "Get wrecked!", "I hate this game!!", "You son of a—!",
    "My toast!!", "Banana protocol engaged!", "Sweet mother of toast!", "Deploy the goose!", "I'm a potato!", "Bees. BEES.", "Gravy!!", "Skibbity what??", "Not the soup!"
  ];
  const Y_ADJ = ["absolute", "unholy", "soggy", "feral", "cursed", "majestic", "greasy"];
  const Y_NOUN = ["spoon", "walnut", "goblin", "waffle", "mongoose", "sock", "lasagna", "trombone"];
  const yellLine = () => (chance(0.3) ? `You ${pick(Y_ADJ)} ${pick(Y_NOUN)}!` : pick(YELLS));
  let GAMENAMES =["Quake III Arena", "Halo: Combat Evolved", "Counter-Strike 1.6", "Age of Empires II", "Unreal Tournament 2004", "Left 4 Dead 2"];
  fetch("data/games.json").then((r) => r.json()).then((d) => { if (d.games && d.games.length) GAMENAMES = d.games.map((g) => g.name); }).catch(() => {});

  // ---------- DOM ----------
  root.innerHTML = `
    <div class="rpg-screen">
      <canvas class="rpg-canvas" width="${W}" height="${H}" tabindex="0" aria-label="LAN party simulator. Arrow keys or WASD to walk, E to interact, or click where to go."></canvas>
      <div class="rpg-dialog" role="dialog" aria-labelledby="rpg-title" hidden>
        <h2 class="rpg-title" id="rpg-title"></h2>
        <p class="rpg-body"></p>
        <div class="rpg-opts"></div>
      </div>
    </div>
    <div class="rpg-pad" role="group" aria-label="Touch controls">
      <div class="rpg-dpad">
        <button type="button" class="rpg-pb" data-k="ArrowUp" aria-label="Walk up">▲</button>
        <button type="button" class="rpg-pb" data-k="ArrowLeft" aria-label="Walk left">◀</button>
        <button type="button" class="rpg-pb" data-k="ArrowRight" aria-label="Walk right">▶</button>
        <button type="button" class="rpg-pb" data-k="ArrowDown" aria-label="Walk down">▼</button>
      </div>
      <button type="button" class="rpg-pb rpg-pact" aria-label="Interact">E</button>
    </div>
    <div class="rpg-top"><span class="rpg-clock"></span><span class="rpg-temp"></span><span class="rpg-speeds" role="group" aria-label="Game speed"></span><button type="button" class="rpg-sp rpg-fs">Fullscreen</button></div>
    <p class="rpg-pcline"></p>
    <div class="rpg-meters"></div>
    <p class="rpg-hint">Walk: arrows / WASD or click. Interact: E or Space.</p>
    <ol class="rpg-log" aria-live="polite" aria-label="What's happening at the LAN party"></ol>`;
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const el = {
    dlg: root.querySelector(".rpg-dialog"), title: root.querySelector(".rpg-title"), body: root.querySelector(".rpg-body"), opts: root.querySelector(".rpg-opts"),
    clock: root.querySelector(".rpg-clock"), temp: root.querySelector(".rpg-temp"), pcline: root.querySelector(".rpg-pcline"),
    meters: root.querySelector(".rpg-meters"), hint: root.querySelector(".rpg-hint"), log: root.querySelector(".rpg-log"), speeds: root.querySelector(".rpg-speeds")
  };
  const METERS = [["Energy", "energy", "#FFC531"], ["Belly", "belly", "#FF8A47"], ["Fun", "fun", "#A6E05A"], ["Social", "social", "#3FD0C9"], ["Comfort", "comfort", "#8FD3FF"]];
  const meterEls = {};
  METERS.forEach(([label, key, color]) => {
    const m = document.createElement("div");
    m.className = "rpg-m"; m.setAttribute("role", "meter"); m.setAttribute("aria-label", label);
    m.setAttribute("aria-valuemin", "0"); m.setAttribute("aria-valuemax", "100");
    m.innerHTML = `<span class="rpg-ml">${label}</span><span class="rpg-mb"><i style="background:${color}"></i></span>`;
    el.meters.append(m); meterEls[key] = m;
  });
  let speed = 1;
  const speedBtns = [["Pause", 0], ["1×", 1], ["3×", 3], ["8×", 8]].map(([label, v]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "rpg-sp"; b.textContent = label;
    b.addEventListener("click", () => { speed = v; syncSpeed(); canvas.focus({ preventScroll: true }); });
    el.speeds.append(b); return [b, v];
  });
  function syncSpeed() { speedBtns.forEach(([b, v]) => b.setAttribute("aria-pressed", String(v === speed))); }
  syncSpeed();

  // ---------- map ----------
  const blocked = new Uint8Array(COLS * ROWS);
  const tIdx = (x, y) => y * COLS + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const blockRect = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) blocked[tIdx(i, j)] = 1; };
  blockRect(0, 0, COLS, 3);
  const stations = [];
  [3, 8].forEach((ty) => [1, 4, 7, 10].forEach((tx, col) => {
    stations.push({ tx, ty, col, desk: { x: tx * T, y: ty * T, w: 48, h: 16 }, seat: { tx: tx + 1, ty: ty + 1, x: tx * T + 17, y: (ty + 1) * T + 14 }, pc: null, occ: null });
    blockRect(tx, ty, 3, 1);
  }));
  const OBJS = {
    pizza: { label: "Pizza table", rect: { x: 288, y: 64, w: 48, h: 28 }, tiles: [18, 4, 3, 2] },
    snacks: { label: "Snack table", rect: { x: 288, y: 128, w: 48, h: 28 }, tiles: [18, 8, 3, 2] },
    couch: { label: "Couch", rect: { x: 272, y: 190, w: 80, h: 20 }, tiles: [17, 12, 5, 1] },
    thermo: { label: "Thermostat", rect: { x: 276, y: 22, w: 14, h: 16 }, stand: [[17, 3]] },
    win: { label: "Window", rect: { x: 224, y: 2, w: 48, h: 46 }, stand: [[14, 3], [15, 3], [16, 3]] },
    coats: { label: "Coat rack", rect: { x: 346, y: 20, w: 20, h: 26 }, stand: [[21, 3], [22, 3]] },
    tv: { label: "TV corner", rect: { x: 288, y: 216, w: 48, h: 32 }, tiles: [18, 14, 3, 1] },
    memorial: { label: "Memorial", rect: { x: 16, y: 198, w: 32, h: 26 }, tiles: [1, 13, 2, 1] }
  };
  blockRect(1, 13, 2, 1);
  // Couch cushions and the armchair; people walk to the tile below, then onto the seat.
  const SEATS = [
    { x: 287, y: 206, t: [17, 13], couch: true }, { x: 312, y: 206, t: [19, 13], couch: true },
    { x: 337, y: 206, t: [21, 13], couch: true }, { x: 361, y: 204, t: [22, 13], couch: false }
  ];
  const freeSeat = (couchOnly) => { const f = shuffle(SEATS.filter((s) => !s.occ && (!couchOnly || s.couch))); return f[0] || null; };
  blockRect(18, 14, 3, 1); blockRect(22, 12, 1, 1);
  blockRect(18, 4, 3, 2); blockRect(18, 8, 3, 2); blockRect(17, 12, 5, 1); blockRect(0, 14, 1, 1); blockRect(23, 14, 1, 1);
  function standTiles(o) {
    if (o.stand2) return o.stand2;
    if (o.stand) return (o.stand2 = o.stand);
    const [x, y, w, h] = o.tiles, out = [];
    for (let i = x - 1; i <= x + w; i++) for (let j = y - 1; j <= y + h; j++) {
      const inx = i >= x && i < x + w, iny = j >= y && j < y + h;
      if ((inx && iny) || (!inx && !iny) || !inb(i, j) || blocked[tIdx(i, j)]) continue;
      out.push([i, j]);
    }
    return (o.stand2 = out);
  }
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function findPath(sx, sy, goals) {
    const s = tIdx(sx, sy);
    if (goals.has(s)) return [];
    const prev = new Int16Array(COLS * ROWS).fill(-2), q = [s];
    prev[s] = -1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], cx = c % COLS, cy = (c / COLS) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!inb(nx, ny)) continue;
        const ni = tIdx(nx, ny);
        if (prev[ni] !== -2 || blocked[ni]) continue;
        prev[ni] = c;
        if (goals.has(ni)) {
          const path = []; let k = ni;
          while (k !== s) { path.push([k % COLS, (k / COLS) | 0]); k = prev[k]; }
          return path.reverse();
        }
        q.push(ni);
      }
    }
    return null;
  }
  const walkable = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return inb(tx, ty) && !blocked[tIdx(tx, ty)]; };
  const randTile = (x0, y0, x1, y1) => { for (let k = 0; k < 30; k++) { const x = ri(x0, x1), y = ri(y0, y1); if (!blocked[tIdx(x, y)]) return [x, y]; } return [11, 13]; };

  // ---------- state ----------
  let S, P, phase = "intro", dlgOpen = false, dlgModal = false, anim = 0, visible = true;
  const queue = [];
  const keys = new Set();

  function makePC(tier, own) { return { tier, own, laptop: chance(0.3), installed: [], job: null, upd: null, problem: null, playing: false, game: null }; }
  function makeLook() { return { skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), pants: pick(PANTS) }; }
  const person = (o) => Object.assign({ x: 192, y: 254, dir: "u", act: "idle", path: null, spot: null, atSpot: true, then: null, moving: false, bubble: null, st: null, wait: 0, after: null }, o);

  function log(text) {
    S.log.unshift(`${fmt(S.clock)}  ${text}`);
    if (S.log.length > 40) S.log.pop();
    el.log.replaceChildren(...S.log.slice(0, 5).map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  }
  function say(p, text, secs = 3.5) { p.bubble = { text, until: performance.now() + secs * 1000 }; }

  function makeGuests() {
    const names = shuffle(NAMES.filter((n) => !FIXED.includes(n)));
    const mk = (kind, arrive, leave, extra) => ({ name: (extra && extra.name) || names.pop(), kind, arrive, leave, look: makeLook(), fav: pick(TOP).id, hate: pick(TOP).id, ...extra });
    const g = [];
    for (let i = 0; i < 3; i++) g.push(mk("early", DAY_START - 60, ri(1230, 1290)));
    g.push(mk("regular", ri(DAY_START + 20, 840), ri(1150, 1260), { name: "Nephron" }));
    g.push(mk("regular", ri(DAY_START + 30, 900), ri(1100, 1230)));
    g.push(mk("leaver", ri(DAY_START + 10, 780), ri(840, 1000), { reason: pick(REASONS) }));
    g.push(mk("leaver", ri(DAY_START + 5, DAY_START + 40), ri(DAY_START + 90, DAY_START + 140), { name: "Tyrelie", reason: "Gotta bounce. Always gotta bounce." }));
    g.push(mk("late", ri(960, 1080), ri(1200, 1290)));
    const cd = ri(1110, 1200); g.push(mk("dropin", cd, cd + 10, { name: "CainDeMoore" }));
    for (let i = 0; i < 2; i++) { const t = ri(DAY_START + 15, 1230); g.push(mk("dropin", t, t + 10)); }
    return g;
  }

  function setupDay(own) {
    stations.forEach((s) => { s.occ = null; s.pc = null; });
    S = {
      clock: DAY_START, acc: 0, own, npcs: [], guests: makeGuests(), log: [], queued: {},
      pizza: { slices: 0, age: 0, qual: "ok", topping: "pep", order: null, arguing: null, boxes: 1 },
      snacks: shuffle(SNACKS).slice(0, 4).map(([name, c]) => ({ name, c, q: ri(1, 5), n: ri(4, 6) })),
      temp: { room: 22, set: 0, win: false, weather: 0, kick: 0, kickUntil: 0 },
      stats: { installs: 0, fixed: 0, helped: 0, slices: 0, chips: 0, updates: 0, naps: 0, ignored: 0 },
      funSum: 0, funN: 0, warn: {}, chipStreak: 0, pizzaRecent: [],
      call: null, match: null, nextCall: DAY_START + ri(40, 70), tv: null, solo: null, nextSolo: DAY_START + ri(120, 200)
    };
    SEATS.forEach((s) => { s.occ = null; });
    S.tv = newTv(DAY_START);
    S.stats.calls = 0; S.stats.late = 0;
    const ps = pick(stations);
    P = person({
      isPlayer: true, name: "You", look: { skin: "#e0a97a", hair: "#2b1d12", shirt: "#ff5a47", pants: "#2f3b52" },
      energy: own ? 72 : 90, belly: 70, fun: 50, social: 50, hoodie: false, st: ps, sleepUntil: 0, fav: pick(TOP).id, hate: pick(TOP).id
    });
    ps.occ = P; ps.pc = own ? makePC(pick([6, 7]), true) : makePC(ri(0, 5), false);
    S.guests.forEach((g) => { if (g.arrive <= DAY_START) { g.spawned = true; spawnGuest(g, true); } });
    goSeat(P);
    queue.length = 0; el.log.replaceChildren();
    const pc = ps.pc, t = TIERS[pc.tier];
    if (own && pc.laptop) P.energy = 88;
    log(own ? (pc.laptop ? "You carry your laptop in under one arm. It boots in a minute." : "You haul your own tower in. Twenty minutes of cable untangling later, it boots.") : `You get a house ${pc.laptop ? "laptop" : "PC"}: ${t.cpu}, ${t.os}. Good luck.`);
    log(`The TV corner is showing ${S.tv.title}. A small memorial for Justler and Jeffro sits by the door.`);
    const early = S.npcs.filter((n) => n.g.kind === "early").map((n) => n.name);
    if (early.length) log(`The early crew is already set up: ${early.join(", ")}.`);
  }

  // ---------- movement ----------
  function startPath(p, goals, then, spot) {
    const set = goals instanceof Set ? goals : new Set(goals.map(([x, y]) => tIdx(x, y)));
    const path = findPath(clamp(Math.floor(p.x / T), 0, COLS - 1), clamp(Math.floor(p.y / T), 0, ROWS - 1), set);
    if (!path) return false;
    p.path = path; p.spot = spot || null; p.atSpot = !spot; p.then = then || null;
    return true;
  }
  function stepPerson(p, dt) {
    p.moving = false;
    let goal = null;
    if (p.path && p.path.length) goal = [p.path[0][0] * T + 8, p.path[0][1] * T + 12];
    else if (p.spot && !p.atSpot) goal = [p.spot.x, p.spot.y];
    if (!goal) { if (p.then) { const f = p.then; p.then = null; f(p); } return; }
    const dx = goal[0] - p.x, dy = goal[1] - p.y, d = Math.hypot(dx, dy), sp = (p.speed || 46) * dt;
    p.moving = true;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "r" : "l"; else p.dir = dy > 0 ? "d" : "u";
    if (d <= sp) { p.x = goal[0]; p.y = goal[1]; if (p.path && p.path.length) p.path.shift(); else p.atSpot = true; }
    else { p.x += dx / d * sp; p.y += dy / d * sp; }
  }
  function goSeat(n) {
    const s = n.st;
    startPath(n, [[s.seat.tx, s.seat.ty]], () => { n.act = "sit"; n.dir = "u"; }, s.seat);
  }
  function standUp(n) {
    if (n.act === "sit" || n.act === "sleepdesk") { n.act = "idle"; if (n.isPlayer && n.st && n.st.pc) n.st.pc.playing = false; }
    else if (n.act === "tv") { n.act = "idle"; n.y = 13 * T + 12; }
    if (n.seat && n.act !== "couch") { n.seat.occ = null; n.seat = null; }
  }
  function errand(n, obj, onArrive, wait) {
    standUp(n);
    n.after = null;
    const ok = startPath(n, standTiles(obj), () => { n.act = "busy"; n.wait = wait || 3; n.dir = "u"; onArrive(n); n.after = () => back(n); });
    if (!ok) back(n);
  }
  function back(n) { if (n.leaving) return; if (n.st) goSeat(n); else n.act = "idle"; }

  // ---------- guests ----------
  function spawnGuest(g, instant) {
    const free = shuffle(stations.filter((s) => !s.occ));
    const n = person({ name: g.name, g, kind: g.kind, look: g.look, fav: g.fav, hate: g.hate, hp: chance(0.35), cool: 0 });
    S.npcs.push(n);
    if (g.kind !== "dropin" && free.length) {
      n.st = free[0]; n.st.occ = n;
      n.st.pc = chance(0.25) ? makePC(ri(3, 5), true) : makePC(ri(0, 5), false);
      n.st.pc.playing = true;
      if (instant) { n.x = n.st.seat.x; n.y = n.st.seat.y; n.act = "sit"; n.atSpot = true; }
      else { goSeat(n); if (g.kind === "late") log(`${n.name} rolls in late with a laptop bag.`); else if (g.kind !== "early") log(`${n.name} arrives.`); }
    } else if (g.kind === "dropin") {
      log(`${n.name} is just stopping by.`);
      say(n, pick(["Just stopping by!", "Can't stay long.", "Hi, bye."]));
      errand(n, OBJS.snacks, snackEat, 3);
      n._dropin = true;
    } else { n.act = "idle"; startPath(n, [randTile(2, 11, 15, 14)]); }
    return n;
  }
  function startLeaving(n) {
    n.leaving = true; n.after = null; n.wait = 0; n.then = null;
    standUp(n);
    if (n.seat) { n.seat.occ = null; n.seat = null; }
    if (n.st) { n.st.occ = null; n.st.pc = null; n.st = null; }
    const k = n.g.kind;
    if (k === "leaver") { say(n, n.g.reason); log(`${n.name} leaves early. "${n.g.reason}"`); }
    else if (k === "dropin") { say(n, pick(["Okay, bye!", "Gotta run."])); log(`${n.name} leaves after ten minutes.`); }
    else if (k === "early" || k === "late") { say(n, "gg, I'm out."); log(`${n.name} finally heads home.`); }
    else { say(n, pick(["Later!", "See ya."])); log(`${n.name} heads out.`); }
    startPath(n, [[11, 15], [12, 15]], () => { n.gone = true; });
  }
  const seatedNpcs = () => S.npcs.filter((n) => n.act === "sit" && !n.gone);
  const presentNpcs = () => S.npcs.filter((n) => !n.gone && !n.leaving && !n.delivery);

  // ---------- pizza ----------
  function orderPizza(topping) {
    const heads = presentNpcs().length + 1;
    S.pizza.order = { eta: S.clock + ri(22, 38), topping, boxes: clamp(Math.ceil(heads / 3), 1, 2) };
    S.pizza.arguing = null;
    log(`Ordered ${TOPBY[topping].name}. Delivery in about half an hour.`);
  }
  function spawnDelivery() {
    const o = S.pizza.order; S.pizza.order = null;
    const n = person({ name: "Delivery", delivery: true, look: { skin: "#e0a97a", hair: "#b0302a", shirt: "#d6453d", pants: "#2f3b52" }, g: { kind: "delivery", leave: Infinity } });
    S.npcs.push(n);
    startPath(n, standTiles(OBJS.pizza), () => {
      n.act = "busy"; n.wait = 2; n.dir = "u"; say(n, "Pizza!");
      const r = Math.random();
      const qual = r < 0.25 ? "great" : r < 0.65 ? "ok" : r < 0.8 ? "bad" : "wrong";
      let top = o.topping;
      if (qual === "wrong") top = pick(TOP.filter((t) => t.id !== o.topping)).id;
      Object.assign(S.pizza, { slices: S.pizza.slices + o.boxes * 8, qual, topping: top, age: 0 });
      log(qual === "wrong" ? `Pizza's here. It's ${TOPBY[top].name}. That's not what you ordered.` : `Pizza's here: ${TOPBY[top].name}.`);
      n.after = () => { n.leaving = true; n.g.kind = "delivery"; startPath(n, [[11, 15], [12, 15]], () => { n.gone = true; }); };
    });
  }
  function pizzaLine(p) {
    const pz = S.pizza, cold = pz.age > 50;
    if (pz.topping === p.fav) return "My favorite!";
    if (pz.topping === p.hate) return "Ugh. Fine, I'll eat it.";
    return pick(pz.qual === "ok" && cold ? PQ.cold : PQ[pz.qual === "great" && cold ? "cold" : pz.qual]);
  }
  function startVote(intro) {
    if (S.pizza.slices > 0 || S.pizza.order || S.pizza.arguing) return;
    if (P.act === "sleepdesk" || P.act === "couch") { runArgument(null); return; }
    openDialog({
      title: "Pizza vote!", body: intro || "Nobody agrees on anything. What do you want?",
      opts: [...TOP.map((t) => ({ label: t.name, run: () => runArgument(t.id) })), { label: "Never mind", run() {} }]
    });
  }
  function runArgument(pick0) {
    const voters = presentNpcs().filter((n) => n.act !== "sleepdesk").slice(0, 6);
    const tally = {};
    if (pick0) { tally[pick0] = 1; say(P, pick(TOPBY[pick0].pro)); }
    const steps = [];
    voters.forEach((n, i) => {
      const v = chance(0.75) ? n.fav : pick(TOP).id;
      tally[v] = (tally[v] || 0) + 1;
      const text = i % 3 === 2 ? pick(DIS) : pick(TOPBY[v].pro);
      steps.push({ at: 1 + i * 1.1, n, text });
    });
    let win = pick0 || "pep", best = -1;
    for (const id in tally) if (tally[id] > best || (tally[id] === best && id === pick0)) { best = tally[id]; win = id; }
    S.pizza.arguing = { t: 0, steps, i: 0, win, tally, voters, end: Math.max(3, steps.length * 1.1 + 2), pick0 };
    log("The pizza argument begins.");
  }
  function argueStep(dt) {
    const a = S.pizza.arguing;
    if (!a) return;
    a.t += dt;
    while (a.i < a.steps.length && a.t >= a.steps[a.i].at) { const s = a.steps[a.i++]; say(s.n, s.text, 3); }
    if (a.t < a.end) return;
    S.pizza.arguing = null;
    const sorted = Object.entries(a.tally).sort((x, y) => y[1] - x[1]);
    log(`${TOPBY[a.win].name} wins ${sorted[0][1]}-${sorted[1] ? sorted[1][1] : 0}.`);
    const loser = a.voters.find((n) => n.fav !== a.win);
    if (loser) { say(loser, "I hate this."); }
    if (a.pick0) { if (a.pick0 === a.win) { P.fun = clamp(P.fun + 10); P.social = clamp(P.social + 4); log("Your pick won. Democracy works."); } else { P.fun = clamp(P.fun - 3); log("Your pick lost. You are over it. Mostly."); } }
    orderPizza(a.win);
  }

  // ---------- PC logic ----------
  function newProblem(pc) { const pool = PROBLEMS.filter((p) => p.max === undefined || pc.tier <= p.max); return { ...pick(pool), tries: 0 }; }
  function startUpdate(pc, occ) {
    if (pc.upd) return;
    const t = TIERS[pc.tier];
    pc.upd = { prog: 0, dur: t.dur + ri(-8, 12) }; pc.playing = false;
    if (occ === P) log(`Windows decides now is the time: "${t.upd}"`); else say(occ, "Seriously? Updates?");
  }
  function pcMinute() {
    for (const st of stations) {
      const pc = st.pc, occ = st.occ;
      if (!pc || !occ) continue;
      const t = TIERS[pc.tier];
      if (pc.upd) {
        pc.upd.prog += 100 / pc.upd.dur;
        if (pc.upd.prog >= 100) { pc.upd = null; if (occ === P) { S.stats.updates++; log("The update finishes. Your PC restarts twice for good measure."); } }
        continue;
      }
      if (pc.problem) { if (occ !== P && chance(0.012)) { pc.problem = null; say(occ, "Got it working!"); } continue; }
      if (pc.job) {
        pc.job.prog += 100 / 45 * t.speed;
        if (pc.job.prog >= 100) {
          if (occ === P) { pc.installed.push(pc.job.name); S.stats.installs++; P.fun = clamp(P.fun + 8); say(P, "Installed!"); log(`${pc.job.name} finished installing. ${pc.tier >= 6 ? "Your GPU didn't even spin its fans up. Wasted." : "Ready for the LAN."}`); }
          pc.job = null;
        }
        if (occ === P && pc.job && pc.job.willBreak && pc.job.prog >= pc.job.breakAt && !pc.problem) {
          pc.job.willBreak = false; pc.problem = newProblem(pc); pc.playing = false;
          log(`The ${pc.job.name} install hits a snag: ${pc.problem.sym}`);
        }
      } else if (occ !== P && chance(0.004)) pc.job = { name: pick(GAMENAMES), prog: 0 };
      if (chance(pc.tier >= 3 ? 0.0022 : 0.0016)) { startUpdate(pc, occ); continue; }
      const active = occ === P ? (pc.playing || pc.job) : true;
      const pr = Math.max(0.0008, 0.003 + (5 - pc.tier) * 0.0018) * (pc.own ? 0.4 : 1) * (occ === P ? 1 : 0.6);
      if (active && chance(pr)) {
        pc.problem = newProblem(pc);
        if (occ === P) { pc.playing = false; log(`Trouble at your PC: ${pc.problem.sym}`); } else { say(occ, "!", 4); }
      }
    }
  }

  // ---------- temperature ----------
  const roomState = () => (S.temp.room >= 27 ? "hot" : S.temp.room <= 17 ? "cold" : "ok");
  function feel() {
    const eff = S.temp.room + (P.hoodie ? 3 : 0);
    let state = "ok", label = "Comfy";
    if (eff >= 27) { state = "hot"; label = "Too hot"; } else if (eff >= 25) label = "Warm";
    else if (eff <= 17) { state = "cold"; label = "Too cold"; } else if (eff <= 19) label = "Chilly";
    return { eff, state, label, comfort: clamp(100 - Math.max(0, eff - 24) * 16 - Math.max(0, 20 - eff) * 16) };
  }
  function tempMinute() {
    const T0 = S.temp, h = (S.clock / 60) % 24;
    const outside = 17 + T0.weather + (h >= 11 && h < 17 ? 4 : h >= 22 || h < 6 ? -4 : 0);
    const pcs = stations.filter((s) => s.occ).length, people = presentNpcs().length + 1;
    if (S.clock > T0.kickUntil) T0.kick = 0;
    let target = 21 + T0.set * 2.5 + pcs * 0.55 + people * 0.2 - 1 + T0.kick;
    if (T0.win) target = target * 0.4 + outside * 0.6;
    T0.room += (target - T0.room) * 0.045;
    if (chance(0.0025)) {
      T0.weather = pick([-6, -3, 0, 0, 3, 6]);
      if (T0.weather <= -6) log("A cold front rolls in outside."); else if (T0.weather >= 6) log("Heat wave outside.");
    }
    if (!T0.kick && chance(0.0018)) {
      T0.kick = pick([-4, 4]); T0.kickUntil = S.clock + 90;
      log(T0.kick > 0 ? "The radiator clanks and goes full blast." : "The AC kicks on hard. Arctic.");
    }
    const rs = roomState();
    if (rs !== "ok") for (const n of seatedNpcs()) if (chance(0.01)) { say(n, pick(CHAT[rs])); break; }
    if (chance(0.003)) {
      const n = pick(presentNpcs().filter((x) => x.act === "sit") || []);
      if (n) errand(n, OBJS.thermo, () => { T0.set = clamp(T0.set + pick([-1, 1]), -2, 2); say(n, "Fixed it."); log(`${n.name} touched the thermostat. It's now "${SET_NAMES[T0.set + 2]}".`); });
    }
    if (chance(0.003)) {
      const n = pick(presentNpcs().filter((x) => x.act === "sit") || []);
      if (n) errand(n, OBJS.win, () => { T0.win = !T0.win; log(`${n.name} ${T0.win ? "opened" : "closed"} the window.`); });
    }
  }
  const SET_NAMES = ["Arctic", "Cool", "Comfy", "Warm", "Sauna"];

  // ---------- TV corner ----------
  function newTv(clock) { const retro = chance(0.55); return { mode: retro ? "retro" : "stream", title: pick(retro ? RETRO : STREAMS), next: clock + ri(70, 130) }; }
  function tvMinute() {
    if (S.clock < S.tv.next) return;
    S.tv = newTv(S.clock);
    log(S.tv.mode === "retro" ? `Someone puts ${S.tv.title} on the TV.` : `The TV switches to ${S.tv.title}.`);
  }
  function tvVisit(n) {
    const seat = freeSeat();
    if (!seat) return false;
    seat.occ = n; n.seat = seat; n.tvCool = 40;
    standUp(n);
    const ok = startPath(n, [seat.t], () => { n.act = "tv"; n.dir = "d"; n.wait = ri(8, 25); say(n, pick(S.tv.mode === "retro" ? RETRO_LINES : STREAM_LINES), 3); }, { x: seat.x, y: seat.y });
    if (!ok) { seat.occ = null; n.seat = null; back(n); return false; }
    return true;
  }
  function tvAct() {
    const tv = S.tv, here = S.npcs.filter((x) => x.act === "tv").length;
    openDialog({
      title: "TV corner", body: `On the TV: ${tv.title} (${tv.mode === "retro" ? "retro game" : "stream marathon"}). ${here ? `${here} ${here === 1 ? "person is" : "people are"} hanging out.` : "Nobody's over here yet."}`,
      opts: [{ label: tv.mode === "retro" ? "Grab a controller" : "Watch the stream", run: startTv },
        { label: "Change what's on", run: changeTv }, { label: "Leave", run() {} }]
    });
  }
  function changeTv() {
    S.tv = newTv(S.clock);
    log(`You switch the TV to ${S.tv.title}.`);
    const w = S.npcs.find((x) => x.act === "tv");
    if (w) say(w, "Hey! We were watching that!", 3.5);
  }
  function startTv() {
    if (P.act === "tv") return;
    const seat = freeSeat();
    if (!seat) { log("Every seat at the TV is taken. You hover behind the couch."); return; }
    standUp(P);
    seat.occ = P; P.seat = seat;
    const ok = startPath(P, [seat.t], () => { P.act = "tv"; P.dir = "d"; log(S.tv.mode === "retro" ? `You grab a controller: ${S.tv.title}.` : `You settle in to watch ${S.tv.title}.`); }, { x: seat.x, y: seat.y });
    if (!ok) { seat.occ = null; P.seat = null; }
  }

  // ---------- snacks ----------
  function snackEat(n) {
    const avail = S.snacks.filter((s) => s.n > 0);
    if (!avail.length) { say(n, "No snacks?!"); return; }
    const s = pick(avail); s.n--;
    say(n, pick(SQ[s.q]));
  }

  // ---------- NPC think ----------
  function npcMinute(n) {
    if (n.gone || n.delivery) return;
    if (!n.leaving && S.clock >= n.g.leave) { startLeaving(n); return; }
    if (n.leaving) return;
    if (n.cool > 0) n.cool--;
    if (n.tvCool > 0) n.tvCool--;
    if (n.act === "tv") {
      if (--n.wait <= 0) { standUp(n); back(n); say(n, pick(["Back to my PC.", "Your turn.", "Okay, bathroom time."])); }
      else if (chance(0.1)) say(n, pick(S.tv.mode === "retro" ? RETRO_LINES : STREAM_LINES), 3);
      return;
    }
    if (n.act === "sleepdesk") { if (--n.wait <= 0) { n.act = "sit"; say(n, "I'm awake!"); } return; }
    if (n.act === "busy") { if (--n.wait <= 0 && n.after) { const f = n.after; n.after = null; f(n); } return; }
    const walking = (n.path && n.path.length) || (n.spot && !n.atSpot) || n.then;
    if (walking) return;
    const pz = S.pizza;
    if (n.act === "sit") {
      const pc = n.st && n.st.pc;
      if (!pc || pc.upd || pc.problem) return;
      if (pz.slices > 0 && n.cool <= 0 && chance(0.25)) { errand(n, OBJS.pizza, (m) => { const k = Math.min(pz.slices, chance(0.4) ? 2 : 1); pz.slices -= k; m.cool = 25; say(m, pizzaLine(m)); if (pz.slices <= 0) log("The pizza is gone."); }); return; }
      if (!S.match && !(n.tvCool > 0) && chance(0.012) && tvVisit(n)) return;
      if (chance(0.012)) { errand(n, OBJS.snacks, snackEat, 3); return; }
      if (chance(0.004)) { errand(n, { stand: [randTile(2, 11, 15, 14)] }, () => say(n, "brb"), 4); return; }
      if (S.clock >= 1140 && chance(0.006)) { n.act = "sleepdesk"; n.wait = ri(40, 80); say(n, "zzz", 6); return; }
      if (chance(0.03)) { const k = S.clock >= 1140 && chance(0.4) ? "sleepy" : pz.slices === 0 && chance(0.3) ? "hungry" : "gaming"; say(n, chance(0.05) ? pick(MEM_LINES) : pick(CHAT[k])); return; }
      if (chance(0.01)) n.hp = !n.hp;
    } else if (n.act === "idle") {
      if (n._dropin) { // greet, linger, leave on schedule
        if (!n._greeted) { n._greeted = true; const t = randTile(Math.max(1, Math.floor(P.x / T) - 2), Math.max(3, Math.floor(P.y / T) - 1), Math.min(22, Math.floor(P.x / T) + 2), Math.min(14, Math.floor(P.y / T) + 2)); startPath(n, [t]); say(n, "Hey. Nice setup."); }
        else if (chance(0.3)) startPath(n, [randTile(2, 11, 15, 14)]);
      } else if (!n.st && chance(0.15)) startPath(n, [randTile(2, 10, 22, 14)]);
    }
  }

  // ---------- player simulation ----------
  const sleeping = () => P.act === "sleepdesk" || P.act === "couch";
  function playerMinute() {
    const f = feel(), pc = P.st.pc, seated = P.act === "sit";
    let dE = -0.2, dB = -0.28, dF = 0, dS = -0.07;
    if (P.act === "couch") { dE = 1.0; dF = 0.05; }
    else if (P.act === "sleepdesk") { dE = 0.55; dF = -0.02; }
    else if (P.act === "tv") {
      const others = S.npcs.filter((n) => n.act === "tv").length;
      dF = 0.5 + (S.tv.mode === "retro" ? 0.2 : 0) + Math.min(0.3, others * 0.1); dE = -0.12; dS = others ? 0.2 : -0.03;
      if (chance(0.06)) say(P, pick(S.tv.mode === "retro" ? RETRO_LINES : STREAM_LINES), 3);
    }
    else if (seated && pc.playing && !pc.problem && !pc.upd) { dF += 0.55 + Math.min(0.25, seatedNpcs().length * 0.03); dE -= 0.03; }
    else if (seated && (pc.problem || pc.upd)) dF -= 0.45;
    else dF -= 0.1;
    if (f.state !== "ok") { dF -= 0.25; dE -= 0.05; }
    if (P.belly < 20) dF -= 0.2;
    if (P.energy < 15 && !sleeping()) dF -= 0.15;
    if (P.social < 20) dF -= 0.1;
    P.energy = clamp(P.energy + dE); P.belly = clamp(P.belly + dB); P.fun = clamp(P.fun + dF); P.social = clamp(P.social + dS);
    S.funSum += P.fun; S.funN++;
    const w = S.warn;
    const once = (k, cond, msg) => { if (cond && !w[k]) { w[k] = 1; log(msg); } else if (!cond) w[k] = 0; };
    once("hungry", P.belly < 15, "Your stomach growls loudly. Nobody looks up.");
    once("lonely", P.social < 15 && !sleeping(), "Nobody has spoken to you in hours. Hello?");
    once("hot", f.state === "hot", "You are sweating through your shirt.");
    once("cold", f.state === "cold", "Your fingers are too cold to double-click.");
    if (f.state !== "ok" && !sleeping() && phase === "play" && S.clock - (S.tempAskAt === undefined ? -999 : S.tempAskAt) >= 60) {
      S.tempAskAt = S.clock; const st = f.state; queue.push(() => tempDialog(st));
    }
    if (P.social < 15 && chance(0.03)) say(P, "Hello?");
    if (sleeping()) {
      if (S.clock >= P.sleepUntil || P.energy >= 90) wakeUp();
    } else if (P.energy <= 0) {
      P.then = null; P.path = null;
      if (P.act !== "sit") { P.act = "sit"; }
      P.act = "sleepdesk"; P.sleepUntil = S.clock + ri(80, 130); pc.playing = false; S.stats.naps++;
      say(P, "zzz", 6); log("You fell asleep at your keyboard.");
    }
  }
  function wakeUp() {
    if (P.act === "couch") { P.act = "idle"; P.y = 13 * T + 12; if (P.seat) { P.seat.occ = null; P.seat = null; } log(`You wake up on the couch. Someone ate your chips.`); say(P, "...what time is it?"); }
    else {
      P.act = "sit";
      if (chance(0.5)) { log("You wake up. Someone drew a mustache on your face."); P.social = clamp(P.social + 5); } else log("You wake up with a keyboard imprint on your cheek.");
    }
  }
  function startNap() {
    if (P.act === "tv") { P.act = "couch"; P.sleepUntil = S.clock + ri(100, 150); S.stats.naps++; log("You doze off mid-show."); say(P, "zzz", 6); return; }
    const seat = freeSeat(true);
    if (!seat) { log("Every couch cushion is taken."); return; }
    standUp(P); seat.occ = P; P.seat = seat;
    const ok = startPath(P, [seat.t], () => { P.act = "couch"; P.sleepUntil = S.clock + ri(100, 150); S.stats.naps++; log("You curl up on the couch."); say(P, "zzz", 6); }, { x: seat.x, y: seat.y });
    if (!ok) { seat.occ = null; P.seat = null; log("The couch is unreachable. Somehow."); }
  }

  // ---------- group game calls ----------
  function startInstall(g) {
    const pc = P.st.pc, t = TIERS[pc.tier], eta = Math.round(45 / t.speed);
    const hot = S.call && S.call.game === g;
    pc.job = { name: g, prog: 0, willBreak: hot && chance(0.4), breakAt: ri(25, 70) };
    log(`Started installing ${g}. ETA ${eta} minutes.`);
  }
  function endCall() { S.call = null; S.nextCall = S.clock + ri(60, 100) + 30; }
  function startMatch(game, joined) {
    S.match = { game, end: S.clock + ri(25, 40), joined };
  }
  function matchMinute() {
    const m = S.match;
    if (!m) return;
    if (S.clock >= m.end) {
      S.match = null;
      const w = pick(seatedNpcs());
      log(`The ${m.game} match ends.${w ? ` ${w.name} claims victory.` : ""} Everyone's voice is a little hoarse.`);
      if (w) say(w, pick(["GG EZ.", "I am a god.", "Rematch?! ...no."]), 4);
      return;
    }
    let said = 0;
    for (const n of shuffle(seatedNpcs())) {
      if (said < 2 && chance(0.22)) { say(n, yellLine(), 2.5); said++; }
    }
    if (m.joined && P.act === "sit" && chance(0.15)) say(P, yellLine(), 2.5);
  }
  function callReady() {
    const c = S.call;
    if (!c) return;
    const pc = P.st.pc;
    if (P.act === "sit") { pc.playing = true; pc.game = c.game; }
    startMatch(c.game, true);
    S.stats.calls++; P.fun = clamp(P.fun + 10); P.social = clamp(P.social + 8);
    say(P, "Ready!"); log(`You're in the lobby for ${c.game}. ${c.by}: "About time."`);
    endCall();
  }
  function checkCall() {
    const c = S.call, pc = P.st.pc;
    if (!c || c.checked) return;
    c.checked = true;
    if (chance(0.5)) {
      if (!pc.installed.includes(c.game)) pc.installed.push(c.game);
      openDialog({ title: "Already installed!", body: `You forgot you even had ${c.game}. Lucky.`, opts: [{ label: "Join the lobby", run: callReady }] });
    } else {
      const slow = TIERS[pc.tier].speed < 0.7;
      openDialog({
        title: "Not installed", body: `No ${c.game} on this machine. Everyone is waiting.${slow ? " On this PC? Good luck." : ""}`,
        opts: [{ label: "Install it now", run: () => startInstall(c.game) }, { label: "Later", run() {} }]
      });
    }
  }
  function callMinute() {
    let c = S.call;
    if (!c) {
      if (S.clock < S.nextCall || sleeping() || S.pizza.arguing || S.clock > DAY_END - 90) return;
      const n = pick(seatedNpcs().concat([null]).filter(Boolean).length ? seatedNpcs() : [null]);
      if (!n) { S.nextCall = S.clock + 20; return; }
      S.call = c = { game: pick(GAMENAMES), by: n.name, n, start: S.clock, deadline: S.clock + 60, checked: false };
      say(n, `We're playing ${c.game} now!`, 6);
      log(`${n.name}: "We're going to play ${c.game} now!" Check your PC.`);
      return;
    }
    if (P.st.pc.installed.includes(c.game)) { callReady(); return; }
    const left = c.deadline - S.clock, n = c.n && !c.n.gone && !c.n.leaving ? c.n : null;
    if (left <= 30 && !c.w1) { c.w1 = 1; if (n) say(n, "Are you ready yet?", 4); log(`${c.by} is getting impatient.`); }
    if (left <= 10 && !c.w2) { c.w2 = 1; if (n) say(n, "We're ALL waiting on you.", 4); }
    if (left <= 0) {
      if (n) say(n, "Seriously?! Starting without you.", 6);
      log(`${c.by} is furious. They start ${c.game} without you.`);
      P.social = clamp(P.social - 12); P.fun = clamp(P.fun - 8); S.stats.late++;
      startMatch(c.game, false);
      endCall();
    }
  }

  // ---------- the guest who plays a single-player game ----------
  function endSolo() {
    const s = S.solo;
    if (!s) return;
    if (s.n.st && s.n.st.pc) s.n.st.pc.solo = null;
    if (!s.n.gone && !s.n.leaving) { log(`${s.n.name} finally finishes the ${s.game} session. The room moves on.`); say(s.n, "Okay, okay. Who's got a lobby?", 4); }
    S.solo = null; S.nextSolo = S.clock + ri(120, 220);
  }
  function soloMinute() {
    const s = S.solo;
    if (!s) {
      if (S.clock < S.nextSolo || S.match || S.call || S.clock > DAY_END - 60) return;
      const c = seatedNpcs().filter((n) => n.st && n.st.pc && !n.st.pc.upd && !n.st.pc.problem);
      if (!c.length) { S.nextSolo = S.clock + 15; return; }
      const n = pick(c);
      S.solo = { n, game: pick(SOLO), end: S.clock + ri(25, 50) };
      n.st.pc.solo = S.solo.game;
      say(n, pick(["Just one more quest.", "Don't mind me.", "It's a really good game."]), 4);
      log(`${n.name} is playing ${S.solo.game}. A single-player game. At a LAN party.`);
      return;
    }
    if (s.n.gone || s.n.leaving || !s.n.st) { S.solo = null; S.nextSolo = S.clock + ri(120, 220); return; }
    if (S.clock >= s.end) { endSolo(); return; }
    let said = 0;
    for (const m of shuffle(seatedNpcs())) if (m !== s.n && said < 2 && chance(0.2)) { say(m, pick(SOLO_ASK).replace("$g", s.game), 3); said++; }
    if (chance(0.1)) say(s.n, pick(["It has a great story!", "Shh. Cutscene.", "I'm almost at the boss."]), 3);
  }

  // ---------- global tick ----------
  function tickMinute() {
    S.clock++;
    tempMinute();
    const pz = S.pizza;
    if (pz.slices > 0) pz.age++;
    if (pz.order && S.clock >= pz.order.eta) spawnDelivery();
    if ((S.clock === 840 || S.clock === 1080) && !pz.slices && !pz.order && !pz.arguing) {
      const n = pick(presentNpcs());
      if (n) { say(n, "Pizza? Pizza."); queue.push(() => startVote(`${n.name} says it's time for pizza. Nobody agrees on a topping.`)); }
    }
    const total = S.snacks.reduce((a, s) => a + s.n, 0);
    if (total < 8 && chance(0.012)) {
      const s = pick(S.snacks); s.n = ri(4, 6); s.q = ri(1, 5);
      log(`Someone brought a fresh bag of ${s.name.toLowerCase()}. ${s.q >= 4 ? "They got the good ones." : s.q <= 2 ? "Questionable choice." : ""}`.trim());
    }
    S.guests.forEach((g) => { if (!g.spawned && S.clock >= g.arrive) { g.spawned = true; spawnGuest(g, false); } });
    S.npcs.forEach(npcMinute);
    S.npcs = S.npcs.filter((n) => { if (n.gone && n.st) { n.st.occ = null; } return !n.gone; });
    pcMinute();
    callMinute();
    matchMinute();
    tvMinute();
    soloMinute();
    playerMinute();
    if (S.clock >= DAY_END) endDay();
  }
  function endDay() {
    phase = "end";
    const st = S.stats, vibe = Math.round(S.funSum / Math.max(1, S.funN));
    const still = S.npcs.filter((n) => n.g.kind === "early").map((n) => n.name);
    const rating = vibe > 70 ? "Legendary LAN." : vibe > 50 ? "A good time." : vibe > 30 ? "Survivable." : "You should have stayed home.";
    openDialog({
      modal: true, center: true, title: "9:30 PM. The LAN party is over.",
      body: `${rating} Vibe ${vibe}%. Installed ${st.installs} games, fixed ${st.fixed} PC problems, helped ${st.helped} people, survived ${st.updates} updates, ate ${st.slices} slices and ${st.chips} handfuls of snacks, napped ${st.naps} times, got ignored ${st.ignored} times, joined ${st.calls} group matches and kept everyone waiting ${st.late} times.${still.length ? ` ${still.join(" and ")} refuse to leave.` : ""}`,
      opts: [{ label: "Another day: bring my own PC", run: () => begin(true) }, { label: "Another day: use a random PC", run: () => begin(false) }]
    });
  }
  const TIER_FLAVOR = [
    "It sounds like a jet engine and smells faintly of 1999.", "A beige box with a sticker that says 'Intel Inside' and a very loud fan.",
    "Solid for its day. Its day was a while ago.", "Dusty, but it has a respectable amount of RAM.",
    "Decent. The integrated-feeling graphics card has seen things.", "Modern enough to be suspicious. Don't get cocky."
  ];
  function begin(own) {
    setupDay(own); phase = "play"; canvas.focus({ preventScroll: true });
    const pc = P.st.pc;
    queue.push(() => openDialog({
      title: own ? "You brought..." : "Your PC is...",
      body: `${pcLabel(pc)} ${own ? pick(WASTE) : TIER_FLAVOR[pc.tier]}`,
      opts: [{ label: "Sit down and get started", run() {} }]
    }));
  }

  // ---------- dialogs ----------
  function openDialog({ title, body, opts, modal, center }) {
    dlgOpen = true; dlgModal = !!modal;
    el.title.textContent = title; el.body.textContent = body || "";
    el.dlg.classList.toggle("center", !!center);
    el.dlg.querySelectorAll(".rpg-mine").forEach((n) => n.remove());
    el.opts.classList.remove("row");
    el.opts.replaceChildren(...opts.map((o, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rpg-opt"; b.disabled = !!o.disabled;
      const k = document.createElement("span"); k.className = "rpg-key"; k.textContent = String(i + 1);
      b.append(k, document.createTextNode(o.label));
      b.addEventListener("click", () => { if (o.keep) { o.run && o.run(); } else { closeDialog(); o.run && o.run(); } });
      return b;
    }));
    el.dlg.hidden = false;
    const first = el.opts.querySelector("button:not(:disabled)");
    if (first) first.focus({ preventScroll: true });
  }
  function closeDialog() { dlgOpen = false; el.dlg.hidden = true; canvas.focus({ preventScroll: true }); }

  const pcName = (pc) => (pc.own ? (pc.laptop ? "Your laptop" : "Your own tower") : pc.laptop ? "House laptop" : "House PC");
  const pcLabel = (pc) => { const t = TIERS[pc.tier]; return `${pcName(pc)}: ${t.cpu}, ${t.ram}, ${t.gpu}, ${t.os}.`; };
  function openPcDialog() {
    const pc = P.st.pc, t = TIERS[pc.tier];
    if (pc.upd) {
      openDialog({ title: "Windows Update", body: `${t.upd} ${Math.round(pc.upd.prog)}%. Don't turn off your computer. You couldn't if you tried.`, opts: [{ label: "Stare at the progress bar", run() {} }] });
      return;
    }
    if (pc.problem) { openFixDialog(P.st, P, ""); return; }
    const opts = [];
    const c = S.call;
    if (c && !c.checked) opts.push({ label: `Check for ${c.game} (${c.by} just called it)`, run: checkCall });
    else if (c && !pc.installed.includes(c.game) && !(pc.job && pc.job.name === c.game)) opts.push({ label: `Install ${c.game} now`, run: () => startInstall(c.game) });
    if (pc.job) opts.push({ label: `Installing ${pc.job.name}: ${Math.round(pc.job.prog)}%`, disabled: true });
    else opts.push({ label: "Install a game", run: installMenu });
    if (pc.installed.length) opts.push({ label: "Play a game", run: playMenu });
    else opts.push({ label: "Play Minesweeper (nobody does)", run: openMinesweeper });
    if (pc.playing) opts.push({ label: "Stop playing", run: () => { pc.playing = false; } });
    opts.push({ label: "Check for updates (brave)", run: () => startUpdate(pc, P) });
    opts.push({ label: "Get up", run: () => { standUp(P); pc.playing = false; } });
    openDialog({ title: pc.own ? "Your rig" : pc.laptop ? "House laptop" : "House PC", body: pcLabel(pc), opts });
  }
  function openMinesweeper() {
    const pc = P.st.pc, N = 8, M = 8;
    pc.playing = true; pc.game = "Minesweeper";
    let cells, over, started, flagMode = false, btns;
    const grid = document.createElement("div");
    grid.className = "rpg-mine";
    const nb = (i) => { const x = i % N, y = (i / N) | 0, out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < N && ny < N) out.push(ny * N + nx); } return out; };
    function reset() {
      cells = Array.from({ length: N * N }, () => ({ m: false, r: false, f: false, n: 0 }));
      over = null; started = false;
    }
    function place(safe) {
      const ban = new Set([safe, ...nb(safe)]); let k = 0;
      while (k < M) { const i = ri(0, N * N - 1); if (ban.has(i) || cells[i].m) continue; cells[i].m = true; k++; }
      cells.forEach((c, i) => { c.n = nb(i).filter((j) => cells[j].m).length; });
    }
    function reveal(i) {
      const stack = [i];
      while (stack.length) { const j = stack.pop(), c = cells[j]; if (c.r || c.f) continue; c.r = true; if (c.n === 0 && !c.m) stack.push(...nb(j)); }
    }
    function finish() {
      const fresh = S.clock - (S.mineAt === undefined ? -999 : S.mineAt) >= 30;
      if (over === "win") {
        if (fresh) { S.mineAt = S.clock; P.fun = clamp(P.fun + 15); log("You cleared the minefield. Nobody saw. It still felt great."); }
        else log("You cleared another minefield. The novelty is wearing off.");
      } else if (fresh) { S.mineAt = S.clock; P.fun = clamp(P.fun - 4); log("BOOM. Minesweeper wins again."); }
    }
    function flag(i) { if (over || cells[i].r) return; cells[i].f = !cells[i].f; render(); }
    function click(i) {
      if (over) return;
      if (flagMode) { flag(i); return; }
      const c = cells[i];
      if (c.f || c.r) return;
      if (!started) { started = true; place(i); }
      if (c.m) { over = "lose"; cells.forEach((x) => { if (x.m) x.r = true; }); }
      else { reveal(i); if (cells.every((x) => x.m || x.r)) over = "win"; }
      if (over) finish();
      render();
    }
    const COL = ["", "#2b5fd9", "#2f8f3a", "#d6453d", "#1f2f8f", "#8f2f2f", "#2f8f8f", "#222", "#666"];
    function render() {
      btns.forEach((b, i) => {
        const c = cells[i], show = c.r;
        b.className = "rpg-cell" + (show ? " open" : "") + (show && c.m ? " bomb" : "");
        b.textContent = show ? (c.m ? "*" : c.n || "") : c.f ? "F" : "";
        b.style.color = show && !c.m ? COL[c.n] : c.f ? "#d6453d" : "";
      });
      const left = M - cells.filter((c) => c.f).length;
      el.body.textContent = over === "win" ? "Cleared! Smug satisfaction acquired." : over === "lose" ? "BOOM. Press New game." : `Mines left: ${left}. First click is always safe.`;
    }
    reset();
    openDialog({
      title: "Minesweeper", body: "",
      opts: [
        { label: "Flag mode: off", keep: true, run: () => { flagMode = !flagMode; el.opts.children[0].childNodes[1].textContent = `Flag mode: ${flagMode ? "on" : "off"}`; } },
        { label: "New game", keep: true, run: () => { reset(); render(); } },
        { label: "Close", run() {} }
      ]
    });
    el.opts.classList.add("row");
    btns = Array.from({ length: N * N }, (_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", `Cell ${(i % N) + 1}, ${((i / N) | 0) + 1}`);
      b.addEventListener("click", () => click(i));
      b.addEventListener("contextmenu", (e) => { e.preventDefault(); flag(i); });
      b.addEventListener("keydown", (e) => { if (e.key === "f" || e.key === "F") { e.preventDefault(); flag(i); } });
      return b;
    });
    grid.replaceChildren(...btns);
    el.dlg.insertBefore(grid, el.opts);
    render();
  }
  function installMenu() {
    const pc = P.st.pc, t = TIERS[pc.tier];
    const offers = shuffle(GAMENAMES.filter((g) => !pc.installed.includes(g))).slice(0, 3);
    const eta = Math.round(45 / t.speed);
    openDialog({
      title: "Install which game?", body: `On this machine it will take about ${eta} minutes of game time.`,
      opts: [...offers.map((g) => ({ label: g, run: () => startInstall(g) })), { label: "Back", run: openPcDialog }]
    });
  }
  function playMenu() {
    const pc = P.st.pc;
    openDialog({
      title: "Play which game?", body: "",
      opts: [...pc.installed.slice(0, 6).map((g) => ({ label: g, run: () => { pc.playing = true; pc.game = g; log(`You fire up ${g}.`); } })), { label: "Back", run: openPcDialog }]
    });
  }
  function openFixDialog(st, helper, note) {
    const pc = st.pc, pr = pc.problem;
    if (!pr) return;
    const own = st.occ === P;
    const labels = shuffle([pr.fix, ...pr.wrong]);
    openDialog({
      title: own ? "Troubleshooting" : `Help ${st.occ.name}`, body: `${note ? note + " " : ""}${pr.sym}`,
      opts: [...labels.map((l) => ({
        label: l, run: () => {
          if (l === pr.fix) {
            pc.problem = null;
            if (own) { S.stats.fixed++; P.fun = clamp(P.fun + 5); log("Fixed it. You are a wizard."); say(P, "It works!"); }
            else { S.stats.helped++; P.social = clamp(P.social + 14); P.fun = clamp(P.fun + 6); say(st.occ, "Thanks, you rock!"); log(`You fixed ${st.occ.name}'s PC. Social credit earned.`); }
          } else { pr.tries++; P.fun = clamp(P.fun - 3); openFixDialog(st, helper, "That did nothing."); }
        }
      })), { label: "Leave it", run() {} }]
    });
  }
  function pizzaAct() {
    const pz = S.pizza;
    if (pz.slices > 0) {
      const cold = pz.age > 50;
      openDialog({
        title: "Pizza", body: `${pz.slices} slices of ${TOPBY[pz.topping].name}${cold ? ", gone cold" : ""}.`,
        opts: [{ label: "Eat a slice", run: eatSlice }, { label: "Not now", run() {} }]
      });
    } else if (pz.order) {
      openDialog({ title: "Pizza", body: `It's on the way. Expected around ${fmt(pz.order.eta)}.`, opts: [{ label: "Wait impatiently", run() {} }] });
    } else if (pz.arguing) {
      openDialog({ title: "Pizza", body: "Everyone is arguing right now.", opts: [{ label: "Back away slowly", run() {} }] });
    } else {
      openDialog({ title: "No pizza", body: "The table is empty. Someone should order.", opts: [{ label: "Start the pizza vote", run: () => startVote() }, { label: "Not now", run() {} }] });
    }
  }
  function eatSlice() {
    const pz = S.pizza;
    if (pz.slices <= 0) return;
    pz.slices--; S.stats.slices++;
    P.belly = clamp(P.belly + 22); P.fun = clamp(P.fun + (pz.topping === P.fav ? 9 : pz.topping === P.hate ? 1 : 5));
    S.pizzaRecent = S.pizzaRecent.filter((t) => S.clock - t < 60); S.pizzaRecent.push(S.clock);
    const line = pizzaLine(P);
    say(P, line); log(`Pizza: "${line}"`);
    if (S.pizzaRecent.length >= 4) { P.energy = clamp(P.energy - 12); log("Food coma incoming."); S.pizzaRecent = []; }
    if (pz.slices <= 0) log("That was the last slice.");
  }
  function snackAct() {
    openDialog({
      title: "Snack table", body: "Pick your poison.",
      opts: [...S.snacks.map((s) => ({ label: `${s.name}${s.n > 0 ? ` (${s.n} left)` : " (empty)"}`, disabled: s.n <= 0, run: () => eatSnack(s) })),
        { label: "Review the snacks out loud", run: reviewSnacks }, { label: "Leave", run() {} }]
    });
  }
  function eatSnack(s) {
    s.n--; S.stats.chips++; S.chipStreak++;
    P.belly = clamp(P.belly + 9); P.fun = clamp(P.fun + (s.q - 1) * 1.2 + 1);
    const line = pick(SQ[s.q]);
    say(P, line); log(`${s.name}: "${line}"`);
    if (S.chipStreak === 5) log("Your fingers are orange now. Your keyboard will remember.");
    if (S.clock % 7 === 0) S.chipStreak = 0;
  }
  function reviewSnacks() {
    const best = S.snacks.reduce((a, b) => (b.q > a.q ? b : a));
    const worst = S.snacks.reduce((a, b) => (b.q < a.q ? b : a));
    say(P, `${best.name.split(" ")[0]} good. ${worst.name.split(" ")[0]} bad.`, 4);
    const listener = seatedNpcs().filter((n) => !n.hp && Math.hypot(n.x - P.x, n.y - P.y) < 120);
    if (listener.length && !chance(0.3)) { const n = pick(listener); say(n, pick(["Facts.", "Hard disagree.", "You're not wrong."]), 3); log(`${n.name} actually responds to your snack review.`); P.social = clamp(P.social + 6); }
    else { log("Nobody cares about your snack opinions."); S.stats.ignored++; }
  }
  function thermoAct() {
    const T0 = S.temp;
    openDialog({
      title: "Thermostat", body: `Set to "${SET_NAMES[T0.set + 2]}". The room is ${toF(T0.room)}°F.`,
      opts: [{ label: "Colder", disabled: T0.set <= -2, run: () => { T0.set--; log(`You set the thermostat to "${SET_NAMES[T0.set + 2]}".`); } },
        { label: "Warmer", disabled: T0.set >= 2, run: () => { T0.set++; log(`You set the thermostat to "${SET_NAMES[T0.set + 2]}".`); } }, { label: "Leave it alone", run() {} }]
    });
  }
  function tempDialog(st) {
    if (feel().state !== st || phase !== "play") return;
    const cold = st === "cold", T0 = S.temp;
    openDialog({
      title: cold ? "You're freezing" : "You're roasting",
      body: cold ? "Your fingers are going numb. Deal with it yourself, or yell across the room at Nephron to close the window?" : "You're sweating onto your keyboard. Deal with it yourself, or yell across the room at Nephron to open the window?",
      opts: [
        { label: cold ? "Deal with it yourself (hoodie / thermostat)" : "Deal with it yourself (shed layers / thermostat)", run: () => {
          if (cold) { if (!P.hoodie) { P.hoodie = true; log("You pull your hoodie on and stop shivering."); } else { T0.set = clamp(T0.set + 1, -2, 2); log(`You nudge the thermostat to "${SET_NAMES[T0.set + 2]}".`); } }
          else { if (P.hoodie) { P.hoodie = false; log("You peel off your hoodie. Sweet relief."); } else { T0.set = clamp(T0.set - 1, -2, 2); log(`You nudge the thermostat to "${SET_NAMES[T0.set + 2]}".`); } }
          P.social = clamp(P.social + 1);
        } },
        { label: `Yell at Nephron to ${cold ? "close" : "open"} the window`, run: () => yellAtNephron(cold) },
        { label: "Suffer in silence", run: () => { P.fun = clamp(P.fun - 2); log(cold ? "You suffer quietly, typing with your sleeves over your hands." : "You suffer quietly. A drop of sweat hits the spacebar."); } }
      ]
    });
  }
  function yellAtNephron(cold) {
    const want = !cold; // window open?
    say(P, `NEPHRON! ${cold ? "CLOSE" : "OPEN"} THE WINDOW!`, 4);
    const n = S.npcs.find((x) => x.name === "Nephron" && !x.leaving && !x.gone);
    if (!n) { log(`You yell for Nephron. Nephron isn't here yet. Or anymore. The window stays as it is.`); P.social = clamp(P.social - 2); return; }
    if (S.temp.win === want) { say(n, `It's already ${cold ? "closed" : "open"}!`, 4); log(`Nephron points out the window is already ${cold ? "closed" : "open"}. Try the thermostat.`); return; }
    if (n.hp || chance(0.3)) {
      say(n, n.hp ? "...what?" : "No, it's fine.", 4); S.stats.ignored++; P.social = clamp(P.social - 4);
      log(n.hp ? "Nephron has headphones on and can't hear you." : "Nephron refuses. You will remember this.");
      return;
    }
    say(n, "Fine, fine.", 3);
    errand(n, OBJS.win, () => { S.temp.win = want; log(`Nephron ${want ? "opens" : "closes"} the window. You owe him one.`); }, 2);
    P.social = clamp(P.social + 3);
  }
  function memorialAct() {
    openDialog({
      title: "In memory of Justler and Jeffro", body: "Two framed photos, a candle, a few flowers and a tiny plaque: \"Forever on the host list.\"",
      opts: [{ label: "Pay your respects", run: () => { P.social = clamp(P.social + 5); P.fun = clamp(P.fun + 2); say(P, "gg, friends.", 4); log("You stand there a moment. The candle flickers. gg, Justler and Jeffro."); const n = pick(seatedNpcs()); if (n) say(n, pick(MEM_LINES), 4); } },
        { label: "Leave a snack", run: () => { const s = S.snacks.find((x) => x.n > 0); if (s) { s.n--; log(`You leave some ${s.name.toLowerCase()} for them. They'd have eaten it.`); P.fun = clamp(P.fun + 2); } else log("There's nothing left to leave. They'd have understood."); } },
        { label: "Back to the party", run() {} }]
    });
  }
  function windowAct() { S.temp.win = !S.temp.win; log(S.temp.win ? "You open the window. A draft sneaks in." : "You close the window."); }
  function coatAct() { P.hoodie = !P.hoodie; log(P.hoodie ? "You put on your hoodie. Cozy." : "You take off your hoodie."); }
  function couchAct() {
    openDialog({ title: "Couch", body: "It looks extremely comfortable.", opts: [{ label: "Take a nap (about 2 hours)", run: startNap }, { label: `Watch the TV (${S.tv.title})`, run: startTv }, { label: "Not now", run() {} }] });
  }
  function deskAct() {
    if (P.act === "sit") { openPcDialog(); return; }
    startPath(P, [[P.st.seat.tx, P.st.seat.ty]], () => { P.act = "sit"; P.dir = "u"; openPcDialog(); }, P.st.seat);
  }
  function talk(n) {
    if (n.act === "sleepdesk") { log(`${n.name} is asleep. You respect that.`); return; }
    if (S.solo && S.solo.n === n) {
      const g = S.solo.game;
      openDialog({
        title: `${n.name} is playing ${g}`, body: "A single-player game. At a LAN party. The whole room is staring.",
        opts: [
          { label: "WTF are you doing?!", run: () => { say(P, "WTF are you doing?!", 3); say(n, "It's a great story!", 4); log(`You join the chorus. ${n.name} does not care.`); P.social = clamp(P.social + 4); P.fun = clamp(P.fun + 3); } },
          { label: "Ask what it's like", run: () => { say(n, "Okay so there's this guy...", 4); log(`${n.name} explains ${g} for ten minutes. It sounds good, honestly.`); P.fun = clamp(P.fun + 5); P.social = clamp(P.social + 6); } },
          { label: "Back to the party", run() {} }
        ]
      });
      return;
    }
    if (n.st && n.st.pc && n.st.pc.problem) { openFixDialog(n.st, P, `${n.name} spots you: "Can you look at this?"`); return; }
    const busy = n.hp || (n.act === "sit" && chance(0.5)) || (P.social < 30 && chance(0.4));
    if (busy) { S.stats.ignored++; P.social = clamp(P.social - 3); say(n, "...", 2); log(`${n.name} ${pick(IGNORE)} You are invisible.`); }
    else { P.social = clamp(P.social + 12); P.fun = clamp(P.fun + 3); const l = pick(BANTER); say(n, l, 4); log(`${n.name}: "${l}"`); }
  }

  // ---------- targets ----------
  const OBJ_ACT = { pizza: pizzaAct, snacks: snackAct, couch: couchAct, thermo: thermoAct, win: windowAct, coats: coatAct, tv: tvAct, memorial: memorialAct };
  const distRect = (x, y, r) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));
  function findTarget() {
    let best = null, bd = 1e9;
    const consider = (d, t) => { if (d < bd) { bd = d; best = t; } };
    for (const k in OBJS) { const d = distRect(P.x, P.y - 4, OBJS[k].rect); if (d <= 14) consider(d, { label: k === "tv" ? `TV corner: ${S.tv.title}` : OBJS[k].label, rect: OBJS[k].rect, act: OBJ_ACT[k], obj: OBJS[k] }); }
    const dd = P.act === "sit" ? 0 : distRect(P.x, P.y - 4, { x: P.st.desk.x, y: P.st.desk.y, w: 48, h: 16 });
    if (dd <= 14) consider(dd, { label: "Your PC", rect: P.st.desk, act: deskAct, desk: true });
    for (const n of S.npcs) { if (n.delivery || n.leaving) continue; const d = Math.hypot(n.x - P.x, n.y - P.y); if (d <= 24) consider(d - 4, { label: `Talk to ${n.name}`, npc: n, act: () => talk(n) }); }
    return best;
  }
  function clickAt(mx, my) {
    for (const k in OBJS) { const r = OBJS[k].rect; if (mx >= r.x - 3 && mx <= r.x + r.w + 3 && my >= r.y - 3 && my <= r.y + r.h + 3) { goThen(standTiles(OBJS[k]), OBJ_ACT[k]); return; } }
    if (mx >= P.st.desk.x && mx <= P.st.desk.x + 48 && my >= P.st.desk.y - 10 && my <= P.st.desk.y + 16) { deskAct(); return; }
    for (const n of S.npcs) if (!n.delivery && !n.leaving && Math.hypot(n.x - mx, n.y - 8 - my) < 12) {
      const s = n.st ? [[n.st.seat.tx + 1, n.st.seat.ty], [n.st.seat.tx - 1, n.st.seat.ty], [n.st.seat.tx, n.st.seat.ty + 1]].filter(([x, y]) => inb(x, y) && !blocked[tIdx(x, y)]) : [[Math.floor(n.x / T), Math.floor(n.y / T)]];
      goThen(s, () => talk(n)); return;
    }
    const tx = Math.floor(mx / T), ty = Math.floor(my / T);
    if (inb(tx, ty) && !blocked[tIdx(tx, ty)]) { standUp(P); startPath(P, [[tx, ty]]); }
  }
  function goThen(goals, fn) { standUp(P); startPath(P, goals, () => fn()); }

  // ---------- input ----------
  const MOVE = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] };
  canvas.addEventListener("keydown", (e) => {
    if (dlgOpen || phase !== "play") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (MOVE[k]) { keys.add(k); e.preventDefault(); }
    else if (k === "e" || k === " " || k === "Enter") { e.preventDefault(); if (!sleeping()) { const t = findTarget(); if (t) t.act(); } }
  });
  canvas.addEventListener("keyup", (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  canvas.addEventListener("blur", () => keys.clear());
  root.addEventListener("keydown", (e) => {
    if (!dlgOpen) return;
    if (e.key === "Escape" && !dlgModal) { e.preventDefault(); closeDialog(); return; }
    if (/^[1-9]$/.test(e.key)) { const b = el.opts.children[Number(e.key) - 1]; if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  });
  // fullscreen (hidden where the browser lacks element fullscreen, e.g. iPhone Safari)
  const fsBtn = root.querySelector(".rpg-fs");
  if (!root.requestFullscreen) fsBtn.hidden = true;
  else {
    fsBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen().catch(() => {});
      canvas.focus({ preventScroll: true });
    });
    document.addEventListener("fullscreenchange", () => { fsBtn.textContent = document.fullscreenElement === root ? "Exit fullscreen" : "Fullscreen"; });
  }
  // touch controls (shown on coarse pointers via CSS)
  root.querySelectorAll(".rpg-pb[data-k]").forEach((b) => {
    const k = b.dataset.k;
    const up = () => keys.delete(k);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); if (!dlgOpen && phase === "play") keys.add(k); });
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  root.querySelector(".rpg-pact").addEventListener("click", () => {
    if (dlgOpen || phase !== "play" || sleeping()) return;
    const t = findTarget(); if (t) t.act();
  });
  canvas.addEventListener("click", (e) => {
    canvas.focus({ preventScroll: true });
    if (dlgOpen || phase !== "play" || sleeping()) return;
    const r = canvas.getBoundingClientRect();
    clickAt((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
  });
  function keyMove(dt) {
    let dx = 0, dy = 0;
    keys.forEach((k) => { dx += MOVE[k][0]; dy += MOVE[k][1]; });
    if (!dx && !dy) return false;
    if (sleeping()) return true;
    P.path = null; P.spot = null; P.then = null; P.atSpot = true;
    if (P.act === "sit") { P.act = "idle"; P.st.pc.playing = false; }
    else standUp(P);
    const s = 62 * dt, n = Math.hypot(dx, dy);
    const nx = P.x + dx / n * s, ny = P.y + dy / n * s;
    if (walkable(nx - 3, P.y) && walkable(nx + 3, P.y) && nx > 6 && nx < W - 6) P.x = nx;
    if (walkable(P.x - 3, ny) && walkable(P.x + 3, ny) && ny > 50 && ny < H - 2) P.y = ny;
    P.moving = true;
    P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u");
    return true;
  }

  // ---------- rendering ----------
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const bg = (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // basement concrete floor
    r(0, 48, W, H - 48, "#8e9096");
    for (let y = 48; y < H; y += 32) r(0, y, W, 1, "#7a7d83");
    for (let x = 0; x < W; x += 32) r(x, 48, 1, H - 48, "#7a7d83");
    for (let k = 0; k < 300; k++) r((k * 53) % W, 49 + ((k * 97) % (H - 49)), 1, 1, k % 2 ? "#9b9ea4" : "#82858b");
    // rug
    r(64, 182, 170, 54, "#d9a441"); r(67, 185, 164, 48, "#8e4a4a");
    for (let x = 70; x < 228; x += 12) r(x, 188, 6, 42, "#9c5656");
    r(72, 192, 154, 2, "#d9a441"); r(72, 224, 154, 2, "#d9a441");
    // plain beige basement wall
    r(0, 0, W, 48, "#d8c9a5"); r(0, 38, W, 6, "#d0c09b"); r(0, 43, W, 1, "#bfae88"); r(0, 44, W, 4, "#a89a78");
    const sprite = (rows, x, y, sc, map) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) r(x + i * sc, y + j * sc, sc, sc, map[ch]); }));
    const frame = (px, bgc) => { r(px, 5, 26, 30, "#3a2a1e"); r(px + 2, 7, 22, 26, bgc); };
    // game posters: Elden Ring, Dark Souls, Bloodborne, Zelda II, Ratchet & Clank, Mega Man, WoW, Diablo
    const glyphs = {
      W: ["1...1", "1...1", "1.1.1", "11.11", "1...1"], O: [".111.", "1...1", "1...1", "1...1", ".111."],
      E: ["111", "1..", "11.", "1..", "111"], L: ["1..", "1..", "1..", "1..", "111"], D: ["11.", "1.1", "1.1", "1.1", "11."],
      N: ["1..1", "11.1", "1.11", "1..1", "1..1"], R: ["11.", "1.1", "11.", "1.1", "1.1"], I: ["111", ".1.", ".1.", ".1.", "111"], G: ["111", "1..", "1.1", "1.1", "111"]
    };
    let px = 10;
    frame(px, "#0a1a1e");                                                                 // Elden Ring key art: the ring, the title, the kneeling knight
    r(px + 2, 15, 22, 8, "#12302f"); r(px + 2, 23, 22, 6, "#1d4a44"); r(px + 5, 20, 16, 9, "#2b3a28");
    r(px + 13, 7, 1, 24, "#ffe48a");                                                                    // the beam through the ring
    const circ = (cx, cy, rad, col) => { for (let yy = -rad - 1; yy <= rad + 1; yy++) for (let xx = -rad - 1; xx <= rad + 1; xx++) if (Math.abs(Math.hypot(xx, yy) - rad) < 0.75) r(px + cx + xx, cy + yy, 1, 1, col); };
    circ(13, 24, 5, "#ffb830"); circ(10, 22, 3, "#ffcf5a"); circ(16, 22, 3, "#ffcf5a"); circ(13, 25, 2, "#ffe08a"); r(px + 12, 23, 3, 3, "#fff0a0");
    const word = (str, x0, y0, col) => { let cx = x0; for (const ch of str) { const g = glyphs[ch]; g.forEach((row, j) => [...row].forEach((c, k) => { if (c === "1") r(px + cx + k, y0 + j, 1, 1, col); })); cx += g[0].length + 1; } };
    word("ELDEN", 3, 8, "#e8c36a"); word("RING", 5, 14, "#e8c36a");
    r(px + 2, 32, 22, 1, "#0a100e"); r(px + 4, 28, 5, 1, "#2a3438"); r(px + 8, 29, 5, 3, "#3a4448"); r(px + 9, 27, 3, 3, "#4a5558"); r(px + 14, 28, 1, 5, "#b8c0c8"); r(px + 13, 29, 3, 1, "#b8c0c8");
    px += 31; frame(px, "#0a0a0e");                                                       // Dark Souls: coiled-sword bonfire
    r(px + 3, 29, 20, 3, "#3a3a40"); r(px + 12, 9, 2, 20, "#c8ccd4"); r(px + 9, 13, 8, 2, "#8a8f98"); r(px + 12, 9, 2, 2, "#fff");
    sprite(["...##...", "..####..", ".######.", "########"], px + 5, 21, 3, { "#": "#ff8a1a" });
    r(px + 10, 25, 6, 5, "#ffd23a"); r(px + 6, 12, 1, 1, "#ffb347"); r(px + 19, 16, 1, 1, "#ffb347"); r(px + 17, 10, 1, 1, "#ffd23a");
    px += 31; frame(px, "#080c18");                                                       // Bloodborne: blood moon + hunter hat
    [[9, 9, 8], [7, 11, 12], [5, 13, 16], [5, 15, 16], [5, 17, 16], [7, 19, 12], [9, 21, 8]].forEach(([ox, oy, w]) => r(px + ox, oy, w, 2, "#a31818"));
    r(px + 8, 12, 4, 2, "#c43030"); r(px + 14, 16, 3, 2, "#7a1010"); r(px + 9, 18, 2, 2, "#7a1010");
    r(px + 8, 29, 10, 2, "#000"); r(px + 10, 26, 6, 3, "#000"); r(px + 3, 9, 1, 1, "#fff"); r(px + 21, 12, 1, 1, "#fff"); r(px + 4, 22, 1, 1, "#fff");
    px += 31; frame(px, "#16224a");                                                       // Zelda II: Link with sword and shield
    r(px + 2, 29, 22, 4, "#3a2a1a"); r(px + 2, 29, 22, 1, "#6fdc5a");
    sprite(["..GGG...", ".GGGGG..", ".GSSSG..", ".SKSSS..", "..SSS...", ".GGGGG..", "GGGGGGG.", ".GGGGG..", ".G...G.."], px + 3, 12, 2, { G: "#3fae3a", S: "#f0c898", K: "#111" });
    r(px + 17, 18, 5, 8, "#c0392b"); r(px + 18, 20, 3, 4, "#f2e08a"); r(px + 9, 26, 1, 1, "#fff");   // shield
    for (let i = 0; i < 7; i++) r(px + 15 + i, 17 - i, 1, 2, "#e8ecf2");                             // sword
    px += 31; frame(px, "#25164f");                                                       // Ratchet & Clank
    [[5, 9], [21, 11], [9, 30], [18, 8]].forEach(([ox, oy]) => r(px + ox, oy, 1, 1, "#fff"));
    sprite(["#.....#.", "##...##.", "########", "#WBWWBW#", "########", ".######.", "..####.."], px + 3, 13, 2, { "#": "#f08a2a", W: "#fff", B: "#2a6ad9" });
    r(px + 15, 22, 7, 8, "#9aa0aa"); r(px + 16, 24, 2, 2, "#3fd0c9"); r(px + 19, 24, 2, 2, "#3fd0c9"); r(px + 18, 20, 1, 2, "#aaa"); r(px + 17, 19, 3, 1, "#ff5a47");
    r(px + 5, 27, 8, 2, "#c0392b"); r(px + 4, 25, 3, 6, "#c0392b");                       // omniwrench
    px += 31; frame(px, "#101a3a");                                                       // Mega Man
    sprite(["...BBBB...", "..BBBBBB..", ".BBLBBBBB.", ".BBBBBBBB.", ".BSSSSSSB.", ".BSKSSKSB.", "..SSSSSS..", "...BBBB..."], px + 3, 12, 2, { B: "#2a6ad9", L: "#9fd8ff", S: "#f0c898", K: "#111" });
    r(px + 4, 29, 18, 3, "#7ec8ff"); r(px + 8, 28, 3, 1, "#fff"); r(px + 15, 28, 3, 1, "#fff");
    px += 31; frame(px, "#1a1a1a");                                                       // World of Warcraft: Alliance / Horde
    r(px + 2, 7, 11, 17, "#1a3a8a"); r(px + 13, 7, 11, 17, "#8a1a1a");
    r(px + 5, 10, 5, 5, "#f0c040"); r(px + 4, 12, 7, 3, "#f0c040"); r(px + 6, 16, 3, 3, "#f0c040");        // golden lion
    r(px + 16, 10, 2, 8, "#111"); r(px + 21, 10, 2, 8, "#111"); r(px + 18, 14, 3, 6, "#111"); r(px + 17, 9, 1, 2, "#111"); r(px + 22, 9, 1, 2, "#111"); // horde spikes
    "WOW".split("").forEach((ch, i) => glyphs[ch].forEach((row, j) => [...row].forEach((c, k) => { if (c === "1") r(px + 3 + i * 7 + k, 26 + j, 1, 1, "#f0c040"); })));
    px = 304; frame(px, "#1a0505");                                                       // Diablo: horned skull
    sprite(["B........B", "BB......BB", ".BBBBBBBB.", ".WWWWWWWW.", ".WEWWWWEW.", ".WWWWWWWW.", "..WWKKWW..", "..W.WW.W.."], px + 3, 11, 2, { B: "#7a1818", W: "#d8d0b8", E: "#ff3b1a", K: "#222" });
    r(px + 4, 29, 18, 2, "#7a1010"); r(px + 6, 31, 14, 1, "#3a0808");
    // thermostat box
    r(278, 24, 10, 12, "#d8d0c0"); r(280, 26, 6, 4, "#2a2a2a");
    // coat rack
    r(354, 22, 2, 24, "#5a3f2a"); r(348, 22, 14, 2, "#5a3f2a");
    r(348, 26, 6, 12, "#3a4a6a"); r(358, 26, 6, 10, "#6a5a3a");
    // door mat
    r(176, 238, 32, 18, "#6b3b2b"); r(178, 240, 28, 14, "#7d4a37");
    // couch
    r(270, 188, 84, 24, "#6a3140"); r(274, 196, 76, 14, "#7a3b4a");
    for (let x = 274; x < 350; x += 19) r(x, 196, 1, 14, "#5a2836");
    r(274, 186, 76, 4, "#8a4558");
    // memorial table
    r(16, 212, 32, 12, "#3a2a1e"); r(16, 212, 32, 3, "#7a5236"); r(17, 224, 3, 2, "#2a1c12"); r(44, 224, 3, 2, "#2a1c12");
    r(19, 199, 10, 13, "#d9a441"); r(20, 200, 8, 11, "#2b3a67"); r(22, 202, 4, 4, "#e0a97a"); r(21, 206, 6, 4, "#3fd0c9");
    r(35, 199, 10, 13, "#d9a441"); r(36, 200, 8, 11, "#5a2d6e"); r(38, 202, 4, 4, "#c68a5e"); r(37, 206, 6, 4, "#ffc531");
    r(30, 206, 4, 7, "#f2ebe0"); r(21, 213, 3, 3, "#e08fb0"); r(41, 213, 3, 3, "#a6e05a"); r(25, 217, 14, 3, "#d9a441");
    // armchair
    r(354, 188, 14, 24, "#4a5a2c"); r(356, 192, 10, 18, "#5f7a3a"); r(354, 196, 2, 14, "#3e4c24"); r(366, 196, 2, 14, "#3e4c24");
    // tables
    const table = (x, y, c1, c2) => { r(x, y + 2, 48, 22, "#c89a6a"); for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) r(x + 1 + i * 4, y + 3 + j * 4, 4, 4, c1); else r(x + 1 + i * 4, y + 3 + j * 4, 4, 4, c2); r(x, y + 24, 48, 4, "#8f6540"); r(x + 2, y + 28, 3, 2, "#5a3f2a"); r(x + 43, y + 28, 3, 2, "#5a3f2a"); };
    table(288, 64, "#d6453d", "#f2ebe0"); table(288, 128, "#4a78c9", "#f2ebe0");
    // plants
    const plant = (x, y) => { r(x + 3, y + 8, 10, 8, "#a05a3b"); r(x + 2, y + 2, 12, 7, "#3f8f4a"); r(x + 5, y - 2, 6, 6, "#4fae5a"); r(x + 1, y + 5, 4, 4, "#356f3d"); };
    plant(0, 224); plant(368, 224);
    return c;
  })();

  function skyAt(h) { return h >= 7 && h < 17 ? "#8fd3ff" : h >= 17 && h < 19 ? "#f3a15b" : h >= 5 && h < 7 ? "#f4b6a0" : "#1b2145"; }
  function drawWindow() {
    const h = (S.clock / 60) % 24, x = 230, y = 3;
    R(x, y, 36, 12, "#4a4f55"); R(x + 2, y + 2, 32, 8, skyAt(h));
    if (h >= 19 || h < 5) { [[6, 4], [14, 6], [22, 3], [28, 7]].forEach(([dx, dy]) => R(x + dx, y + dy, 1, 1, "#fff")); }
    else if (h >= 7 && h < 19) R(x + 4 + ((h - 7) / 12) * 24, y + 4, 3, 3, "#ffe066");
    if (S.temp.win) { R(x + 2, y + 5, 32, 3, "#4a4f55"); R(x + 2, y + 8, 32, 2, "#cfe9f5"); if (Math.floor(anim * 3) % 2) R(x + 10, y + 16, 8, 1, "rgba(255,255,255,.8)"); }
    else R(x + 17, y + 2, 2, 8, "#4a4f55");
    R(x - 2, y + 12, 40, 2, "#bfae88");
  }
  function drawThermoLed() { R(281, 27, 4, 2, S.temp.set > 0 ? "#ff5a47" : S.temp.set < 0 ? "#8fd3ff" : "#a6e05a"); }
  function drawTableItems() {
    const fl = Math.floor(anim * 6) % 3;                         // memorial candle flame
    R(31, 202 - (fl === 1 ? 1 : 0), 2, 4, "#ffd27a"); R(31, 204, 2, 2, "#ff8a3a");
    if (fl === 2) { ctx.fillStyle = "rgba(255,210,120,.12)"; ctx.fillRect(22, 196, 20, 16); }
    const pz = S.pizza;
    if (pz.slices > 0) {
      const boxes = Math.ceil(pz.slices / 8);
      for (let b = 0; b < boxes; b++) {
        const bx = 292 + b * 22, by = 70;
        R(bx, by, 20, 16, "#e7c18a"); R(bx + 1, by + 1, 18, 14, "#d9a05b");
        const cnt = Math.min(8, pz.slices - b * 8), col = TOPBY[pz.topping].c;
        for (let i = 0; i < cnt; i++) { const cx = bx + 2 + (i % 4) * 4, cy = by + 2 + Math.floor(i / 4) * 6; R(cx, cy, 4, 5, "#f2c26b"); R(cx + 1, cy + 1, 2, 2, col); }
      }
    }
    S.snacks.forEach((s, i) => { const x = 291 + i * 11, y = 133; R(x, y + 3, 9, 6, "#e8e2d0"); if (s.n > 0) R(x + 1, y, 7, 4, s.c); R(x, y + 9, 9, 1, "rgba(0,0,0,.2)"); });
    if (!P.hoodie) { R(358, 26, 6, 11, "#c2402f"); R(359, 24, 4, 3, "#a8321f"); }
  }
  function drawTv() {
    const x = 294, y = 220, tv = S.tv;
    R(x + 10, y - 4, 1, 4, "#999"); R(x + 16, y - 4, 1, 4, "#999");        // rabbit ears
    R(x - 2, y + 24, 40, 3, "#2a1c12");                                       // stand
    R(x, y, 36, 24, "#3a2a1e"); R(x, y, 36, 2, "#4d3826");                    // cabinet
    R(x + 3, y + 3, 24, 18, "#111");
    let sc = "#111";
    if (tv.mode === "retro") {
      sc = "#3b6fd9"; R(x + 3, y + 3, 24, 18, sc); R(x + 3, y + 16, 24, 5, "#3a8f3a");
      const px = x + 5 + Math.floor((anim * 16) % 18);
      R(px, y + 11, 4, 5, "#ff5a47"); R(px + 1, y + 9, 2, 2, "#e0a97a");
      R(x + 20, y + 7, 3, 3, Math.floor(anim * 4) % 2 ? "#ffc531" : "#f2e08a");
    } else {
      R(x + 3, y + 3, 24, 18, "#3b2a6b");
      R(x + 4, y + 4, 16, 11, ["#3fd0c9", "#2a8f8f", "#5ad9c9"][Math.floor(anim * 3) % 3]); R(x + 8, y + 7, 5, 5, "#e0a97a");
      for (let i = 0; i < 5; i++) R(x + 21, y + 4 + i * 3, 4 + ((i + Math.floor(anim * 3)) % 3), 1, i % 2 ? "#bbb" : "#d9a441");
      if (Math.floor(anim * 1.5) % 2) R(x + 4, y + 17, 4, 2, "#ff3b30");
    }
    R(x + 29, y + 4, 5, 2, "#aaa"); R(x + 29, y + 9, 5, 2, "#aaa"); R(x + 30, y + 15, 3, 3, "#222");
    R(x + 40, y + 16, 12, 5, "#cfc6a8"); R(x + 42, y + 17, 3, 1, "#444");  // retro console
    R(x + 40, y + 21, 12, 1, "#555");
  }
  function drawStation(st) {
    const dx0 = st.desk.x, y = st.desk.y, x = dx0 + 8, pc = st.pc, t = pc ? TIERS[pc.tier] : null, occ = st.occ;
    R(dx0, y, 48, 11, "#c89a6a"); R(dx0, y + 11, 48, 5, "#8f6540");
    if (st.col > 0) R(dx0, y, 1, 16, "#a9794f");                       // seam where the tables are pushed together
    if (st.col === 0) R(dx0 + 1, y + 16, 3, 2, "#5a3f2a");
    if (st.col === 3) R(dx0 + 44, y + 16, 3, 2, "#5a3f2a");
    if (!pc) return; // empty desk: just the bare table
    // tower
    const lap = pc.laptop, crt = t.crt && !lap;
    if (!lap) {
      R(x + 21, y - 9, 9, 15, crt ? "#cfc6a8" : "#23262e"); R(x + 23, y - 6, 5, 1, crt ? "#a79f86" : "#3a3f4a"); R(x + 23, y - 3, 5, 1, crt ? "#a79f86" : "#3a3f4a");
      if (!crt) R(x + 24, y + 2, 3, 2, pc.tier >= 4 ? ["#ff5a47", "#3fd0c9", "#a6e05a", "#ffc531"][Math.floor(anim * 2) % 4] : "#3fd0c9");
      else R(x + 24, y + 2, 2, 2, "#4fae5a");
    }
    // monitor
    let scr = "#2a7f8a", bar = null;
    if (!occ) scr = "#111";
    else if (pc.upd) { scr = "#2b6cb0"; bar = [pc.upd.prog, "#fff"]; }
    else if (pc.problem) scr = pc.tier <= 3 ? "#1d4ed8" : "#b91c1c";
    else if (pc.job) { scr = "#2b3440"; bar = [pc.job.prog, "#a6e05a"]; }
    else if (pc.solo) scr = Math.floor(anim * 0.8) % 2 ? "#d9783a" : "#c4663a";
    else if (pc.playing || (occ !== P && occ.act === "sit")) scr =["#3fd0c9", "#ffc531", "#ff5a47", "#a6e05a"][Math.floor(anim * 5 + st.tx) % 4];
    const shell = t.crt ? "#cfc6a8" : "#9aa0aa";
    if (lap) {
      const old = t.crt, deck = old ? "#d8cfae" : "#d3d8e0", bez = old ? "#6a6f78" : "#1d1f26";
      R(x + 8, y - 6, 16, 9, bez); R(x + 9, y - 5, 14, 7, scr);                        // open lid + screen
      R(x + 10, y - 4, 3, 1, "rgba(255,255,255,.28)");                                 // glare
      R(x + 7, y + 3, 18, 1, "#444851");                                               // hinge
      for (let k = 0; k < 6; k++) { const g = Math.floor(k * 0.5); R(x + 9 - g, y + 4 + k, 14 + 2 * g, 1, k === 5 ? "#8f95a0" : deck); } // deck widens toward the viewer
      for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) R(x + 11 + i * 3, y + 5 + j * 2, 2, 1, "#3b3f48");                    // keys
      R(x + 13, y + 9, 6, 1, "#aab0ba");                                               // trackpad
      R(x + 27, y + 7, 1, 3, "#222");                                                  // mouse
      if (pc.tier >= 3) R(x + 22, y + 4, 1, 1, "#a6e05a");
    }
    else if (crt) { R(x + 2, y - 7, 17, 14, "#cfc6a8"); R(x + 2, y - 7, 17, 2, "#e6dfc6"); R(x + 4, y - 5, 13, 10, scr); R(x + 6, y + 7, 9, 2, "#cfc6a8"); }
    else { R(x + 2, y - 6, 17, 11, "#1d1f26"); R(x + 3, y - 5, 15, 9, scr); R(x + 9, y + 5, 3, 2, "#1d1f26"); R(x + 6, y + 7, 9, 1, "#1d1f26"); }
    const bx = lap ? x + 11 : x + 5, bw = lap ? 10 : 11;
    if (lap && bar) { R(bx, y - 1, bw, 2, "rgba(0,0,0,.4)"); R(bx, y - 1, Math.round(bw * clamp(bar[0]) / 100), 2, bar[1]); bar = null; }
    if (bar) { R(bx, y + 1, bw, 2, "rgba(0,0,0,.4)"); R(bx, y + 1, Math.round(bw * clamp(bar[0]) / 100), 2, bar[1]); }
    if (pc.problem && occ) R(lap ? x + 15 : x + 9, y - 3, 3, 3, "#fff");
    if (!lap) R(x + 6, y + 8, 12, 2, crt ? "#d8d0b8" : "#333");
    if (occ && (S.clock / 60) % 24 >= 19 || (S.clock / 60) % 24 < 6) { if (occ) { ctx.fillStyle = "rgba(120,200,255,.07)"; ctx.fillRect(x - 4, y - 12, 40, 36); } }
  }
  function drawPerson(p) {
    const x = Math.round(p.x), y = Math.round(p.y), L = p.look;
    if (p.act === "couch") { R(x - 14, y - 6, 9, 5, L.pants); R(x - 6, y - 8, 10, 7, L.shirt); R(x + 3, y - 9, 8, 7, L.skin); R(x + 3, y - 9, 8, 3, L.hair); zzz(x, y - 14); return; }
    if (p.act === "sleepdesk") { R(x - 7, y - 17, 14, 4, L.shirt); R(x - 4, y - 20, 8, 5, L.hair); zzz(x + 4, y - 24); return; }
    const seated = p.act === "sit" || p.act === "tv", o = seated ? 2 : 0, walk = p.moving ? Math.floor(anim * 9) % 2 : 0;
    if (p.act === "sit") R(x - 7, y - 9, 14, 11, "#2b2f3a"); else if (!seated) R(x - 5, y - 1, 10, 2, "rgba(0,0,0,.22)");
    if (!seated) { R(x - 3, y - 5, 3, 5 - (walk ? 2 : 0), L.pants); R(x, y - 5, 3, 5 - (walk ? 0 : 2), L.pants); }
    const shirt = p.isPlayer && p.hoodie ? "#c2402f" : L.shirt;
    R(x - 4, y - 11 + o, 8, 7, shirt);
    if (p.isPlayer && p.hoodie) R(x - 4, y - 12 + o, 8, 2, "#a8321f");
    R(x - 6, y - 10 + o + walk, 2, 5, shirt); R(x + 4, y - 10 + o + (1 - walk), 2, 5, shirt);
    R(x - 4, y - 18 + o, 8, 7, L.skin);
    const d = p.act === "sit" ? "u" : p.dir;
    if (d === "u") R(x - 4, y - 19 + o, 8, 8, L.hair);
    else {
      R(x - 4, y - 19 + o, 8, 3, L.hair);
      if (d === "d") { R(x - 4, y - 16 + o, 1, 2, L.hair); R(x + 3, y - 16 + o, 1, 2, L.hair); R(x - 2, y - 14 + o, 1, 2, "#1a1a1a"); R(x + 1, y - 14 + o, 1, 2, "#1a1a1a"); }
      else if (d === "l") { R(x + 1, y - 16 + o, 3, 4, L.hair); R(x - 3, y - 14 + o, 1, 2, "#1a1a1a"); }
      else { R(x - 4, y - 16 + o, 3, 4, L.hair); R(x + 2, y - 14 + o, 1, 2, "#1a1a1a"); }
    }
    if (p.hp) { R(x - 5, y - 18 + o, 1, 5, "#222"); R(x + 4, y - 18 + o, 1, 5, "#222"); R(x - 4, y - 20 + o, 8, 1, "#222"); R(x - 6, y - 16 + o, 2, 4, "#e8e8e8"); R(x + 4, y - 16 + o, 2, 4, "#e8e8e8"); }
    const rs = p.isPlayer ? feel().state : roomState();
    if (rs === "hot" && Math.floor(anim * 3) % 2) { R(x + 5, y - 17 + o, 1, 2, "#8fd3ff"); R(x - 6, y - 14 + o, 1, 2, "#8fd3ff"); }
    if (rs === "cold") { if (Math.floor(anim * 6) % 2) R(x - 1, y - 19 + o, 1, 1, "#e8f4ff"); if (!seated && Math.floor(anim * 2) % 2) R(x + (d === "l" ? -8 : 6), y - 12, 2, 1, "#e8f4ff"); }
  }
  function zzz(x, y) { const k = Math.floor(anim * 1.5) % 3; ctx.font = FONT; ctx.fillStyle = "#fff"; ctx.textBaseline = "top"; ctx.fillText("z".repeat(k + 1), x, y - k * 3); }
  function drawBubble(p) {
    if (!p.bubble || performance.now() > p.bubble.until) return;
    ctx.font = FONT;
    const words = p.bubble.text.split(" "), lines = [""];
    for (const w of words) { const l = lines[lines.length - 1]; if ((l + " " + w).trim().length > 15 && l) lines.push(w); else lines[lines.length - 1] = (l + " " + w).trim(); }
    const bw = Math.max(...lines.map((l) => l.length)) * 8 + 8, bh = lines.length * 10 + 6;
    const cx = Math.round(p.x), top = Math.round(p.y) - (p.act === "sit" ? 22 : 24) - bh;
    const bx = clamp(cx - bw / 2, 2, W - bw - 2), by = Math.max(2, top);
    R(bx - 1, by - 1, bw + 2, bh + 2, "#2b1d12"); R(bx, by, bw, bh, "#fbf3df");
    R(clamp(cx - 1, bx + 2, bx + bw - 5), by + bh, 3, 3, "#2b1d12"); R(clamp(cx - 1, bx + 2, bx + bw - 5) + 1, by + bh - 1, 1, 2, "#fbf3df");
    ctx.fillStyle = "#2b1d12"; ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + 4, by + 4 + i * 10));
  }
  function drawMarker(t) {
    const r = t.rect;
    const cx = t.npc ? t.npc.x : r.x + r.w / 2, cy = t.npc ? t.npc.y - 32 : Math.max(r.y - 12, 12);
    const bob = Math.round(Math.sin(anim * 6) * 1.5);
    R(cx - 5, cy - 5 + bob, 11, 11, "#2b1d12"); R(cx - 4, cy - 4 + bob, 9, 9, "#ffc531");
    ctx.font = FONT; ctx.fillStyle = "#2b1d12"; ctx.textBaseline = "top"; ctx.fillText("E", cx - 4, cy - 4 + bob + 1);
  }
  function draw() {
    ctx.drawImage(bg, 0, 0);
    drawWindow(); drawThermoLed(); drawTableItems();
    const list = stations.map((s) => ({ y: s.desk.y + 16, f: () => drawStation(s) }));
    list.push({ y: 247, f: drawTv });
    const folks = S.npcs.slice(); if (phase !== "intro") folks.push(P);
    folks.forEach((p) => list.push({ y: p.act === "couch" ? p.y + 20 : p.y, f: () => drawPerson(p) }));
    list.sort((a, b) => a.y - b.y).forEach((i) => i.f());
    // time-of-day + temperature tint
    const h = (S.clock / 60) % 24;
    const a = h >= 17 && h < 19 ? (h - 17) * 0.09 : h >= 19 || h < 5 ? 0.3 : h >= 5 && h < 7 ? 0.3 - (h - 5) * 0.125 : 0;
    if (a > 0) { ctx.fillStyle = h >= 17 && h < 19 ? `rgba(255,150,60,${a})` : `rgba(18,20,56,${a})`; ctx.fillRect(0, 0, W, H); }
    if (phase !== "intro") {
      const f = feel();
      if (f.state === "hot") { ctx.fillStyle = "rgba(255,110,50,.1)"; ctx.fillRect(0, 0, W, H); }
      else if (f.state === "cold") { ctx.fillStyle = "rgba(110,170,255,.12)"; ctx.fillRect(0, 0, W, H); }
    }
    if (phase === "play" && !dlgOpen) { const t = sleeping() ? null : findTarget(); if (t) drawMarker(t); S._t = t; }
    folks.forEach(drawBubble);
    if (sleeping() && phase === "play") { ctx.fillStyle = "rgba(0,0,20,.25)"; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- HUD ----------
  let hudT = 0;
  function renderHud() {
    el.clock.textContent = fmt(S.clock);
    const rs = phase === "intro" ? { label: "Comfy" } : feel();
    el.temp.textContent = `${toF(S.temp.room)}°F · ${rs.label}${sleeping() ? " · asleep" : ""}`;
    if (phase === "intro") { el.pcline.textContent = ""; return; }
    const pc = P.st.pc, t = TIERS[pc.tier];
    const state = pc.upd ? "updating" : pc.problem ? "broken" : pc.job ? `installing ${Math.round(pc.job.prog)}%` : pc.playing ? `playing ${pc.game}` : "idle";
    const cl = S.call ? ` · MATCH: ${S.call.game}, ${Math.max(0, S.call.deadline - S.clock)} min left` : "";
    el.pcline.textContent = `${pcName(pc)}: ${t.cpu} · ${t.ram} · ${t.os} (${state})${cl}`;
    const vals = { energy: P.energy, belly: P.belly, fun: P.fun, social: P.social, comfort: feel().comfort };
    for (const k in vals) {
      const v = Math.round(vals[k]), m = meterEls[k];
      m.setAttribute("aria-valuenow", String(v)); m.firstElementChild.nextElementSibling.firstElementChild.style.width = v + "%";
      m.classList.toggle("low", v < 25);
    }
    const t0 = S._t;
    el.hint.textContent = phase === "play" ? (t0 ? `E: ${t0.label}${t0.label === "Pizza table" && S.pizza.slices ? ` (${S.pizza.slices} slices)` : ""}` : "Walk: arrows / WASD or click. Interact: E or Space.") : "";
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    anim += dt;
    if (phase === "play") {
      if (!dlgOpen && queue.length) queue.shift()();
      if (!dlgOpen) {
        const sp = speed === 0 ? 0 : sleeping() ? Math.max(speed, 4) : speed, sdt = dt * sp;
        keyMove(dt * (sp ? 1 : 0));
        if (sdt > 0) {
          S.acc += sdt;
          let guard = 0;
          while (S.acc >= MIN_SEC && guard++ < 20 && phase === "play") { S.acc -= MIN_SEC; tickMinute(); }
          const mdt = Math.min(sdt, 0.25);
          [P, ...S.npcs].forEach((p) => stepPerson(p, mdt));
          argueStep(sdt);
        }
      }
    }
    draw();
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.2; renderHud(); }
  }

  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(root);
  setupDay(false);
  S.log = []; el.log.replaceChildren();
  openDialog({
    modal: true, center: true, title: "LAN Party Simulator",
    body: "It's 12:00 noon, and the LAN runs until 9:30 PM. The early crew is already set up. You'll install games, fix PCs, survive updates, argue about pizza, judge the chips, and try not to fall asleep. How do you show up?",
    opts: [{ label: "Bring my own PC (heavy, but reliable)", run: () => begin(true) }, { label: "Use a random PC (surprise!)", run: () => begin(false) }]
  });
  requestAnimationFrame(frame);
})();
