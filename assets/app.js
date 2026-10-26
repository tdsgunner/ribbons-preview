// Ribbons to Pastas: small page behaviours. No dependencies.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // mobile menu
  const menu = $(".menu-btn");
  menu?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menu.setAttribute("aria-expanded", open);
  });

  // mark current section in the nav
  const here = location.pathname;
  $$(".nav a").forEach(a => { if (a.getAttribute("href") !== "/" && here.startsWith(a.getAttribute("href"))) a.setAttribute("aria-current", "page"); });

  // cook mode: keep the screen awake and enlarge text
  let lock = null;
  const cook = $("[data-cook]");
  const setCook = async on => {
    document.body.classList.toggle("cooking", on);
    cook.setAttribute("aria-pressed", on);
    cook.textContent = on ? "Cook mode on" : "Cook mode";
    try {
      if (on && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      else if (lock) { await lock.release(); lock = null; }
    } catch (e) { /* not supported or denied; text still enlarges */ }
  };
  cook?.addEventListener("click", () => setCook(!document.body.classList.contains("cooking")));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && document.body.classList.contains("cooking")) setCook(true);
  });

  $("[data-print]")?.addEventListener("click", () => window.print());

  // share: native sheet on phones, WhatsApp link elsewhere
  $("[data-share]")?.addEventListener("click", async e => {
    const title = e.currentTarget.dataset.title, url = location.href.split("#")[0];
    if (navigator.share) { try { await navigator.share({ title, url }); } catch (_) {} return; }
    window.open("https://wa.me/?text=" + encodeURIComponent(`${title} ${url}`), "_blank", "noopener");
  });

  // tap a step to mark it done
  $$(".steps li").forEach(li => {
    const toggle = () => li.classList.toggle("done");
    li.addEventListener("click", toggle);
    li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });

  // servings scaler: rewrites numeric amounts, leaves "to taste" alone
  const FR = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅛": .125 };
  const parse = s => {
    s = s.trim().replace(/[½⅓⅔¼¾⅛]/g, m => " " + FR[m]).trim();
    const m = s.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+))?\s*(?:(\d*\.\d+))?$/);
    if (!m || (!m[1] && !m[2] && !m[4])) return null;
    return (+m[1] || 0) + (m[2] ? m[2] / m[3] : 0) + (+m[4] || 0);
  };
  const show = n => {
    const whole = Math.floor(n + 1e-9), rest = n - whole;
    const f = [[0, ""], [.125, "⅛"], [.25, "¼"], [1 / 3, "⅓"], [.5, "½"], [2 / 3, "⅔"], [.75, "¾"], [1, ""]]
      .reduce((a, b) => Math.abs(b[0] - rest) < Math.abs(a[0] - rest) ? b : a);
    const w = f[0] === 1 ? whole + 1 : whole;
    return (w ? w : "") + (f[1] ? (w ? " " : "") + f[1] : "") || "0";
  };
  $$(".scaler").forEach(sc => {
    const base = parseFloat(sc.dataset.base);
    if (!base) return;
    let now = base;
    const out = $("output", sc);
    sc.addEventListener("click", e => {
      const step = +e.target.dataset.step;
      if (!step) return;
      now = Math.max(1, now + step);
      out.textContent = now;
      $$(".amt").forEach(a => {
        const range = a.dataset.amt.split(/\s*[-–]\s*/).map(parse);
        if (range.some(v => v == null)) return;
        a.textContent = range.map(v => show(v * now / base)).join("–");
      });
    });
  });

  // send to the cook: a plain WhatsApp-ready recipe, quantities as currently scaled
  const sheet = $("[data-cook-sheet]"), backdrop = $("[data-cook-backdrop]");
  const clean = s => s.replace(/\s+/g, " ").trim();
  function cookText(doc = document, url = location.href.split(/[?#]/)[0]) {
    const $ = (s, el = doc) => el.querySelector(s), $$ = (s, el = doc) => [...el.querySelectorAll(s)];
    const title = clean($(".post-head h1")?.textContent || doc.title);
    const lines = [`*${title}*`];
    const serves = $(".scaler output")?.textContent;
    if (serves) lines.push(`Serves ${serves}`);
    const card = $(".recipe-card");
    if (card) {
      lines.push("", "*Ingredients*");
      $$(".rc-ing > h4, .rc-ing .checks li", card).forEach(el => {
        if (el.tagName === "H4") lines.push("", `_${clean(el.textContent)}_`);
        else lines.push(`☐ ${clean(el.textContent)}`);
      });
      lines.push("", "*Method*");
      let n = 0;
      $$(".rc-steps > h4, .rc-steps .steps li", card).forEach(el => {
        if (el.tagName === "H4") { if (clean(el.textContent) !== "Notes") lines.push("", `_${clean(el.textContent)}_`); }
        else lines.push(`${++n}. ${clean(el.textContent)}`);
      });
      const note = $(".rc-notes p", card);
      if (note) lines.push("", `Note: ${clean(note.textContent)}`);
    } else {
      $$(".post-body h4, .post-body ul.lines li").forEach(el => {
        if (el.tagName === "H4") lines.push("", `*${clean(el.textContent)}*`);
        else if (clean(el.textContent)) lines.push(`• ${clean(el.textContent)}`);
      });
    }
    lines.push("", `Recipe by Vaishali Sabnani: ${url}`);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n");
  }
  const openCook = text => { $("[data-cook-text]").value = text; syncWa(); setOpen(true); };
  window.R2P = { cookText, openCook };
  const setOpen = on => { sheet.hidden = backdrop.hidden = !on; document.body.style.overflow = on ? "hidden" : ""; };
  const syncWa = () => { $("[data-cook-wa]").href = "https://wa.me/?text=" + encodeURIComponent($("[data-cook-text]").value); };
  $(".post-wrap [data-cook-send]")?.addEventListener("click", () => openCook(cookText()));
  $("[data-cook-text]")?.addEventListener("input", syncWa);
  $("[data-cook-close]")?.addEventListener("click", () => setOpen(false));
  backdrop?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && sheet && !sheet.hidden) setOpen(false); });
  $("[data-cook-copy]")?.addEventListener("click", async e => {
    const b = e.currentTarget, ta = $("[data-cook-text]");
    try { await navigator.clipboard.writeText(ta.value); b.textContent = "Copied"; }
    catch (_) { ta.select(); document.execCommand("copy"); b.textContent = "Copied"; }
    setTimeout(() => b.textContent = "Copy", 1800);
  });
})();
