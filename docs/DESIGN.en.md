# Design · nivel-13

<!-- Log of system decisions. Every decision has its value and its WHY. Without the why, the decision gets argued again next round. Claude updates this file at the end of each round; you review the diff. Values that aren't here don't exist: if a component needs something new, the decision comes here first. -->

> Current version: {{vN}} · Last updated: 2026-10-24

## 0. Direction

- **Name:** {{direction name}}
- **One-sentence thesis:** {{}}
- **Three motion verbs:** {{e.g. ignites, flows, settles}}
- **Why this one and not the others:** {{what the discarded directions were testing; see DECISIONS.md}}

## 1. Typography

| Role | Face | Weights | Why |
|---|---|---|---|
| Display | {{}} | {{500}} | {{}} |
| Text | {{}} | {{400, 500}} | {{}} |
| Label / data | {{mono}} | {{400}} | {{}} |

- **License:** {{web / app / video, who the licensee is}}
- **pt-BR test:** {{passed "ÇÃO Ã nº 1º “quotes”"? notes}}
- **Scale:** ratio {{1.2}} on mobile → {{1.333}} on desktop; tokens `--step--2 … --step-7`.

### Tracking and leading by size

<!-- Start from the table in method/04-tipografia.en.md §6 and calibrate with the real face. -->

| Size | Tracking | Leading |
|---|---|---|
| ≥ 80 px | {{−0.035em}} | {{0.95}} |
| 56–80 | {{}} | {{}} |
| 40–56 | {{}} | {{}} |
| 24–40 | {{}} | {{}} |
| 17–24 | {{}} | {{}} |
| 13–17 | {{}} | {{}} |
| ≤ 12 | {{}} | {{}} |
| Uppercase mono | {{+0.05em}} | {{1.3}} |

### Numbers (one rule for the whole project)

- Numbers that change, get compared or sit in columns: `tabular-nums lining-nums`, tracking {{}}.
- Single hero number: `proportional-nums lining-nums`, tracking {{}}, weight {{}}.
- Currency at display size: symbol at {{0.42em}}, weight {{500}}, color `--fg-muted`, aligned to cap height; cents at {{0.5em}}.
- Units: {{0.5em}}, separated by a narrow no-break space (U+202F).
- Ranges: {{en dash, no spaces / hyphen}}.

## 2. Color

| Token | OKLCH | Hex (fallback) | Role | Why |
|---|---|---|---|---|
| {{brand-9}} | {{oklch(…)}} | {{#…}} | Accent, CTA | {{}} |
| {{neutral-1}} | | | Background | |
| {{…}} | | | | |

**Semantic mapping:** `--bg` → {{}}, `--fg` → {{}}, `--accent` → {{}}, `--accent-ink` → {{}}, `--focus` → {{}}.

### Measured contrast pairs

| Text / element | Background | WCAG | APCA Lc | Pass? |
|---|---|---|---|---|
| `--fg` | `--bg` | {{}} | {{}} | |
| `--accent-ink` | `--accent` | {{}} | {{}} | |
| White headline | {{worst frame of the hero video}} | {{}} | {{}} | |

### Brand gradient (if any)

- Stops: {{color 1 → color 2 → color 3}}, interpolated in `oklch`.
- Where it lives: {{field / frame / light over photo}}. Where it never lives: {{behind the logo, on buttons, on text}}.
- Motion: {{N s cycle, speed}}. Grain: {{3%}}.

### Dark mode

{{yes/no; surfaces by elevation; what changes in the accent}}

### Logo on backgrounds

{{light ink on dark, dark ink on light; luminance cutoff; minimum 3:1}}

## 3. Spacing and grid

- Base 4; scale `4 8 12 16 24 32 48 64 96 128 160`.
- Grid: {{12}} columns desktop, {{8}} tablet, {{4}} mobile. Gutter `{{clamp(16px, 1.8vw, 24px)}}`. Margin `{{clamp(16px, 3.4vw, 48px)}}`. Max width `{{1440px}}`.
- Space between sections: `{{clamp(64px, 10vw, 160px)}}`.
- Allowed grid breaks: {{e.g. full-bleed media in the case study}}.

## 4. Shape and depth

| Element | Radius | Why |
|---|---|---|
| Button, field | {{6}} | |
| Small card | {{12}} | |
| Media, large card | {{20–28}} | |
| Chip | pill | |

- Shadows: {{layers, tinted from what}}. Border or shadow, not both.
- Glass: {{where it's allowed}}.

## 5. Motion

| Token | Value | Use in this project |
|---|---|---|
| `--ease-out` | {{cubic-bezier(.23, 1, .32, 1)}} | |
| `--ease-in-out` | {{cubic-bezier(.77, 0, .175, 1)}} | |
| `--ease-drawer` | {{cubic-bezier(.32, .72, 0, 1)}} | |
| Default spring | {{duration 0.5, bounce 0.15}} | |
| Durations | {{140 / 180 / 240 / 400 / 800 ms}} | |

- **Brand signature:** {{description and timings}}.
- **Hero order:** {{background → brand → settle → text staggered by N ms → ambient motion}}.
- **Section transitions:** {{color morph / opening corners, radius N px desktop, N px mobile}}.
- **Loops:** {{where loops exist and where things rest}}.
- **Reduced motion:** {{what becomes what}}.

## 6. Iconography and imagery

- Icons: Phosphor, weight {{regular}}, sizes {{16 / 20 / 24}}.
- Photography families: {{1. … 2. … 3. …}}, grade {{}}.
- Allowed aspect ratios: {{3:2, 4:5, 16:9, 1:1}}.
- Video: {{how many, length, max weight}}.

## 7. Interface copy

- Sentence case. No em dashes. {{other punctuation rules}}
- Uppercase mono labels: {{where yes, where no}}.

## 8. Exceptions

<!-- Every time something breaks a rule above on purpose, log it here. An unlogged exception is a bug. -->

| Where | Rule broken | Why | Date |
|---|---|---|---|
| {{}} | {{}} | {{}} | {{}} |

## 9. History

| Version | Date | What changed in the system |
|---|---|---|
| v1 | 2026-10-24 | Initial system |
