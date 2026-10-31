// Dependency-free production export. Deliberately copies only runtime assets.
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const { SITE_URL } = await import(new URL("../src/site.js", import.meta.url));
const html = await readFile(resolve(root, "index.html"), "utf8");
for (const tag of [
  `<link rel="canonical" href="${SITE_URL}"`,
  `<meta property="og:url" content="${SITE_URL}"`,
  `<meta property="og:image" content="${SITE_URL}assets/social.png"`,
]) {
  if (!html.includes(tag)) throw new Error(`Metadata does not match src/site.js: ${tag}`);
}
if ((await readFile(resolve(root, "CNAME"), "utf8")).trim() !== new URL(SITE_URL).hostname) {
  throw new Error("CNAME does not match src/site.js");
}
for (const file of ["assets/app.js", "src/site.js", "src/tips.js", "src/api.js", "src/chain.js", "src/format.js"]) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, file)], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Syntax check failed: ${file}`);
}
await stat(resolve(root, "assets/social.png"));
const output = resolve(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const file of ["index.html", "CNAME", "assets", "src"]) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true, filter: (path) => !path.endsWith(".d.ts") });
}
console.log("Built dist/: relative modules, CSS, fonts, social image and CNAME. No runtime dependencies.");
