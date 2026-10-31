// Exercises the production export at a gateway-style subpath. All external API
// calls are deliberately failed except one delayed empty-response test. No wallet is fabricated.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { chromium, webkit } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const root = fileURLToPath(new URL("../dist", import.meta.url));
const out = fileURLToPath(new URL("../test/scratch/interactions/", import.meta.url));
await mkdir(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/preview\//, "");
    let file = resolve(root, path || "index.html");
    if (!file.startsWith(root + sep)) throw new Error("Outside export");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const report = { externalData: "API requests intentionally aborted, except delayed empty JSON responses for the unsaved-form check; clipboard mocked; ten layout-only test event lines inserted; no wallet or transaction mocked", browsers: [], checks: [] };
const check = (name) => { report.checks.push(name); console.log(`PASS ${name}`); };

async function run(name, engine) {
  let browser;
  try {
    browser = await engine.launch({ headless: true });
  } catch (error) {
    if (name !== "webkit") throw error;
    report.browsers.push({ name, status: "unavailable", reason: "Launch failed: required native WebKit libraries are unavailable on this machine." });
    console.log("LIMITATION WebKit could not launch (native libraries unavailable).");
    return;
  }
  report.browsers.push({ name, status: "tested", version: browser.version() });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    // Make copy tests deterministic across browser clipboard permission models.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        async writeText(value) { window.__copiedText = value; },
      } });
    });
    const page = await context.newPage();
    const scriptErrors = [], localErrors = [];
    page.on("pageerror", (error) => scriptErrors.push(error.message));
    page.on("response", (response) => {
      if (response.url().startsWith(base) && response.status() >= 400) localErrors.push(response.url());
    });
    page.on("requestfailed", (request) => {
      if (request.url().startsWith(base)) localErrors.push(request.url());
    });
    await page.goto(base);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const action = await page.getByRole("link", { name: "Open the overlay" }).boundingBox();
    assert.ok(action && action.y + action.height <= 844);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://squeekstage.online/");
    check(`${name}: custom canonical and primary action visible at 390`);
    await page.getByText("Live data unavailable. Reload to try again.", { exact: true }).waitFor();
    check(`${name}: offline home state offers a recovery action`);

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [hash, title] of [["/", "The hamster runs."], ["/setup", "Streamer setup"], ["/stage", "Stream overlay"], ["/tip", "Send a tip"], ["/about", "A stage for the wheel"]]) {
        await page.goto(base + "#" + hash);
        await page.getByRole("heading", { level: 1 }).waitFor();
        assert.ok((await page.getByRole("heading", { level: 1 }).innerText()).includes(title));
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${hash} overflows at ${width}`);
        if (name === "chromium" && [390, 1440].includes(width) && hash === "/") await page.screenshot({ path: resolve(out, `home-${width}.png`) });
        if (name === "chromium" && width === 390 && hash === "/setup") await page.screenshot({ path: resolve(out, "setup-390.png"), fullPage: true });
      }
    }
    check(`${name}: five routes reflow at 320, 390, 768 and 1440; all local assets load`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "#/setup");
    const wallet = page.getByLabel("Streamer wallet");
    await wallet.fill("not-an-address");
    await page.getByRole("button", { name: "Save settings" }).click();
    assert.equal(await wallet.getAttribute("aria-invalid"), "true");
    assert.equal(await wallet.evaluate((el) => document.activeElement === el), true);
    await wallet.fill("");
    await page.getByLabel("Alert threshold (SQK)").fill("-1");
    await page.getByRole("button", { name: "Save settings" }).click();
    assert.equal(await page.getByLabel("Alert threshold (SQK)").getAttribute("aria-invalid"), "true");
    await page.getByLabel("Alert threshold (SQK)").fill("2.5");
    await page.getByLabel("Overlay accent colour").fill("#5b7cfa");
    await page.getByLabel("Alert sound").selectOption("0");
    await page.getByLabel("Demo feed").selectOption("1");
    await page.getByRole("button", { name: "Save settings" }).click();
    const overlay = new URL(await page.locator("#overlay-url").innerText());
    const tip = new URL(await page.locator("#tip-url").innerText());
    assert.equal(overlay.origin, "https://squeekstage.online");
    assert.equal(overlay.hash, "#/stage");
    assert.deepEqual(Object.fromEntries(overlay.searchParams), { obs: "1", accent: "#5b7cfa", minTip: "2.5", demo: "1", sound: "0" });
    assert.equal(tip.origin, overlay.origin);
    assert.equal(tip.hash, "#/tip");
    await page.getByRole("button", { name: "Copy for OBS" }).click();
    assert.equal(await page.evaluate(() => window.__copiedText), overlay.href);
    await page.getByRole("button", { name: "Copy for chat" }).click();
    assert.equal(await page.evaluate(() => window.__copiedText), tip.href);
    await page.reload();
    assert.equal(await page.getByLabel("Alert threshold (SQK)").inputValue(), "2.5");
    assert.equal(await page.getByLabel("Demo feed").inputValue(), "1");
    check(`${name}: inline validation, save, reload, and canonical OBS/chat copy with all settings`);

    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Denied for test"); }; });
    await page.getByRole("button", { name: "Copy for OBS" }).click();
    await page.getByText("Could not copy.", { exact: false }).waitFor();
    await page.getByRole("button", { name: "Dismiss" }).last().click();
    await page.getByRole("button", { name: "Reset settings" }).click();
    assert.equal(await page.getByLabel("Alert threshold (SQK)").inputValue(), "1");
    assert.equal(await page.getByLabel("Demo feed").inputValue(), "0");
    check(`${name}: copy rejection reports a recoverable error; reset restores defaults`);

    let release, allDone;
    const gate = new Promise((done) => { release = done; });
    const completed = new Promise((done) => { allDone = done; });
    let responses = 0;
    const delayedAPI = async (route) => {
      await gate;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      if (++responses === 5) allDone();
    };
    await context.route("https://api.squeekchain.com/**", delayedAPI);
    await page.goto(base + "?latency-check=1#/setup");
    await page.getByLabel("Streamer wallet").fill("unsaved-input");
    release();
    let completionTimeout;
    try {
      await Promise.race([completed, new Promise((_, reject) => {
        completionTimeout = setTimeout(() => reject(new Error("Delayed API test did not complete five responses")), 10_000);
      })]);
    } finally {
      clearTimeout(completionTimeout);
    }
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.getByLabel("Streamer wallet").inputValue(), "unsaved-input");
    await context.unroute("https://api.squeekchain.com/**", delayedAPI);
    check(`${name}: initial API completion preserves an in-progress setup form`);

    await page.getByRole("link", { name: "Overlay", exact: true }).click();
    await page.getByRole("button", { name: "Test alert", exact: true }).click();
    await page.locator(".alert").waitFor();
    assert.ok((await page.locator(".alert").innerText()).includes("demo"));
    assert.equal(await page.locator(".alert").evaluate((el) => getComputedStyle(el).animationName), "none");
    if (name === "chromium") await page.screenshot({ path: resolve(out, "overlay-390.png"), fullPage: true });
    check(`${name}: test alert is labelled demo and reduced motion stops animation`);

    await page.setViewportSize({ width: 1440, height: 900 });
    // A realistic long feed is a layout fixture, never production/live data.
    await page.locator("#s-ticker").evaluate((el) => {
      el.replaceChildren(...Array.from({ length: 10 }, (_, i) => {
        const line = document.createElement("span");
        line.textContent = `Layout test event ${i + 1}: settlement with block, work and time details`;
        return line;
      }));
    });
    const boxes = await page.evaluate(() => {
      const wheel = document.querySelector(".wheel").getBoundingClientRect();
      const progress = document.querySelector(".progress").getBoundingClientRect();
      const ticker = document.querySelector(".ticker").getBoundingClientRect();
      return { wheelBottom: wheel.bottom, progressTop: progress.top, progressBottom: progress.bottom, tickerTop: ticker.top };
    });
    assert.ok(boxes.progressTop >= boxes.wheelBottom, "Reduced-motion feed squeezed the wheel into the progress bar");
    assert.ok(boxes.tickerTop >= boxes.progressBottom, "Reduced-motion feed overlaps the progress label");
    check(`${name}: reduced-motion desktop stage fits ten event lines without overlap`);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(base + "?obs=1&demo=1&sound=0#/stage");
    assert.equal(await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await page.locator("#topbar").isVisible(), false);
    assert.equal(await page.locator(".stage-controls").isVisible(), false);
    check(`${name}: OBS query-before-hash URL is transparent and hides website controls`);

    for (const path of ["/", "/setup", "/stage", "/tip", "/about"]) {
      await page.goto(base + "#" + path);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      assert.deepEqual(audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })), [], `axe findings on ${path}`);
    }
    check(`${name}: axe WCAG A/AA audit has no violations on five routes`);
    await page.goto(base);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Skip to content");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.activeElement.id), "view");
    assert.equal(new URL(page.url()).hash, "");
    assert.ok((await page.getByRole("heading", { level: 1 }).innerText()).includes("The hamster runs."));
    await page.goto(base + "#/tip");
    assert.equal(await page.getByRole("button", { name: "Send tip", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page.getByText("No browser wallet found.", { exact: false }).waitFor();
    check(`${name}: keyboard skip link and honest no-wallet disabled/error states`);
    assert.deepEqual(scriptErrors, []);
    assert.deepEqual(localErrors, []);
    check(`${name}: no uncaught script errors or failed local assets`);
    await context.close();
  } finally {
    await browser.close();
  }
}

try {
  await run("chromium", chromium);
  await run("webkit", webkit);
  await writeFile(resolve(out, "results.json"), JSON.stringify(report, null, 2) + "\n");
} finally {
  await new Promise((done) => server.close(done));
}
