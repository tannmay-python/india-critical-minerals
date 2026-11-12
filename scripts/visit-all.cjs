#!/usr/bin/env node
// Opens every kind of page in headless Chrome and reports console errors, failed requests and
// horizontal overflow at desktop and phone widths. Needs the dev server on 5190.
//   NODE_PATH=../_work/tools/node_modules node scripts/visit-all.cjs
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://127.0.0.1:5190/";
const ROUTES = ["#/", "#/?lens=groups", "#/?lens=score", "#/?lens=projects", "#/?lens=capability", "#/?lens=lists", "#/explorer", "#/explorer?group=2&sort=demand", "#explorer", "#/mineral/Copper", "#/mineral/Tellurium", "#/mineral/Vanadium", "#/mineral/Osmium", "#/mineral/Bismuth", "#/mineral/Neodymium", "#/mineral/Platinum", "#/mineral/Potash", "#/mineral/Lithium", "#/mineral/Beryllium", "#/mineral/Promethium",
  "#/projects", "#/projects?show=chain", "#/projects?show=time", "#/projects?show=auctions", "#/projects?view=abroad", "#/projects?id=irel-repm-vizag",
  "#/project/kmml-chavara", "#/project/blk-off-sewell-rise-01", "#/capabilities", "#/capability/rare-earth-separation", "#/technology/ion-exchange-resins",
  "#/groups", "#/groups/2", "#/method", "#/compare?m=Copper,Germanium,Cerium", "#mineral/Gallium", "#/e/irel-repm-vizag", "#/strategy/potash-mining", "#/nope"];
(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  let bad = 0;
  for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: label === "phone", hasTouch: label === "phone" });
    for (const r of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("requestfailed", (q) => { if (!/openfreemap|tiles/.test(q.url())) errors.push("failed: " + q.url()); });
      await page.goto(BASE + r, { waitUntil: "load" });
      await page.waitForTimeout(/projects(\?|$)/.test(r) && !/show=/.test(r) ? 3500 : 900);
      const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, h1: document.querySelector("h1")?.textContent ?? "", title: document.title, hash: location.hash, text: document.body.innerText.length }));
      const flags = [...errors.map((e) => "ERR " + e.slice(0, 140)), ...(m.over > 2 ? [`OVERFLOW +${m.over}px`] : []), ...(m.text < 200 ? ["EMPTY PAGE"] : [])];
      if (flags.length) { bad++; console.log(`${label} ${r} -> ${m.hash}\n   ${flags.join("\n   ")}`); }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `${bad} page views with problems` : "all page views clean");
  process.exit(bad ? 1 : 0);
})();
