# SqueekStage validation and design review

Reviewed 2026-10-31. This is the worker's recorded evidence, not an independent certification.

## Scope and outcome

The existing JavaScript site, OBS overlay, Sepolia tipping page and settings are retained. The website now declares `https://squeekstage.online/` as its canonical/Open Graph address and uses it for generated share links. `dist/` is a complete static export with relative runtime assets and local fonts. Internal hash navigation continues to work under a gateway subpath.

**The IMD Site URL record consumed by Genesis Code remains unchanged and unverified.** No platform-management API/tool is available in this assignment, and this repository only contains the website. No DNS, TLS, redirects, platform billing, chain deployment or publication was changed. `docs/canonical-url-request.md` is an unsent request to edit the existing project rather than create another paid job; a free platform edit cannot be promised without IMD's confirmation. No requester-only address/key/id was invented.

The visual idea is the existing gold wheel on a dark broadcast bench, with compact live statistics and immediately reachable overlay controls. Ordinary design choices were inferred from the existing CSS; no separate redesign or wallet migration was commissioned.

## Acceptance coverage

| Requirement | Outcome and evidence |
| --- | --- |
| Usable website, primary interactions, responsive layouts | Checked in Chromium on all five routes at 320, 390, 768 and 1440 CSS px |
| `dist/index.html`, assets, source and lockfile | Included; native-module build and `web/package-lock.json`; no pre-existing configuration/dependency file edited |
| Production build, typecheck, useful validation | Passed; commands and limits below |
| Better Interface's six domains | Reviewed and applicable findings corrected; coverage below |
| Product and primary action on first 390px screen | Yes: live stat cells and Open the overlay are visible; action top 314.97px, bottom 358.97px, height 44px in a 390 × 844 viewport |
| Title, favicon, description, `og:title`, `og:image` | Present in source and export; image is a real local 1200 × 630 PNG advertised at the custom domain |
| Root `DESIGN.md` | Implemented tokens, fonts, components and responsive behavior documented |
| README install, preview, rebuild | Present, with actual test results and the IMD/platform boundary |
| Change the IMD record itself | External operation not performed; website metadata is not represented as a registry update |

## Better Interface coverage

The pinned workflow, all six core-principle sections and document-web-design section were read. The existing palette and stack were retained. No absent feature was added merely to satisfy a design checklist.

| Domain | Status | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native controls/labels; one h1 per route; keyboard skip does not change the route; invalid settings announce inline and focus the field; minimum 44px main controls; axe WCAG A/AA scans on five routes report zero violations. Screen readers, native zoom, physical phones and a complete keyboard walkthrough of wallet signing were not tested. |
| Layout | Checked | Rendered all routes at 320/390/768/1440, no horizontal overflow. Inspected mobile/desktop screenshots and full setup URL wrapping. Header reflows and stage controls precede the canvas. RTL and native 200% zoom unverified; no localization requirement. |
| Writing | Checked | Plain action labels, short product sentence, six-word home heading, labelled demo alerts, recoverable clipboard/field errors. Copy distinguishes the website address from IMD's record; no invented shared/live state. |
| Typography | Checked | Six source size tokens, five sizes on each home viewport in the probe, three families, two measured weights. Local fonts verified loaded with `document.fonts.check`; inputs are 16px; URLs wrap without clipping. Other scripts/locales and user font overrides unverified. |
| Colors | Checked, partial rendered contrast | Existing hex palette retained; captions brightened; distinct control outline token; focus ring measured against bench. Solid-pair calculations below; probe and axe found no measured failures. Probe skips 30 boxes with image/gradient ancestry; arbitrary overlay colours, translucent layers and OBS footage are not fully measured. A light theme is not implemented or required. |
| UI | Checked | Source/button states, error recovery, disabled send state, native form controls, persistent dismissible errors, labelled alerts and reduced motion exercised. Removed repeated border-plus-shadow decoration. Native OS dialogs, fullscreen activation, animation replay at 10% speed, real wallet pending/confirmation and clipboard permissions unverified. |

The wallet guide and reference were read for context. This canonical-domain follow-up retains the existing EIP-1193 connector and contract/RPC logic; it does not add a new wallet integration. EIP-6963 discovery, mobile open-in flows and Coinbase Smart Wallet are not implemented by this revision. `src/chain.js` is unchanged, and no transaction was sent.

