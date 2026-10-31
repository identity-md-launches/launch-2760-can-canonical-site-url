# SqueekStage design system

## Overview

SqueekStage is a stream companion for people broadcasting Squeekchain and viewers sending SQK tips on Sepolia. This revision retains the existing dark bench, gold wheel and condensed headings. The home page pairs the six-word headline with one plain product sentence, immediate actions and four live data cells. Setup, tips and overlay pages use task headings instead of marketing copy.

Implementation sources are `assets/app.css`, `assets/app.js`, `index.html`, `assets/fonts.css` and `src/site.js`. The product identity and existing application structure are retained; canonical domain information is visible in setup. The website's own canonical address is not presented as an editable IMD setting.

## Colors

Values are CSS custom properties in `assets/app.css:2`. Keep their hex notation and reuse their roles.

| Token | Value | Implemented role |
| --- | --- | --- |
| `--bg` | `#0b0b0d` | Page and input background |
| `--raised` | `#0f0f12` | Cards and stat cells |
| `--bench` | `#1a1a20` | Secondary controls and hover surfaces |
| `--line` | `#26262f` | Structural outlines |
| `--line-soft` | `#1d1d24` | Quiet dividers and card borders |
| `--control-line` | `#666676` | Visible input, secondary-button and chip outlines |
| `--ink` | `#f2f2f4` | Primary text |
| `--dim` | `#aaaab7` | Secondary copy and labels |
| `--gray` | `#9999a8` | Captions and less prominent data labels |
| `--gold`, `--accent` | `#f2c230` | Primary action, progress and brand emphasis |
| `--blue` | `#5b7cfa` | Progress ramp endpoint and brand dot in share art |
| `--green` | `#35d07f` | Live/success cues, with text |
| `--red` | `#c33346` | Error/offline border or indicator, with text |
| `--focus` | `#f2f2f4` | Keyboard focus outline |

Inline validation uses `#fca5af`. The dark page has a subtle 22px radial-dot grid. Stage backgrounds have restrained blue and gold radial highlights. `applyAccent()` sets `--overlay-accent`; `.stage` consumes it locally. A selected overlay colour does not change ordinary form/button contrast. OBS transparent mode cannot establish contrast against the broadcaster's footage.

Computed solid-token contrast: ink/page 17.59:1; dim/card 8.33:1; gray/card 6.81:1; `#111111`/gold primary button 11.27:1; focus/bench 15.49:1; control outline/bench 3.07:1. These are calculations from the exact declared pairs, not blanket claims about translucent or video backgrounds. Rendered audit coverage and unmeasured pairs are recorded in `VALIDATION.md`.

## Typography

Fonts are local WOFF2 files declared in `assets/fonts.css`. Barlow Condensed 600 is the display family; Quicksand 500–600 is the interface/body family; IBM Plex Mono 400/500 is reserved for data, addresses and URLs. Their files and OFL notices live in `assets/fonts/`. Fallbacks remain Arial Narrow/sans-serif, system UI and platform monospace respectively. Body weight is 500; headings and prominent controls use 600.

| Token | Size | Use |
| --- | --- | --- |
| `--text-small` | 14px | Labels, buttons, captions and metadata |
| `--text-body` | 16px | Body copy and inputs at every width |
| `--text-section` | 20px | Card headings, brand and alert amounts |
| `--text-value` | 28px | Stat cells and smaller stage numbers |
| `--text-title` | 44px | Task headings and home headline at 820px or narrower |
| `--text-display` | 64px | Desktop home headline and main wheel distance |

Body line-height is 1.55; headings use 1.15; the home headline uses 1.05 and -0.02em tracking. Body and control tracking is natural. Headings balance their wrapping; short descriptive copy uses `text-wrap: pretty`, with a 62ch maximum measure. Updating numbers use tabular numerals. Full shared URLs wrap with `overflow-wrap: anywhere` and stay selectable. No addresses or URLs are clipped with ellipses in setup.

## Layout

`#view` is at most 1180px wide with automatic inline margins, 16–40px horizontal padding and 18–44px top padding. Shared gaps principally use 6, 8, 10, 12, 14, 18, 20 and 26px; the hero gap grows from 22 to 54px. A card has 18px padding. Related field parts have 6px gaps; fields are separated by 14px.

