// "On this day in her kitchen": recipes she posted on today's date in earlier years.
(async () => {
  const box = document.querySelector("[data-today]");
  if (!box) return;
  const d = new Date(), key = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  let rows;
  try { rows = await (await fetch((window.BASE || "") + "/search.json")).json(); } catch (e) { return; }
  const near = k => rows.filter(p => p.d === k && p.i);
  let hits = near(key);
  for (let i = 1; hits.length < 4 && i <= 3; i++) {   // widen to nearby days if today is quiet
    const x = new Date(d); x.setDate(d.getDate() - i);
    hits = hits.concat(near(String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0")));
  }
  if (!hits.length) return;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  box.querySelector("[data-today-label]").textContent = d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
  box.querySelector("[data-today-row]").innerHTML = hits.slice(0, 8).map(p =>
    `<a class="card" href="${window.BASE || ""}/${p.s}/"><span class="card-img"><img src="${esc(p.i)}" alt="" loading="lazy"></span><span class="card-body"><span class="card-eyebrow">${p.y}</span><span class="card-title">${esc(p.t)}</span></span></a>`).join("");
  box.hidden = false;
})();