## Findings and corrections

References point to the final source that contains each fix. The earlier source was reviewed; no unrecorded baseline screenshot or measured baseline contrast is claimed.

| Severity / domain | Finding and correction | Final source | Recheck |
| --- | --- | --- | --- |
| High / requirement | Canonical URL metadata was missing; shared URLs inherited whichever host opened setup. Added the public URL constant, canonical/OG metadata and host-independent share construction. | `src/site.js:2`, `src/tips.js:61`, `src/tips.js:75`, `index.html:8` | Four Node tests and browser-generated/copied URLs match the custom domain, with flags and hash intact. IMD boundary remains explicit. |
| High / accessibility | Skip's `#view` fragment entered the hash router as an unknown route. Prevented that navigation and focus main directly. | `assets/app.js:13` | Tab/Enter focuses main, preserves the URL and keeps the home heading. |
| Medium / writing, UI | Copy handlers swallowed failures and still claimed success. One awaited helper now reports success only after write completion and provides manual-copy recovery on rejection. Error/action toasts remain dismissible. | `assets/app.js:59`, `assets/app.js:779` | Automated clipboard-success and rejection branches passed. The OS clipboard permission model remains untested. |
| Medium / accessibility | Invalid wallet input only raised a temporary toast; threshold accepted negative values. Added inline error text, invalid state, a description and focus on the offending field. | `assets/app.js:747` | Both invalid cases, correction, save, reload and reset passed. |
| Medium / UI | Initial snapshot completion re-rendered setup, risking loss of unsaved edits. Limited this token-dependent re-render to the tip route. | `assets/app.js:843` | Controlled delayed empty API responses complete while unsaved input remains present. |
| Medium / layout | Source used a 300px minimum column inside a 320px viewport's narrower content area. Shared grid minimums and child shrink behavior now permit reflow; mobile header becomes two rows. Full share URLs wrap. | `assets/app.css:233`, `assets/app.css:254`, `assets/app.css:310` | All five routes have zero horizontal overflow at four widths. Full setup screenshot inspected. |
| Medium / typography, colors | Scattered sizes, small/tracked caps and dim captions weakened hierarchy/readability. Consolidated six size tokens, natural-case labels, 16px inputs, brighter secondary text and a 3.07:1 control boundary. | `assets/app.css:2`, `assets/app.css:52`, `assets/app.css:303` | Probe reports five sizes per home viewport, all measured contrast passing; fonts loaded locally. |
| Medium / layout | Mobile overlay actions followed a tall preview. Moved copy/test controls before the stage, keeping the primary copy action immediately reachable. | `assets/app.js:284` | Mobile stage screenshot and interaction check inspected; OBS mode still hides controls. |
| Medium / share | No `og:image` or bundled share card. Added a 1200 × 630 image and complete metadata; bundled existing font families for static/offline rendering. | `index.html:13`, `assets/fonts.css:1`, `assets/social.png` | PNG signature/dimensions checked, local fonts loaded, share probe passed. |
| Low / UI, writing | Card shadows plus borders and eyebrow text competed with the content. Flattened cards and removed the eyebrow. Probe initially treated the boxed Overlay navigation link as a kicker; navigation is now borderless with an active underline. | `assets/app.css:82`, `assets/app.css:139`, `assets/app.js:207` | Final probe: zero border/shadow pairs, nested cards or eyebrow labels; 16/16 checks passed. |
| Medium / writing | Home failures lacked a recovery instruction and stage initially claimed live before reads completed. Added loading/offline language and a reload instruction. | `assets/app.js:238`, `assets/app.js:261`, `assets/app.js:284` | Offline home recovery checked; real online API responses observed separately. |
| High / layout | At 1440px with reduced motion and a real ten-event feed, the fixed-ratio stage squeezed the wheel into the progress bar. Let the website stage grow to fit the static feed; OBS keeps its broadcast canvas. | `assets/app.css:293` | Regression check inserts ten labelled layout-test events and verifies wheel/progress/ticker ordering without overlap; final live-data view re-inspected. |

## Commands and actual results

All commands ran from the repository root. Build, typecheck and Node tests completed with exit 0 after the final runtime source change:

