# QA · nivel-13 · {{version}} · 2026-10-24

<!-- The definition of done, to tick with EVIDENCE. Every ticked item has a link to a screenshot, number or report in the next column, or a justification. "I think so" doesn't tick. The why of each item is in method/14-qa-e-entrega.en.md. -->

- **Routes verified:** {{/, /case, /produto, …}}
- **Verified by:** {{}}
- **Tools:** Playwright {{version}} · axe · {{real devices}}

## 1. States and interaction

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | Empty, loading, error, success, partial and extreme states on every screen | `qa/states/` |
| [ ] | Everything clickable has a destination and feedback; zero `href="#"`, zero dead buttons | list of clickables |
| [ ] | No placeholder, lorem or "coming soon" | search: `rg -i "lorem\|coming soon\|todo"` |
| [ ] | Press response within 100 ms | |
| [ ] | `Esc` closes layers; focus returns to the trigger | |

## 2. Content

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | Copy proofread by a second person | {{who}} |
| [ ] | pt-BR / en parity; zero words from the other language (by script) | script output |
| [ ] | Illustrative data labeled | |
| [ ] | Numbers via `Intl`; tabular where they change or get compared | close-up crop |
| [ ] | Sentence case; no em dashes in interface copy | search: `rg "—"` |

## 3. Visual

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | Grid overlay: nothing off-column without a logged exception | screenshot with `G` |
| [ ] | No hex, literal `font-family` or off-token curve in components | `rg` output |
| [ ] | Tracking and leading per the `DESIGN.md` yardstick | display crops |
| [ ] | Line masks don't clip accents or descenders | crop with "ÇÃO" |
| [ ] | Close-up crops approved: headlines, numbers, buttons, icons | `qa/crops/` |
| [ ] | 360, 390, 768, 1024, 1440, 1920 without breaking | `qa/responsive/` |

## 4. Motion

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | Every animation passes the purpose test | |
| [ ] | Closing faster than opening; interruptible (two quick clicks) | |
| [ ] | Reduced motion: no displacement; canvas and video on final frame | `reduce` screenshots |
| [ ] | 60 fps on main animations (performance panel) | trace |
| [ ] | Loops paused offscreen; pause control on loops > 5 s | |

## 5. Accessibility

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | axe: 0 violations (wcag2a, wcag2aa, wcag22aa) on all routes | report |
| [ ] | Main flow completed with keyboard only | |
| [ ] | Visible focus (2 px, 3:1), not hidden by a sticky header | screenshot with `Tab` |
| [ ] | Contrast measured, including text over the worst video frame | table in `DESIGN.md` |
| [ ] | Targets ≥ 44 px for touch | |
| [ ] | 200% zoom and reflow at 320 px | |
| [ ] | VoiceOver on the main flow | notes |

## 6. Technical and performance

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | 0 console errors on every route, 1440 and 390 | script output |
| [ ] | 0 px horizontal scroll at 390 and 1440 | script output |
| [ ] | Clean production build; `StudioTools` invisible without `?tools=1` | build log |
| [ ] | LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1 (mid-range phone) | {{values}} |
| [ ] | Initial JS ≤ 170 KB gzip; 3D and player on demand | bundle analysis |
| [ ] | Fonts ≤ 4 files, ≤ 200 KB | |
| [ ] | Canvas: DPR ≤ 2, max 2 live, paused offscreen | |
| [ ] | Metadata: title, description, 1200×630 OG, favicon, `lang`, `hreflang` | |

## 7. Browsers

| ✓ | Browser | Device | Notes |
|---|---|---|---|
| [ ] | Safari iOS | real iPhone | |
| [ ] | Chrome Android | real mid-range device | |
| [ ] | Chrome | macOS / Windows | |
| [ ] | Safari | macOS | |
| [ ] | Firefox | desktop | |
| [ ] | Edge | Windows | |

## 8. Film (if any)

| ✓ | Item | Evidence |
|---|---|---|
| [ ] | −14 LUFS integrated, ≤ −1 dBTP | `ebur128` report |
| [ ] | Sound sync within ±1 frame | sync report |
| [ ] | Safe zones on verticals | contact sheet with overlay |
| [ ] | Captions; English cut with no Portuguese | |
| [ ] | H.264 High, yuv420p, BT.709, `+faststart`; poster from the lockup | `ffprobe` |

## What was NOT verified

<!-- Mandatory. Honesty here prevents the client's surprise later. -->

- {{e.g. Edge on Windows not tested; NVDA not tested}}

## Outcome

- **Ready to deliver?** Yes · No
- **Open items accepted by the client:** {{}}