The desktop home uses two columns in a 1.15:0.85 ratio. Its stat grid stays in two columns. At 820px the home and wheel stack, the home headline becomes 44px, and the website's stage becomes content-height instead of maintaining a desktop aspect ratio. Shared `.grid2` columns use `minmax(min(100%, 300px), 1fr)` so narrow screens can reflow without overflow. Child `min-width: 0` permits long content to wrap.

Above 620px, the header is a sticky flex row: brand, navigation, wallet control. At 620px and below it becomes a non-sticky two-row grid, with brand and Connect on the first row and the four section links on the second. Overlay controls precede the stage so copying and testing are immediately reachable. Long query URLs wrap within setup cards. Viewports of 320, 390, 768 and 1440 CSS pixels were exercised in Chromium; native zoom and RTL layout were not tested.

The standard stage has a 16:9 desktop shell. For OBS, the query flag `obs=1` selects a transparent, viewport-filling stage and removes the header, footer, page heading, controls and status paragraph. This is an intentional broadcast canvas, not a conventional scrolling content page.

## Elevation & Depth

The interface is predominantly flat: tonal surfaces and one-pixel structural borders, without stacked card shadows. Stage highlights provide atmosphere without gradient text. The desktop header uses a translucent near-black fill and background blur. Toasts sit at z-index 80, above the header's 40; a focused skip link uses 99. Tip alerts are positioned within the stage and do not accept pointer events.

## Shapes

`--r: 14px` sets card corners; stat cells and stage data groups use 12px; buttons, inputs, code blocks and notices use 10px; navigation and dismissal buttons use 8px. The stage shell uses 18px, and stream status pills and progress bars are fully rounded. Rings, wheel geometry and LEDs are circular. Do not put rounded containers around the brand or every navigation item.

## Components

| Pattern | Source | Behavior and states |
| --- | --- | --- |
| Header/navigation | `index.html`, `.topbar`, `.nav` | Brand goes home; hash links work on a static host; `aria-current` and underline identify the active section; hover has a tonal fill |
| Buttons | `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.btn-block` | Minimum 44px height; filled gold denotes the main action; hover and pressed feedback; native disabled state for unavailable wallet actions |
| Focus/skip | `:focus-visible`, `.skip`, `assets/app.js` | White 2px outline with 4px offset; input offset is 1px; forced-colors uses Highlight; skip moves focus to main without changing the hash route |
| Card/stat | `.card`, `.stat`, `statCard()` | Flat raised surfaces; descriptive labels and tabular values; missing data uses a neutral dash |
| Fields | `.field`, `.row`, `setupView()` | Visible labels; 16px inputs; save validates wallet/threshold, announces inline errors and focuses the failing field |
| Share URL | `.code`, `setupView()`, `src/tips.js` | Full selectable custom-domain URL; copy success appears only after clipboard completion; failure provides manual-copy recovery |
| Notices/toasts | `.notice`, `.toast`, `toast()`, `toastTransaction()` | Text identifies state as well as colour; routine success expires; errors and transaction links remain until Dismiss |
| Overlay | `stageView()`, `.stage`, `.wheel`, `.progress` | Real API statistics, loading/live/stale/offline labels; synthetic alert previews visibly marked demo; missing data does not become a fabricated live count |

The Connect button retains the project's existing EIP-1193 wallet flow. This domain revision does not replace that connector. No new wallet sheet, relay, account, key or contract is introduced.

Interactive transitions name their properties; there is no `transition: all`. The existing progress and alert animations remain. Under `prefers-reduced-motion: reduce`, animations and transitions stop, and the moving event ticker becomes static wrapped content. The website preview grows to fit that content even on desktop, so the expanded feed cannot squeeze the wheel into the progress bar. The OBS canvas keeps its broadcast dimensions.

## Do's and Don'ts

- Start another page with the existing main container, a task-naming `h1.page-title` and `.grid2`/`.card` primitives. Add the hash route to the existing router and reuse native links/buttons.
- Reuse the six type tokens, three local font families and semantic colour roles. Keep prose in Quicksand and changing data tabular.
- Keep the main action above long content. Use a single filled primary action and neutral peer controls.
- Preserve complete URLs and critical data. Add descriptive labels and inline recovery when an action can fail.
- Keep production share links based on `SITE_URL`, with query parameters before the route hash. Update the source metadata and build checks together when the public address changes.
- Keep external platform operations out of apparent local settings: a displayed site address does not mean IMD's registry was edited.

Guidance attribution and licenses are in `docs/design-guidance-NOTICE.md` and `docs/design-guidance-LICENSE.txt`.