```bash
npm run --prefix web typecheck
npm run --prefix web build
npm run --prefix web test
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeekstage-browsers npm run --prefix web validate
IMD_PLAYWRIGHT="$PWD/web/node_modules/playwright/index.mjs" PLAYWRIGHT_BROWSERS_PATH=/tmp/squeekstage-browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

- Typecheck: TypeScript 5.9.3, `checkJs`/`noEmit` across all runtime JavaScript; passed.
- Production build: syntax, canonical/OG/CNAME consistency and required image checks; recreated complete `dist/`; passed.
- Node tests: 4 passed, 0 failed. Includes old host, unrelated gateway and localhost inputs; query escaping and hash placement; no host-dependent recipient/setting loss; source/export metadata and PNG dimensions.
- Interaction run: Chromium 141.0.7390.37; 12 grouped checks passed. All five routes at 320, 390, 768 and 1440, then settings validation/persistence/copy/reset, delayed API completion, demo alerts, reduced motion, transparent OBS mode, axe scans, skip navigation and no-wallet behavior. Zero uncaught script errors or failed local assets.
- WebKit: downloaded and attempted; launch failed for missing native libraries. Marked unavailable in `docs/validation/interactions.json`; not counted as a successful test. The runner exits 0 after its Chromium checks and explicitly records this limitation.
- Pinned taste@1: final exit 0, all 16 checks passed at 320/390/1440. Five sizes per home viewport; three families; all 9 measured controls meet 44px; 14 prose words on the first 390px screen. The failed initial eyebrow candidate was rechecked after correction.
- Browser tool: inspected production at `http://127.0.0.1:8080/preview/` at 390 × 844 and 1440 × 900, including home, overlay and a full desktop reduced-motion feed screenshot. Local modules/styles/fonts and real public API calls returned HTTP 200. Home console inspection returned zero errors/warnings. Barlow Condensed, Quicksand and IBM Plex Mono were verified loaded. This local URL is a temporary preview, not a deployed site.

Automation deliberately aborts external reads to exercise unavailable-data states, except one delayed empty-JSON API test. It inserts ten labelled test event lines for the reduced-motion layout check and mocks clipboard writes to cover success and rejection consistently; it does not mock wallets or send/sign transactions. The online probe and separate browser inspection load actual public API data.

Solid-pair contrast was separately computed from declared RGB values: ink/page 17.59:1; dim/card 8.33:1; gray/card 6.81:1; primary dark text/gold 11.27:1; focus/bench 15.49:1; control border/bench 3.07:1. These calculations do not certify gradient, opacity, chosen overlay accent or video backgrounds.

## Evidence retained

- `docs/validation/taste.json`: exact final probe report; 16 passed checks.
- `docs/validation/interactions.json`: exact final browser interaction report, including the unavailable WebKit entry.
- `docs/validation/screenshots/home-390.png`, `docs/validation/screenshots/home-1440.png`: online probe viewport images (390 image uses device scale 2).
- `docs/validation/screenshots/setup-390.png`: full setup with complete wrapping custom-domain links.
- `docs/validation/screenshots/overlay-390.png`: reduced-motion overlay with a labelled synthetic test alert; external API deliberately unavailable.
- `docs/validation/screenshots/overlay-1440-reduced.png`: final live-data reduced-motion stage; wheel, progress and ten events do not overlap.
- `DESIGN.md`: implemented design tokens, responsive behavior and components.

The screenshots were opened and visually inspected. Scratch files are not required for delivery. No dependency tree, browser binary, package-manager cache, vendor registry or submodule is included. No ignore file, existing deployment configuration, existing dependency file, `.git`, `.github` or `.env` was edited.

## Completion and remaining limits

**Website deliverable complete for the repository scope. The requested IMD registry edit is incomplete:** it requires a platform capability not exposed here; no free-edit/billing claim is made. Publication of the export occurs outside this worker.

Unperformed checks: working WebKit/Safari, physical devices, a screen reader, browser-native 200% zoom, RTL, fullscreen activation, complete forced-colors behavior, native clipboard permissions, real wallet/network switching/signing/receipts, arbitrary user-selected accents and contrast over live OBS footage. Automated accessibility success is not a claim of full WCAG compliance. There are no unresolved observed blocking website defects in the checked scope.
