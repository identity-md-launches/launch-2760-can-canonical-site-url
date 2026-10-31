# SqueekStage

A live OBS overlay for Squeekchain, with SQK tipping on Sepolia.

## Custom domain and IMD's Site URL

The website's canonical URL is **https://squeekstage.online/**. This revision adds `rel="canonical"`, `og:url`, a local social image advertised at the custom domain, and custom-domain overlay/tip links. The existing `CNAME` already contained `squeekstage.online`.

**This is a website change, not an update to IMD's job record.** Genesis Code's Site URL value, as described in the request, comes from IMD. HTML metadata, `CNAME`, and a working custom domain cannot write that field. This repository has no IMD management client or supported API for editing it, and no such management tool is exposed to this worker. The IMD record was not changed or verified. No new job was created, no domain configuration was changed, and nothing was published by the worker.

Ask the IMD operator to edit the Site URL on the **existing** project/job and confirm the value Genesis Code receives. A copyable request is in [artifacts/canonical-url-request.md](docs/canonical-url-request.md). It has not been sent. Whether IMD exposes that edit, and whether it is free, cannot be established from this website repository. Creating another paid job is not part of this implementation.

The site's own address is defined in `src/site.js`. The build checks that the canonical tag, Open Graph URL/image and `CNAME` agree with it. Share URLs use that address even when setup is opened from the old IMD host, an IPFS subpath or localhost. Internal navigation stays on the current host and uses hash routes; the page does not force a redirect. Asset/module/font paths are relative.

## Install, build and preview

Use Node.js 22 or later. The existing plain JavaScript/ES-module stack is retained. The new, isolated build tools and exact lockfile live in `web/`; no existing hosting configuration was changed. There are no third-party JavaScript runtime dependencies. Fonts and the social image are included locally.

```bash
npm ci --prefix web
npm run --prefix web typecheck
npm run --prefix web build
npm run --prefix web test
npm run --prefix web preview
```

Open **http://localhost:8080/preview/**. The preview serves the actual `dist/` export at a subpath. Use HTTP rather than opening `index.html` as a file. A different port can be passed with `node scripts/preview.mjs 8081`.

`build` checks JavaScript syntax and metadata consistency, then recreates `dist/` from an allowlist of runtime files. This is a native-module static build; it does not need a bundler or a server at runtime. The finished export, source, `web/package.json`, and `web/package-lock.json` are delivery files. Publish **the contents of `dist/`** through the normal site publisher. `node_modules`, browser downloads, caches and verification scratch output are not delivery files.

## Use it

- **Home:** live distance, blocks, work and settlement time, with a direct action to open the overlay.
- **Setup (`#/setup`):** enter the recipient wallet when you have one, choose an overlay colour and alert threshold, save, and copy the OBS or chat link. An empty recipient is allowed for a read-only overlay. Settings are stored in this browser's localStorage; shared links carry the selected settings.
- **Overlay (`#/stage`):** inspect the wheel, block progress and event feed, copy its OBS URL or trigger a clearly labelled demo alert.
- **Tips (`#/tip`):** choose a recipient and amount. Sending requires the existing browser-wallet connection, the live token address, a Sepolia balance and a wallet signature. It sends an ERC-20 transfer, without approvals or custody.

For OBS, open setup, save the settings, then use **Copy for OBS**. Add an OBS Browser source at **1920 × 1080** and paste the URL. Transparent mode is selected with `?obs=1` before `#/stage`, for example `https://squeekstage.online/?obs=1#/stage`. Website chrome is hidden in that mode. Demo feed is explicitly synthetic; live chain statistics still come from the public API. Disable sound in setup for a silent overlay.

The public API and RPC endpoints remain those of the existing app. Source reads use `https://api.squeekchain.com/v1/`: `status`, `core`, `economy/state`, `events`, and `measurement/stats`. SQK transfers are read from Sepolia ERC-20 logs using the token address reported by the API. Missing data is not replaced with fabricated live values. Tipping needs Sepolia test assets and gas; no transaction was submitted during validation.

