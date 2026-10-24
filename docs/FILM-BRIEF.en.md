# Film · nivel-13 · {{film title}}

<!-- A film's beat-sheet script. Write it before opening Remotion. The method is in method/10-motion-design-e-filmes.en.md. The timings here become src/timeline.ts, the single source of timing for picture and sound. -->

## 1. Spec

| Field | Value |
|---|---|
| Kind | {{brand film · social vertical · product loop · case film · brand sting}} |
| Length | {{30 s}} |
| Formats | {{16:9 1920×1080 (master) · 9:16 1080×1920 · 4:5 1080×1350}} <!-- the template renders all of them at the FPS in src/timeline.ts (30 fps) --> |
| Languages | {{pt-BR · en}} |
| Where it plays | {{site, Instagram, presentation, event}} |
| Sound | {{licensed score · score synthesized from the cue list · UI sounds · voice-over}} |
| Loudness | −14 LUFS integrated, −1 dBTP <!-- −16 LUFS for an interface film --> |
| Deadline | {{date}} |

## 2. The idea in one sentence

<!-- If it doesn't fit in one sentence, the film doesn't have an idea yet. -->

{{}}

**After watching, the viewer should:** {{feel / know / do}}

## 3. Grid

- **BPM:** {{120}} → beat = {{0.5 s}} = {{15}} frames at 30 fps; bar = {{2 s}}; sixteenth = {{0.125 s}}.
- Cuts on the beat; bursts on sixteenths; breathing room on the offbeat.
- Every important frame **settles and holds still for ≥ 1.2 s** before the cut.

## 4. Beats

<!-- One line per beat. One idea per frame. On-screen text: about 7 words per card at most; minimum time = 0.5 s + 1 s per 3 words. -->

| # | Time | Beat | Picture | On-screen text | Sound | Motion / transition |
|---|---|---|---|---|---|---|
| 1 | 0.0–3.0 s | Hook | {{}} | {{}} | {{attack at 0.0}} | {{}} |
| 2 | 3.0–8.0 s | Tension | {{}} | {{}} | {{}} | {{}} |
| 3 | 8.0–18.0 s | Idea | {{}} | {{}} | {{}} | {{}} |
| 4 | 18.0–26.0 s | Proof | {{the real product, real data}} | {{}} | {{}} | {{}} |
| 5 | 26.0–30.0 s | Signature | {{brand lockup}} | {{one action}} | {{300–500 ms of silence before the logo; sonic logo}} | {{logo signature}} |

## 5. Material

| Item | Source | Status |
|---|---|---|
| The project's real components and engines | {{`@studio/fx`, `components/vN/…`}} | {{}} |
| Interface captures (Playwright) | {{routes, interactions, 2–3× density}} | {{}} |
| Photography / footage | {{families from DESIGN.md}} | {{}} |
| Score | {{license or synthesis}} | {{}} |
| Fonts | {{does the license cover video?}} | {{}} |

## 6. Rules for this film

- Project facts; nothing invented (numbers, clients, testimonials).
- Deterministic render: no clock, no unseeded randomness.
- Safe zones on verticals: nothing essential in the top ~250 px or the bottom ~340 px (at 1920 tall), nor in the ~120 px right-hand column in the lower half.
- Vertical typography: body ≥ 42 px, titles 96–160 px.
- {{project-specific rule: e.g. the logo only appears in beat 5}}

## 7. QA

- [ ] Contact sheet reviewed (`qa:sheet`; `--n` for more frames).
- [ ] Each cue frame and +6 frames reviewed.
- [ ] Safe-zone overlay on every key frame of the verticals.
- [ ] Automated sweep (what must not exist) reports zero.
- [ ] Loudness and true peak measured (`qa:loudness`); sync within ±1 frame (`qa:sync`).
- [ ] `.vtt` captions, and burned-in for social; English cut with no Portuguese.
- [ ] Export: H.264 High, CRF 16–18, yuv420p, BT.709, AAC 48 kHz, `+faststart`.
- [ ] Poster from the resolved lockup; vertical cover with the essentials centered.
- [ ] Watched at 1×, 0.25×, muted and on a phone.

## 8. Deliverables

- [ ] `{{name}}-16x9.mp4` (master)
- [ ] `{{name}}-9x16.mp4`, `{{name}}-4x5.mp4`
- [ ] Posters and cover
- [ ] `.vtt` captions (pt-BR, en)
- [ ] The Remotion project, to re-render
