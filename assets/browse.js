// Recipe search and filters, all in the browser from /search.json.
(async () => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const results = $("[data-results]"), count = $("[data-count]"), more = $("[data-more]"), q = $("#q"), sort = $("[data-sort]");
  const PAGE = 48;
  let all = [], shown = PAGE;
  const norm = s => (s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const params = new URLSearchParams(location.search);
  q.value = params.get("q") || "";
  ["r", "c", "e", "o", "f"].forEach(k => params.getAll(k).forEach(v => { const el = $(`input[name="${k}"][value="${CSS.escape(v)}"]`); if (el) el.checked = true; }));
  if (location.hash === "#q") q.focus();

  const card = p => `<a class="card" href="${window.BASE || ""}/${p.s}/"><span class="card-img">${p.i ? `<img src="${esc(p.i)}" alt="" loading="lazy" decoding="async">` : `<span class="card-noimg" aria-hidden="true">${esc(p.t[0])}</span>`}</span><span class="card-body">${(() => { const w = p.r.includes("Sindhi") ? "Sindhi" : (p.p[0] || p.r[0]); return w ? `<span class="card-eyebrow">${esc(w)}</span>` : ""; })()}<span class="card-title">${esc(p.t)}</span></span></a>`;

  function run(resetPage = true) {
    if (resetPage) shown = PAGE;
    const words = norm(q.value).split(/\s+/).filter(Boolean);
    const sel = k => $$(`input[name="${k}"]:checked`).map(i => i.value);
    const f = { r: sel("r"), c: sel("c"), e: sel("e"), o: sel("o") }, card_only = sel("f").length > 0;
    let rows = all.filter(p =>
      (!f.r.length || f.r.some(v => p.r.includes(v))) && (!f.c.length || f.c.some(v => p.c.includes(v))) &&
      (!f.e.length || f.e.some(v => p.e.includes(v))) && (!f.o.length || f.o.some(v => p.o.includes(v))) &&
      (!card_only || p.f) && words.every(w => p._h.includes(w)));
    if (words.length) rows.sort((a, b) => b._t.includes(words.join(" ")) - a._t.includes(words.join(" ")) || b.y - a.y);
    else if (sort.value === "old") rows.sort((a, b) => a.y - b.y);
    else if (sort.value === "az") rows.sort((a, b) => a.t.localeCompare(b.t));
    count.textContent = `${rows.length.toLocaleString("en-IN")} recipe${rows.length === 1 ? "" : "s"}`;
    results.innerHTML = rows.slice(0, shown).map(card).join("") || `<p class="muted">Nothing matches yet. Try fewer words or clear a filter.</p>`;
    more.hidden = rows.length <= shown;
    const u = new URLSearchParams();
    if (q.value) u.set("q", q.value);
    Object.entries(f).forEach(([k, vs]) => vs.forEach(v => u.append(k, v)));
    if (card_only) u.set("f", "1");
    history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
  }

  try {
    all = await (await fetch((window.BASE || "") + "/search.json")).json();
  } catch (e) { count.textContent = "Couldn't load recipes. Please refresh."; return; }
  all.forEach(p => { p._t = norm(p.t + " " + p.a); p._h = norm([p.t, p.a, ...p.r, ...p.p, ...p.c, ...p.e, ...p.o].join(" ")); });
  run();
  let t; q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 120); });
  $$(".filters input").forEach(i => i.addEventListener("change", () => run()));
  sort.addEventListener("change", () => run());
  more.addEventListener("click", () => { shown += PAGE; run(false); });
  $(".clear").addEventListener("click", () => { $$(".filters input").forEach(i => i.checked = false); q.value = ""; run(); });
  const tog = $(".filters-toggle");
  tog.addEventListener("click", () => { const o = $(".filters").classList.toggle("open"); tog.setAttribute("aria-expanded", o); });
})();