Browser settings and wallet permissions are origin-specific. Switching from the old IMD host to the custom domain does not migrate localStorage or wallet permissions. Copying a configured overlay link carries its settings across hosts. Do not use the production-domain copied URLs to test an unpublished local change; navigate the local hash routes instead.

## Validation

Worker checks on 2026-10-31:

| Check | Actual result |
| --- | --- |
| `npm run --prefix web typecheck` | Passed, all runtime JavaScript checked with TypeScript `checkJs` and `noEmit` |
| `npm run --prefix web build` | Passed, complete `dist/` with relative runtime URLs |
| `npm run --prefix web test` | 4 tests passed: host-independent canonical links, setting/encoding preservation, tip-link isolation, export metadata/social image |
| `npm run --prefix web validate` | Chromium interaction checks passed at 320, 390, 768 and 1440; five routes; zero axe A/AA violations, uncaught script errors or failed local resources |
| Pinned `taste.mjs` | 16/16 checks passed after corrections at 320, 390 and 1440 |
| WebKit | Browser downloaded, but launch failed because required native libraries are unavailable; Safari behavior is unverified |

Browser checks exercise save/reload/reset, invalid fields, custom-domain OBS/chat copying, clipboard rejection, delayed API completion during form editing, demo alerts, reduced motion, transparent OBS mode, keyboard skipping and no-wallet states. Clipboard is mocked in the automated run; API requests are deliberately failed except for one delayed empty-response test. The separate browser-tool inspection and online design probe load real public API data. No wallet or transaction result is fabricated.

For repeatable browser checks after installation:

```bash
web/node_modules/.bin/playwright install chromium webkit
npm run --prefix web validate
```

The validation script manages and closes its own local HTTP server and browsers. Scratch reports go in `test/scratch/interactions/`. During this assignment the pinned probe was also run with `IMD_PLAYWRIGHT` pointing to `web/node_modules/playwright/index.mjs`, and temporary browser binaries outside the repository:

```bash
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

Pinned inputs are removed from the delivered project; the probe command needs the supplied input to be present. The recorded [design review and validation](VALIDATION.md), [probe result](docs/validation/taste.json), [interaction result](docs/validation/interactions.json) and selected [screenshots](docs/validation/screenshots/) remain available. [DESIGN.md](DESIGN.md) documents the final implementation.

Limits: the probe does not measure contrast over gradients, arbitrary OBS video or user-selected overlay colours. A screen reader, physical phone, native 200% browser zoom, real-wallet signing, OS clipboard permission behavior and a working WebKit runtime were not tested. IMD's Site URL and Genesis Code integration remain an external platform change.

## Source map

| Path | Purpose |
| --- | --- |
| `index.html`, `assets/app.js`, `assets/app.css` | Shell, hash routes, views, UI and overlay |
| `src/site.js` | Preferred public site URL |
| `src/tips.js` | Settings, share links, tip feed and demo feed |
| `src/api.js`, `src/chain.js`, `src/format.js` | API reads, existing wallet/ERC-20 logic, numeric formatting |
| `assets/fonts/`, `assets/social.png`, `assets/hamster.svg` | Local runtime assets and font licenses |
| `scripts/`, `test/site.test.mjs`, `jsconfig.json`, `web/` | Build, preview, validation and locked development tooling |
| `dist/` | Complete static export for the publisher |
| `worker.js`, `wrangler.jsonc` | Existing optional Cloudflare integration, retained unchanged |

## License and guidance attribution

Project code: MIT, see `LICENSE`. Bundled fonts use the SIL Open Font License; individual notices are in `assets/fonts/`. Design review used the pinned Better Interface guide by Jakub Krehel (MIT) and its adapted documentation guidance from Paul Bakaus's Impeccable (Apache-2.0). Source commits, notices and included licenses are recorded in [docs/design-guidance-NOTICE.md](docs/design-guidance-NOTICE.md) and [docs/design-guidance-LICENSE.txt](docs/design-guidance-LICENSE.txt).
