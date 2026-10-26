// आज क्या बनेगा: one dish for today, then narrow down by mood, then a few, then the whole bank.
(async () => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const B = window.BASE || "";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let all;
  try { all = await (await fetch(B + "/search.json")).json(); } catch (e) { $("[data-pick-title]").textContent = "Couldn't load recipes. Please refresh."; return; }

  const MAIN = ["Breakfast", "Snacks & Street Food", "Curries & Dals", "Rice & Biryani", "Breads", "Thalis & Platters", "Sweets & Desserts"];
  const MOOD = {
    quick: p => p.m > 0 && p.m <= 30,
    comfort: p => p.c.some(c => ["Curries & Dals", "Rice & Biryani", "Breads"].includes(c)),
    light: p => p.c.includes("Salads & Soups") || p.e.includes("High Protein") || p.e.includes("Vegan"),
    sweet: p => p.c.includes("Sweets & Desserts") || p.c.includes("Baking"),
    snack: p => p.c.includes("Snacks & Street Food"),
    breakfast: p => p.c.includes("Breakfast"),
    guests: p => p.c.includes("Thalis & Platters") || p.o.includes("Parties"),
    kids: p => p.o.includes("Kids' Favourites"),
    festive: p => p.o.includes("Festivals"),
  };
  const usable = all.filter(p => p.b && p.c.some(c => MAIN.includes(c)));
  const seen = new Set();

  // same dish for everyone on a given day; Sundays are Sindhi
  const today = new Date(), key = today.getFullYear() * 1000 + Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 864e5);
  const hash = n => { let x = n * 2654435761 % 4294967296; return x; };
  const pool = usable.filter(p => p.f && !p.r.includes("Around the World") && (today.getDay() === 0 ? p.r.includes("Sindhi") : true));
  const todays = pool[hash(key) % pool.length];

  const where = p => p.r.includes("Sindhi") ? "Sindhi" : (p.p[0] || p.r[0] || "");
  const facts = p => [p.m ? `${p.m} min` : "", p.c[0] || "", p.y].filter(Boolean).join(" · ");
  function showPick(p, label) {
    seen.add(p.s); current = p;
    const url = `${B}/${p.s}/`;
    $("[data-pick-label]").textContent = label;
    $("[data-pick-img]").src = p.b;
    $("[data-pick-where]").textContent = where(p);
    $("[data-pick-title]").textContent = p.t;
    $("[data-pick-facts]").textContent = facts(p);
    $("[data-pick-link]").href = url; $("[data-pick-go]").href = url;
    step("pick");
  }
  function step(name) {
    $$(".aaj-step").forEach(el => el.hidden = el.dataset.step !== name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let round = 0;  // 0 = today's dish, 1 = mood suggestion
  const chosen = () => ({ moods: $$(".mood.on[data-k]").map(b => b.dataset.k), regions: $$(".mood.on[data-r]").map(b => b.dataset.r) });
  const matches = () => {
    const { moods, regions } = chosen();
    return usable.filter(p => (!moods.length || moods.some(m => MOOD[m](p))) && (!regions.length || regions.some(r => p.r.includes(r))));
  };
  const updateCount = () => { const n = matches().length; $("[data-match]").textContent = `${n.toLocaleString("en-IN")} dish${n === 1 ? "" : "es"} match`; $("[data-suggest]").disabled = !n; };

  $$(".mood").forEach(b => b.addEventListener("click", () => { b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on")); updateCount(); }));
  $$(".mood").forEach(b => b.setAttribute("aria-pressed", "false"));

  let current = null;
  $("[data-cook-send]").addEventListener("click", async e => {
    const b = e.currentTarget, label = b.textContent;
    b.textContent = "Preparing…";
    try {
      const html = await (await fetch(`${B}/${current.s}/`)).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      window.R2P.openCook(window.R2P.cookText(doc, `${location.origin}${B}/${current.s}/`));
    } catch (_) { location.href = `${B}/${current.s}/`; }
    b.textContent = label;
  });
  $("[data-skip]").addEventListener("click", () => showFew());
  $("[data-not]").addEventListener("click", () => {
    if (round === 0) { round = 1; updateCount(); step("mood"); return; }
    showFew();
  });
  function showFew() {
    const rest = matches().filter(p => !seen.has(p.s)).sort(() => Math.random() - .5).slice(0, 6);
    $("[data-few]").innerHTML = rest.map(p => `<a class="card" href="${B}/${p.s}/"><span class="card-img"><img src="${esc(p.i || p.b)}" alt="" loading="lazy"></span><span class="card-body"><span class="card-eyebrow">${esc(where(p))}</span><span class="card-title">${esc(p.t)}</span></span></a>`).join("") || `<p class="muted">That’s everything for these moods. Try the full collection.</p>`;
    const { moods, regions } = chosen(), u = new URLSearchParams();
    regions.forEach(r => u.append("r", r));
    const C = { comfort: ["Curries & Dals", "Rice & Biryani", "Breads"], sweet: ["Sweets & Desserts", "Baking"], snack: ["Snacks & Street Food"], breakfast: ["Breakfast"], guests: ["Thalis & Platters"], light: ["Salads & Soups"] };
    moods.forEach(m => (C[m] || []).forEach(c => u.append("c", c)));
    if (moods.includes("kids")) u.append("o", "Kids' Favourites");
    if (moods.includes("festive")) u.append("o", "Festivals");
    $("[data-all]").href = `${B}/recipes/${u.toString() ? "?" + u : ""}`;
    step("few");
  }

  $("[data-suggest]").addEventListener("click", () => {
    const m = matches(), fresh = m.filter(p => !seen.has(p.s)), from = fresh.length ? fresh : m;
    const withCard = from.filter(p => p.f);
    const list = withCard.length ? withCard : from;
    showPick(list[Math.floor(Math.random() * list.length)], "How about this?");
    $("[data-not]").textContent = "Not this either";
  });
  $("[data-restart]").addEventListener("click", () => { round = 0; $("[data-not]").textContent = "Not today"; seen.clear(); $$(".mood.on").forEach(b => b.classList.remove("on")); showPick(todays, "Today’s dish"); });

  showPick(todays, today.getDay() === 0 ? "Sindhi Sunday" : "Today’s dish");
})();
