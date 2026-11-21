(async () => {
  let GENRES, GAMES;
  try {
    const res = await fetch("data/games.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    ({ genres: GENRES, games: GAMES } = await res.json());
  } catch (err) {
    document.getElementById("result").textContent =
      "Couldn't load data/games.json. If you opened this file directly, serve the folder instead (for example: python -m http.server).";
    return;
  }
  const PIP_CAP = 16;
  const HEADCOUNTS = [2, 4, 8, 12, 16, 32, 64];
  const MODES = [
    { id: "any", label: "Any" },
    { id: "coop", label: "Co-op" },
    { id: "versus", label: "Versus" }
  ];
  const SRC = {
    pcgw: { cls: "tag-pcgw", label: "PCGamingWiki", hint: "LAN player count from PCGamingWiki" },
    checked: { cls: "tag-chk", label: "Checked", hint: "Confirmed against another published source" },
    reported: { cls: "tag-rep", label: "Reported", hint: "Reported from hands-on experience with the game or mod" },
    unverified: { cls: "tag-unv", label: "Unverified", hint: "Usual server limit; test before relying on it" }
  };
  const CAVEATS = {
    limited: "PCGamingWiki lists LAN support as limited.",
    hackable: "PCGamingWiki says LAN needs extra setup.",
    unknown: "PCGamingWiki does not confirm LAN play; use a self-hosted server.",
    false: "PCGamingWiki lists no LAN mode; play is online."
  };
  const MODE_LABEL = { coop: "Co-op", versus: "Versus" };

  const state = { mode: "any", min: 0, genre: "all", q: "", offline: false };
  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const needsInternet = (g) => !!g.internet;
  const matchesText = (g) => {
    if (!state.q) return true;
    const hay = norm([g.name, g.mod, g.note].filter(Boolean).join(" "));
    return norm(state.q).split(" ").every((w) => hay.includes(w));
  };
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const genreById = Object.fromEntries(GENRES.map((g) => [g.id, g]));

  // The count a game is judged by under the current mode filter.
  const relevant = (g) => {
    const c = g.coop ? g.coop.n : 0;
    const v = g.versus ? g.versus.n : 0;
    if (state.mode === "coop") return c;
    if (state.mode === "versus") return v;
    return Math.max(c, v);
  };

  // ---- Hero --------------------------------------------------------------
  function renderHero() {
    const withCoop = GAMES.filter((g) => g.coop).length;
    const withVersus = GAMES.filter((g) => g.versus).length;
    const stats = [
      [GAMES.length, "games"],
      [withVersus, "with versus"],
      [withCoop, "with co-op"]
    ];
    const dl = $("stats");
    stats.forEach(([n, label]) => {
      const box = el("div", "stat");
      box.append(el("dd", "stat-n", String(n)), el("dt", "stat-l", label));
      dl.append(box);
    });

    const lobby = $("lobby");
    for (let i = 0; i < PIP_CAP; i++) {
      const li = el("li", "slot", "P" + (i + 1));
      li.style.setProperty("--i", i);
      li.style.setProperty("--g", GENRES[i % GENRES.length].color);
      lobby.append(li);
    }
  }

  // ---- Toolbar -----------------------------------------------------------
  function chip(label, pressed, onClick) {
    const b = el("button", "chip", label);
    b.type = "button";
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick);
    return b;
  }

  function renderBar() {
    const modes = $("modes");
    const head = $("headcount");
    const genres = $("genres");
    const network = $("network");
    network.replaceChildren(
      chip("Any", !state.offline, () => { state.offline = false; sync(); }),
      chip("Works offline", state.offline, () => { state.offline = true; sync(); })
    );
    modes.replaceChildren(...MODES.map((m) => chip(m.label, state.mode === m.id, () => { state.mode = m.id; sync(); })));
    head.replaceChildren(
      chip("Any", state.min === 0, () => { state.min = 0; sync(); }),
      ...HEADCOUNTS.map((n) => chip(n + "+", state.min === n, () => { state.min = n; sync(); }))
    );
    genres.replaceChildren(
      chip("All", state.genre === "all", () => { state.genre = "all"; sync(); }),
      ...GENRES.map((g) => {
        const b = chip(g.name, state.genre === g.id, () => { state.genre = g.id; sync(); });
        b.style.setProperty("--g", g.color);
        return b;
      })
    );
  }

  // ---- Cards -------------------------------------------------------------
  function pips(n) {
    const wrap = el("span", "pips");
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < PIP_CAP; i++) wrap.append(el("i", i < n ? "on" : ""));
    if (n > PIP_CAP) wrap.append(el("b", "over", "+"));
    return wrap;
  }

  function modeRow(key, data) {
    const row = el("div", "mode" + (data ? "" : " none"));
    row.dataset.mode = key;
    row.append(el("span", "mode-name", MODE_LABEL[key]));
    if (!data) {
      row.append(el("span", "mode-none", "Not available"));
      return row;
    }
    const src = SRC[data.src];
    const count = el("span", "count", String(data.n));
    count.setAttribute("aria-label", `${data.n} players`);
    const tag = el("span", "tag " + src.cls, src.label);
    tag.title = src.hint;
    row.append(pips(data.n), count, tag);
    return row;
  }

  function card(g) {
    const art = el("article", "card");
    art.style.setProperty("--g", genreById[g.genre].color);
    art.dataset.name = g.name;
    const top = el("div", "card-top");
    top.append(el("h3", "card-name", g.name));
    art.append(top);
    if (g.mod) {
      if (g.modUrl) {
        const m = el("a", "mod", g.mod);
        m.href = g.modUrl;
        m.target = "_blank";
        m.rel = "noopener";
        art.append(m);
      } else art.append(el("p", "mod", g.mod));
    }
    art.append(el("p", "note", g.note));
    const modes = el("div", "modes");
    modes.append(modeRow("coop", g.coop), modeRow("versus", g.versus));
    const links = el("div", "links");
    const addLink = (text, href, site) => {
      const a = el("a", "ext-link", text);
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", `${g.name} on ${site} (opens in a new tab)`);
      links.append(a);
    };
    if (g.pcgw) addLink("PCGamingWiki", g.pcgw.url, "PCGamingWiki");
    if (g.scripts) addLink("LAN scripts", g.scripts, "GitHub (LAN scripts)");
    art.append(modes);
    if (g.internet) {
      const b = el("p", "net net-" + g.internet.level);
      b.append(el("strong", "", g.internet.level === "required" ? "Needs internet" : "Internet for sign-in or server"), document.createTextNode(" " + g.internet.note));
      art.append(b);
    }
    if (g.pcgw && g.pcgw.caveat && !g.internet) {
      art.append(el("p", "caveat", CAVEATS[g.pcgw.caveat] || "PCGamingWiki does not confirm LAN play."));
    }
    art.append(links);
    return art;
  }

  function renderSections() {
    const host = $("sections");
    host.replaceChildren();
    GENRES.forEach((genre) => {
      const sec = el("section", "genre");
      sec.id = "g-" + genre.id;
      sec.dataset.genre = genre.id;
      sec.style.setProperty("--g", genre.color);
      const head = el("header", "genre-head");
      const title = el("h2", "genre-name", genre.name);
      const meta = el("p", "genre-blurb", genre.blurb);
      const count = el("span", "genre-count");
      head.append(title, meta, count);
      const grid = el("div", "grid");
      GAMES.filter((g) => g.genre === genre.id).forEach((g) => grid.append(card(g)));
      sec.append(head, grid);
      host.append(sec);
    });
  }

  // ---- Filtering ---------------------------------------------------------
  function applyFilters() {
    const host = $("sections");
    host.dataset.mode = state.mode;
    let shown = 0;

    host.querySelectorAll(".genre").forEach((sec) => {
      const genreOk = state.genre === "all" || state.genre === sec.dataset.genre;
      const grid = sec.querySelector(".grid");
      const cards = [...grid.children];
      const entries = cards.map((node) => ({ node, game: GAMES.find((g) => g.name === node.dataset.name) }));

      entries.sort((a, b) => relevant(b.game) - relevant(a.game) || a.game.name.localeCompare(b.game.name));
      entries.forEach((e) => grid.append(e.node));

      let visible = 0;
      entries.forEach(({ node, game }) => {
        const ok = genreOk && (!state.offline || !needsInternet(game)) && matchesText(game) && relevant(game) > 0 && relevant(game) >= state.min;
        const wasHidden = node.hidden;
        node.hidden = !ok;
        if (ok) {
          visible++;
          if (wasHidden) {
            node.classList.remove("enter");
            void node.offsetWidth; // restart the fade-in
            node.classList.add("enter");
          }
        }
      });
      sec.hidden = visible === 0;
      sec.querySelector(".genre-count").textContent = visible + (visible === 1 ? " game" : " games");
      shown += visible;
    });

    $("result").textContent = `Showing ${shown} of ${GAMES.length} games`;
    $("empty").hidden = shown !== 0;
  }

  function sync() {
    renderBar();
    applyFilters();
  }

  $("q").addEventListener("input", (e) => {
    state.q = e.target.value;
    applyFilters();
  });

  $("reset").addEventListener("click", () => {
    state.q = "";
    $("q").value = "";
    state.offline = false;
    state.mode = "any";
    state.min = 0;
    state.genre = "all";
    sync();
  });

  const initial = new URLSearchParams(location.search).get("q");
  if (initial) { state.q = initial; $("q").value = initial; }

  renderHero();
  renderSections();
  sync();
})();
