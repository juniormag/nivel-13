# Visual + Game-Feel Research: modern night pixel art, blood-red palette, "13" monument over Rio

Target stack: Vite + React (HUD/DOM) + PixiJS (2D pixel layers) + Three (3D-ish monument rendered to low-res target). Mobile + desktop.

Source note: the research sandbox could not open most artist blogs directly (Slynyrd, Studio Miniboss and itch.io were blocked by egress). Facts below come from web-search summaries of those pages and are linked. Numbers marked **[src]** come from a cited source. Numbers marked **[house]** are our own starting defaults, based on common practice, and need tuning in playtests.

---

## 1. Rules we will follow (36)

### Resolution and pixel grid
1. **One virtual resolution, integer upscale only.** Desktop logical canvas 480x270 (16:9). Mobile portrait 270x480. Scale by the largest whole number that fits (x2, x3, x4) and letterbox the rest with `--bg-void`. Never use fractional scale on pixel layers. [house; integer-scale method: [cinevva](https://app.cinevva.com/tutorials/pixel-art-rendering), [MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)]
2. **Nearest-neighbour everywhere.** Use `image-rendering: pixelated` on the canvas, `scaleMode: 'nearest'` on every Pixi texture including text (Pixi 8.10+ `textureStyle`), and `imageSmoothingEnabled=false` on any 2D context, set again after every resize. Scale the canvas with width/height, not a CSS `transform`, because WebKit blurs transformed canvases. [src: [MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look), [PixiJS 8.10](https://pixijs.com/blog/8.10.0), [WebKit bug 185683](https://bugs.webkit.org/show_bug.cgi?id=185683)]
3. **Snap positions to whole virtual pixels at render time.** Keep float positions in game logic. Shake offsets are integers too. The only things allowed off the grid are full-res UI text and the post-bloom pass. [src: sub-pixel blur, [cinevva](https://app.cinevva.com/tutorials/pixel-art-rendering)]
4. **No mixels.** Every pixel-art layer is drawn at the same pixel size. Do not rotate or scale pixel sprites at runtime. If something needs a rotated look, redraw it or pre-bake rotated frames and clean them up by hand (Owlboy only allowed rotation as a "cheat", and UFO 50 bans sprite scaling). The exception is tween-based squash/stretch on small FX and UI (see rule 24). [src: [Owlboy, Andersen](https://en.wikipedia.org/wiki/Owlboy), [UFO 50](https://en.wikipedia.org/wiki/UFO_50)]

### Palette and colour
5. **One master palette of 32 colours (section 2). No off-palette pixels in pixel layers.** CI gate: a script counts unique colours per exported PNG and fails on any colour outside the palette. UFO 50 runs 50 games from a single shared 32-colour palette. [src: [UFO 50](https://en.wikipedia.org/wiki/UFO_50)]
6. **Each sprite uses at most 12 colours, and never more than 16.** A whole screen of pixel layers uses at most 32. [src: >16 per sprite is too many, [MIT GDG style guide](https://gdg.mit.edu/style-guide); 8–32 per scene, [wayline](https://www.wayline.io/learn/color-palettes/1)]
7. **Every ramp is hue-shifted. Shadows move toward purple/magenta, highlights toward orange/yellow.** Use about 15–20° of hue per step (Slynyrd uses 20° per swatch across 9-swatch ramps). Saturation peaks in the mid-tones and darks stay saturated. Never shade by mixing in grey or black. [src: [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes), [pixnote shading](https://pixnote.net/en/learn/shading)]
8. **Red has a budget.** The reference is red-dominant, so red (#e3242b family) covers at most about 25% of screen pixels. Near-black covers at least 45%. Gold covers at most 3% and is used only on the crown, sparkles, city lights and active UI. Green covers at most 4% (vines, flag). Hyper Light Drifter keeps one red accent repeated across a scene to tie it together. [house; accent repetition: [AV Club on HLD](https://avclub.com/hyper-light-drifter-blended-past-and-present-to-become-1798255620)]
9. **Value carries readability, not hue.** Test: desaturate the frame and check that the player, the monument "13", any interactive object and the HUD still separate from the background. Far layers use only the bottom 30% of value. The full-value range (white stone, white sparkle, gold) is reserved for focal objects. [src: [bugnet readability](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly), quieter backgrounds]
10. **Atmospheric perspective toward purple-red haze.** Each parallax layer further back loses 1 value step and moves 1 ramp step toward `--haze` (#3a2a4a) or `--crimson-deep`. Only the nearest 2 layers may use pure black outlines. [house]

### Light
11. **Light sources are fixed and stated per scene.** For the hero scene there are 3. Key: the red energy rings, light from around the monument, warm red. Fill: the eclipse corona, high and behind, which gives a red rim. Practicals: city lights and the lit Christ the Redeemer, small warm gold points. Every sprite is shaded for those three, consistently. [src: set the light first, [Slynyrd Pixelblog 6](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow)]
12. **Rim light is the main separator against near-black.** Characters and the monument get a 1-px rim in `--red-hot` (#ff4a3d) on the edge facing the rings. Edges facing the moon get a 1-px `--ember-bright` or `--stone-hi` rim. Rim light exists to separate subject from background, not to be physically accurate. [src: rim-light purpose, [Wikipedia photographic lighting](https://en.wikipedia.org/wiki/Photographic_lighting)]
13. **Shade steps depend on sprite size.** 16 px sprites: base + 1 shadow (+ rim). 32 px: base + 2 shadows + 1 highlight (+ rim). 64 px or larger, including the monument: 4–5 steps. No pillow shading, meaning darkness must not follow the outline inward evenly from every edge. [src: [pixnote shading](https://pixnote.net/en/learn/shading)]
14. **Selective outlining ("sel-out").** Outlines take the darkest ramp colour of the region they border. They go lighter on the lit side, darkest (`--night` or `--blood-0`) on the shadow side, and drop to the rim colour or vanish on the side facing the rings. Use pure-black outlines only on UI and pickups. [src: [Lospec outlines pt 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color), [itch selective outlines](https://itch.io/t/2422252/pixel-tutorial-selective-outlines)]
15. **Glow is built in 3 layers.** (a) A hand-pixelled core: 1–3 px of `--white` or `--sparkle`, then 1 px of `--gold-hi` or `--red-hot`. (b) A pixel halo: 1 ring of the ramp colour 1 step darker, dithered at 50% checkerboard 1 px further out. (c) An optional additive bloom pass, rendered at virtual resolution so bloom stays blocky. Threshold about 0.75 luminance, 2 blur passes, intensity 0.6–0.8. Order of rules: keep the core small and bright, keep larger shapes dimmer, and shrink the brightest area before enlarging the outer glow. Each tier is much dimmer than the one inside it. [src: structure, [pixel-editor glow guide](https://www.pixel-editor.com/articles/pixel-art-lighting-effects), [gamedeveloper 2D glow](https://www.gamedeveloper.com/design/how-to-create-2d-glow-effects-in-unity); numbers: house]
16. **Additive blending is for light only.** Use it for energy rings, sparkles, ember particles and corona flicker. Never use it on solid surfaces. Additive-on-red clips to orange then white fast, so cap additive sprites at 70% alpha. [house]
17. **Dither on purpose, not everywhere.** Allowed: the sky gradient (stagger the transition rows so bands do not stack on one diagonal), glow halos, cloud edges and the corona falloff. Banned: outlines, characters under 32 px, UI, and large flat areas. Avoid pairs of very different brightness, because they shimmer. Check at 1x and at the real display scale. [src: [divoom dithering](https://divoom.com/blogs/setup-ideas/pixel-art-dithering-when-to-use-and-stop), [pixnote dithering](https://pixnote.net/en/learn/dithering)]
18. **Anti-aliasing only by hand, only on large curves, 1 intermediate colour.** This applies to the moon limb, the monument curves and Sugarloaf's silhouette. Never AA against the near-black sky on small sprites (it creates halos and mush). Too much AA reads fuzzy and causes banding. [src: [Pixel Parmesan AA](https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists), [TU Delft banding paper](https://repository.tudelft.nl/file/File_65d43acd-9779-4eab-999b-9bcd4f0a96a9)]

### Depth, 3D-ish monument, parallax
19. **The 3D "13" is rendered pixel-native (Dead Cells / HD-2D approach).** Three renders the monument to a render target the size of the virtual canvas (or smaller). Settings: no MSAA, nearest-filtered upscale, toon or step lighting with 4–5 bands, and a post-pass that quantizes to the palette (LUT to nearest of 32). Add a normal- or depth-edge outline 1 virtual px wide in `--stone-0`. Draw the cracks as a hand-painted texture at texel = virtual pixel. Dead Cells rendered 3D animations at very low resolution without smoothing, then applied a toon shader with normal maps. HD-2D pairs pixel sprites with 3D scenes plus DoF, tilt-shift and dynamic light. [src: [80.lv Dead Cells pipeline](https://80.lv/articles/case-study-dead-cells-character-art-pipeline/), [HD-2D](https://en.wikipedia.org/wiki/HD-2D)]
20. **Energy rings live in 3D space but are drawn as pixel strokes.** Each ring is a torus or line loop in Three, rendered into the same low-res target. The back half of each ring is occluded by the monument, the front half overlaps it. Rings rotate at 0.15–0.4 rev/s with per-ring phase offsets. A 2-colour flicker (`--red-hot` / `--red`) changes every 3–4 frames at 60 Hz. [house]
21. **Parallax uses 6–7 layers with fixed speed factors** (camera delta multiplier): sky + stars 0.0, moon + corona 0.02, red clouds 0.06 / 0.10 (2 layers, opposite drift), skyline (Sugarloaf + Christ) 0.18, bay + city lights 0.30, hill + monument 1.0, foreground vines and embers 1.25. The idle camera breathes ±2 virtual px over 6 s with sine easing, so the scene is never fully static. [house; layered parallax depth: [ansimuz cyberpunk street, 3 layers](https://opengameart.org/content/cyberpunk-street-environment), Last Night's "dozens of parallax layers": [Soret thread](https://threadreaderapp.com/thread/976819508441681920.html)]
22. **Optional diorama depth of field** (HD-2D): blur only layers ≤0.10 and the foreground (1.25), with a box blur of 1 virtual px. Never blur the gameplay plane or the HUD. Disabled on low-tier mobile. [src: [HD-2D](https://en.wikipedia.org/wiki/HD-2D)]

### Animation
23. **Sprite animation runs on twos/threes, not 60 fps.** Character loops play at 8–12 fps (hold each frame 5–8 ticks). FX play at 12–15 fps. Tweens (UI, camera, squash) run at 60 fps. A 4–6-frame idle and a 6–8-frame run are enough when key poses are strong. [house]
24. **Squash and stretch preserve area.** Landing: scaleY 0.80 / scaleX 1.20 for 60 ms, then back to 1.0 with ease-out over 120 ms. Jump start: scaleY 1.15 / scaleX 0.87. Pickups pop to 1.25 and settle to 1.0 in 180 ms with ease-out-back. On pixel sprites, snap the scaled result to whole pixels, or use pre-drawn squash frames for the hero. [house; principle: [GDQuest juicing](https://school.gdquest.com/glossary/juicing)]
25. **Attacks use anticipation, a smear and an impact frame.** Every attack: 1–2 anticipation frames, then 1 smear frame (stretched or duplicated form in the arc colour, 1 frame only), then the contact frame held under hit-stop, then 2–3 recovery frames. Save the big swooshes for heavy or critical hits. [src: [Prolific smear frames](https://blog.prolificstudio.co/blog/smear-frames/), [FE asset thread](https://feuniverse.us/t/fe-asset-repository-discussion-thread/14309?page=86), [penusbmic attack tutorial](https://penusbmic.itch.io/pixel-art-tutorial-smooth-stylish-attack)]
26. **Sparkle lifecycle (4-point star).** Frames are 1 px dot, then a 3x3 plus, then a 5x5 star (1-px arms, `--white` centre, `--gold-hi` arms), then a 7x7 star with arm tips in `--gold`, then back to 3x3, then gone. That is 6 frames at 12 fps, about 500 ms. Spawn 1 sparkle every 0.4–1.2 s at random on the crown, the monument edges and city lights. Never let 2 sparkles sit within 12 px of each other. [house; white-shine method: [HeroMachine forum](https://www.heromachine.com/?p=32927)]
27. **Fire and ember particles follow a strict ramp by age.** Colour moves `--white` → `--gold-hi` → `--ember-bright` → `--ember` → `--red` → `--blood-1` and then dies, or fades through 2 dither steps. Particles are 1–2 px squares that drift upward at 8–20 virtual px/s with ±6 px/s horizontal sine wobble. Lifetime is 0.6–1.4 s. [house; ramp/pan approach: [Unvanquished FX tutorial](https://forums.unvanquished.net/viewtopic.php?p=14686)]

### Game feel / juice
28. **Hit-stop on every hit.** Light hit 50–80 ms, heavy 120–160 ms, kill or crit 180–220 ms. Both attacker and target freeze. Particles and UI keep running. The optimum in a 3D-action study was 0.1–0.2 s. Street Fighter V uses 8/12/16 frames (133/200/267 ms) for light/medium/heavy. [src: [IEICE study](https://ken.ieice.org/ken/paper/20230315OCSt/eng/), [Capcom SFV column](https://game.capcom.com/cfn/sfv/column/131545)]
29. **Trauma-based screenshake.** Each event adds trauma: light hit 0.2, heavy 0.4, explosion or boss 0.6, with a cap of 1.0. Shake = trauma² × maxOffset. maxOffset is 4 virtual px. Trauma decays at 1.5/s, so a heavy hit settles in about 270 ms. Drive the offset from smoothed noise, not white noise, and round to integers. In 2D use translation, plus at most 1° rotation and only on non-pixel layers. Shooting kicks the camera 1–2 px opposite the shot direction (Vlambeer). [src: trauma² + noise, [Eiserloh GDC 2016](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math), [Godot impl.](https://godotengine.org/asset-library/asset/735); kick: [gamedeveloper juice](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)]
30. **Hit flash.** On damage, the target sprite goes solid `--white` for 2 frames (33 ms), then solid `--red-hot` for 1 frame, then back to normal. Enemies get knockback of 3–6 px. On death, spawn a palette-limited debris burst of 8–16 particles and leave a decal (permanence) that fades after 4 s. [src: hit pause, knockback, muzzle flash, impact effects listed in [Art of Screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U) / [archive.org](https://archive.org/details/the-art-of-screenshake) / [recreation repo](https://github.com/colinbellino/screenshake)]
31. **Input forgiveness.** Buffer taps and keys for 100 ms. Give a 80 ms "coyote" grace on any timing window. Nudge near-miss collisions by up to 2 px. Celeste uses coyote time, jump buffering, halved gravity at the apex and corner correction. [src: [Thorson thread](https://threadreaderapp.com/thread/1238338574220546049.html), [Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/)]
32. **UI micro-feedback.** On press: scale 0.92 over 60 ms, ease-out-quad. On release: return to 1.0 with ease-out-back, about 8% overshoot, over 150 ms. Total under 250 ms or it stops reading as instant. Menu cursor `▶` bobs 1 px every 400 ms. Selected item: red bar fill plus a 1-frame white flash on change. [src: 0.1–0.2 s and ease-out for press, [bugnet button pop](https://bugnet.io/blog/how-to-fix-ui-button-pop-easing-feels-stiff); overshoot 5–15%, [bugnet elastic](https://bugnet.io/blog/fix-construct3-tween-easing-out-elastic-overshoot)]
33. **Scores count up, never jump.** XP and score tick up over 300–600 ms with ease-out. Pitch rises one semitone per tick group. A milestone (level up) triggers a flame/sparkle burst plus a 120 ms hit-stop on the HUD itself. Balatro's chip and multiplier counters and its flames on big scores carry the emotional peak. [src: [turnbasedlovers Balatro](https://turnbasedlovers.com/news/9-reasons-why-balatro-is-so-fun)]

### Accessibility, performance, HUD
34. **Reduced motion and flash safety.** Under `prefers-reduced-motion`, shake goes to 0, hit-stop is capped at 60 ms, the camera stops breathing, sparkles drop to 1 per 2 s and full-screen flashes are disabled. In every mode, no more than 3 full-screen flashes per second (WCAG 2.3.1). Both mode controls (shake and flash) also live in settings. [studio rule + WCAG]
35. **Canvas budget.** Use `useCanvasBudget`. At most 300 live particles on desktop and 120 on mobile. Skip bloom and DoF on low tier. Pause on `visibilitychange`. Hold a 60 fps target, and drop to a 30 fps tick (not a variable rate) when frame time stays above 20 ms for 1 s. [studio rule + house]
36. **HUD readability.** Use a pixel font at integer scale on its own UI layer. Panels are 9-slice frames with a 1-px light bevel top-left (`--stone-lo`), a 1-px dark bevel bottom-right (`--night`) and an opaque `--night` fill. Do not use semi-transparent text boxes, which reduce contrast. Text contrast is at least 4.5:1. On mobile, the Q/W/E/R keycaps become touch buttons of at least 44 CSS px with the letter kept as a corner label. [src: opaque bevelled boxes, [Valham UI write-up](https://www.moddb.com/games/valham-will-of-the-7-swords/news/finding-the-right-ui-style)]

---

## 2. Master palette (32)

These are hue-shifted ramps. Darks shift toward violet/magenta and lights toward orange/yellow. Anchor: `#e3242b`.

| # | Token | Hex | Role |
|---|---|---|---|
| 1 | `--void` | `#07050a` | Background near-black, letterbox, deepest sky |
| 2 | `--night` | `#0e0a14` | Sky base, UI panel fill, eclipse disc |
| 3 | `--dusk` | `#181122` | Upper sky gradient, far cloud shadow |
| 4 | `--haze-dark` | `#241a33` | Far skyline silhouette (Sugarloaf, Corcovado) |
| 5 | `--haze` | `#3a2a4a` | Mid hills, atmospheric fog, far-layer outlines |
| 6 | `--blood-0` | `#2a0a14` | Deepest red shadow (violet-red), red-zone outlines |
| 7 | `--blood-1` | `#4a0d1c` | Cloud shadows lit red, dying embers |
| 8 | `--crimson-deep` | `#7a1224` | Red-lit cloud body, XP bar empty |
| 9 | `--crimson` | `#b01a2a` | Corona outer ring, menu highlight shadow |
| 10 | `--red` | `#e3242b` | **Anchor.** Energy rings, XP fill, highlighted menu item, hearts |
| 11 | `--red-hot` | `#ff4a3d` | Ring core, rim light, hit flash 2 |
| 12 | `--red-glow` | `#ff7a5c` | Halo ring next to white cores, heart highlight |
| 13 | `--ember-dark` | `#9c2a10` | Ember shadow, scorched stone |
| 14 | `--ember` | `#ff6a1f` | Ember particles, fire mid, warm city lights |
| 15 | `--ember-bright` | `#ffa040` | Fire tip, moon-side rim, crit numbers |
| 16 | `--gold-0` | `#4a2e0c` | Gold shadow / outline (crown) |
| 17 | `--gold-1` | `#a8701c` | Gold mid shadow |
| 18 | `--gold` | `#e8b23a` | Crown, LEVEL text, flag rhombus, sparkle tips |
| 19 | `--gold-hi` | `#ffe27a` | Crown highlight, sparkle arms, Christ lit |
| 20 | `--sparkle` | `#fff6d6` | Warm white glow core, city-light cores |
| 21 | `--white` | `#ffffff` | Sparkle centre pixel, hit flash 1. Never a fill |
| 22 | `--stone-0` | `#2a2530` | Monument cracks, 3D edge outline |
| 23 | `--stone-1` | `#4f4858` | Stone deep shadow (violet-grey) |
| 24 | `--stone-2` | `#857c8c` | Stone shadow |
| 25 | `--stone-3` | `#bdb4b6` | Stone mid |
| 26 | `--stone-hi` | `#ece6de` | Stone lit (warm), UI bevel light |
| 27 | `--vine-0` | `#0c2418` | Vine shadow (blue-green) |
| 28 | `--vine-1` | `#1c5230` | Vine mid |
| 29 | `--green` | `#2f9a3e` | Leaves, flag field (Brazil green ~#009c3b, pulled warm) |
| 30 | `--leaf-hi` | `#a6d84a` | Leaf highlight (yellow-green), heal pickups |
| 31 | `--blue-0` | `#14204f` | Flag globe, bay deep water, cold shadow accent |
| 32 | `--blue-1` | `#3a64c8` | Flag globe light, bay reflection highlights, MP/shield bar |

Ramps:
- Night: 1→2→3→4→5.
- Red: 6→7→8→9→10→11→12. This continues into ember 14→15 and then gold-hi 19 → sparkle 20 → white 21, so fire and energy run along one continuous ramp.
- Gold: 16→17→18→19→20.
- Stone: 22→23→24→25→26.
- Vine: 27→28→29→30.
- Blue: 31→32.

Ring and corona recipe: core 21/20, halo 11, body 10, dither falloff 9/8 over `--night`.
Moon: disc 2, limb AA 6. Corona: 1-px 11 ring, then 2-px 10, then dithered 9, then dithered 8 to 3.
Red clouds: tops 9/10, bodies 8, undersides 7/6.

Implement these as `@studio/tokens` CSS vars (for the HUD) plus a `palette.ts` array. Both the Pixi colour LUT and the Three quantize pass read from that array.

---

## 3. Per-technique notes (with sources)

**Award context**
- Hyper Light Drifter won IGF 2017 Excellence in Visual Art and the Audience Award ([MCV](https://www.mcvuk.com/development-news/quadrilateral-cowboy-takes-the-top-prize-at-the-igf-festival/)). Celeste won TGA 2018 Best Independent, with Dead Cells and The Messenger nominated ([mp1st](https://mp1st.com/news/the-game-awards-2018-list-of-winners)). Balatro won TGA 2024 Best Independent, Debut Indie and Mobile ([NME](https://www.nme.com/news/gaming-news/the-game-awards-2024-see-the-full-list-of-winners-3821788)). Sea of Stars won 2023 Best Independent, though only one source confirms it ([GfG](https://www.geeksforgeeks.org/?p=1128794)). Vampire Survivors won a BAFTA ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)).

**Per game: what to steal**
- **Hyper Light Drifter.** Region-specific palettes (purples/blues in one zone, burnt orange/red in another). Two-tone forms lit from above. One accent colour repeated across the architecture. Smooth soft gradients are allowed where dithering could not do the job. Takeaway: a limited palette with colour used as a gameplay cue. [AV Club](https://avclub.com/hyper-light-drifter-blended-past-and-present-to-become-1798255620), [wayline](https://www.wayline.io/blog/art-of-limited-color-palettes-game-design)
- **Celeste.** Game feel comes from invisible forgiveness: coyote time, jump buffer, halved apex gravity, corner correction, momentum storage. Hair colour shows dash state, so the HUD lives on the character. Takeaway: put state on the sprite (our hero glows red when a skill is ready). [Thorson thread](https://threadreaderapp.com/thread/1238338574220546049.html), [GameSpot](https://www.gamespot.com/articles/celeste-dev-explains-how-they-made-their-game-feel/1100-6474775/), [Wikipedia](https://en.wikipedia.org/wiki/Celeste_(video_game))
- **Dead Cells.** 3D models are rendered at tiny resolution with no smoothing. Each frame is saved with a normal map, and a toon shader gives the final look. This is the blueprint for our Three "13". [80.lv](https://80.lv/articles/case-study-dead-cells-character-art-pipeline/)
- **Octopath (HD-2D).** Pixel sprites sit in 3D environments with depth of field, tilt-shift, point lights and shadows. The team first found the view too flat and the sprites "lonely", so they raised tile variation and colour density. Takeaway: the background must be dense, so the skyline needs many lit windows and varied silhouettes. [Wikipedia HD-2D](https://en.wikipedia.org/wiki/HD-2D), [Siliconera](https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/)
- **Sea of Stars.** Custom pipeline: sprites with fully dynamic normal-mapped lighting, pixel depth writing, shadow receiving and casting, volumetric light, screen-space indirect light. Light is also tied to puzzles. Takeaway: if budget allows, normal-mapped hero sprites lit by the rings in Pixi are a premium touch. [Niche Gamer](https://nichegamer.com/2020/03/19/the-messenger-prequel-rpg-sea-of-stars-enters-kickstarter-launches-2020-for-pc/), [Playdigious press](https://playdigious.com/press/sea-of-stars)
- **Eastward / Children of Morta / The Last Night.** Hand-painted pixel art combined with modern lighting. Eastward is "dark by default, add colour where light falls". Morta uses dynamic lights and specular maps in Unity. The Last Night uses dozens of parallax layers, billboards and post-processing. Takeaway: our night scene is a dark base plus light layers, not a lit painting. [itch thread](https://itch.io/post/9039152), [Eastward wiki](https://eastwardwiki.com/Eastward), [TechRaptor Morta](https://techraptor.net/content/how-dead-mage-created-the-art-for-children-of-morta), [jumpdashroll](https://www.jumpdashroll.com/article/children-of-morta-review), [Soret thread](https://threadreaderapp.com/thread/976819508441681920.html), [80.lv dynamic lighting](https://80.lv/articles/exploring-next-gen-pixel-art-with-real-time-dynamic-lighting)
- **Blasphemous.** A purist approach: no shaders or 3D, with violence carried by hand animation. Takeaway: a dark-red, grim register can come entirely from palette and animation. [Hollywood Reporter](https://www.hollywoodreporter.com/heat-vision/blasphemous-designer-purist-approach-games-pixel-art-style-1238370)
- **Owlboy.** Everything is placed pixel by pixel, with no gradients, blur, tracing or 3D captures. Different palettes per scene part. Small, dense pixels in backgrounds. Expressive faces (eyebrows). [Wikipedia](https://en.wikipedia.org/wiki/Owlboy), [waltorious](https://waltoriouswritesaboutgames.com/2024/09/02/rainbow-in-the-dark-owlboy/)
- **Animal Well.** Many composited layers plus raymarched SDF lighting and depth of field, particles and fluid simulation, all on a custom engine. Takeaway: layered compositing is where the "modern" look comes from. [PlayStation Blog](https://blog.playstation.com/?p=367113), [TechRadar](https://www.techradar.com/news/how-animal-well-uses-the-ps5-hardware-for-its-new-beautiful-metroidvania-world)
- **UFO 50.** One 32-colour palette shared across 50 games, and no sprite scaling. Proof that a strict palette yields cohesion, not poverty. [Wikipedia](https://en.wikipedia.org/wiki/UFO_50)
- **Pizza Tower.** 90s-cartoon squash and stretch with extreme expressions. Takeaway: on a short web game, exaggeration reads better than realism. [The Pacer](https://www.thepacer.net/a-piece-a-warios-pie-a-review-of-pizza-tower/)
- **Loop Hero.** Restricted 1980s-PC palette, moody colours, distinct sprites, minimal UI. The palette claim comes from a weak source. [smartworld](https://www.smartworld.it/recensioni/loop-hero)
- **Balatro.** Counters tick up, flames appear on big scores, sounds are casino-like, plus a CRT shader, card tilt and foil. It works like a Rube Goldberg machine you watch pay out. Takeaway: the score reveal is the show. [turnbasedlovers](https://turnbasedlovers.com/news/9-reasons-why-balatro-is-so-fun), [godotshaders card tilt](https://godotshaders.com/shader-tag/card/), [errorandexp](https://errorandexp.substack.com/p/unpacking-balatros-addicting-game)
- **Katana Zero.** Screen shake, grainy VHS filters, time-slow as a core mechanic. Takeaway: a short slow-motion (0.2–0.4 s, per the IEICE slow-mo optimum) as the kill-shot reward. [Nintendo Insider](https://www.nintendo-insider.com/katana-zero-review/), [IEICE](https://ken.ieice.org/ken/paper/20230315OCSt/eng/)
- **Moonlighter.** Modern UI conventions in a retro skin: rounded text boxes, a masked portrait, a pixel font. This matches our portrait frame top-left. [ModDB Valham](https://www.moddb.com/games/valham-will-of-the-7-swords/news/finding-the-right-ui-style)

**Craft (artists and tutorials)**
- **Slynyrd (Raymond Schlitter).** 9-swatch ramps with 20° hue shift per swatch. Saturation peaks mid-ramp and darks get more saturation. Set the light source first and place the key top-left or top-right. [Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes), [Pixelblog 6](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow)
- **Pedro Medeiros (saint11, Studio Miniboss, Celeste/TowerFall).** Animated-GIF tutorials. Relevant entries: #70 Illumination Techniques, #53 Darkness, #28 Light Magic Effects, #78 Impact, #18 Explosions, Smoke. Index: [blog.studiominiboss.com/pixelart](https://blog.studiominiboss.com/pixelart) (mirror list: [lemm.ee](https://ui.lemm.ee/post/2976406)). Patreon note: [Creative Bloq](https://creativebloq.com/news/artist-makes-animated-gif-tutorials-to-teach-you-pixel-art).
- **Sel-out and outlines.** [Lospec outlines](https://lospec.com/articles/pixel-art-outlines), [part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- **AA and banding.** [Pixel Parmesan](https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists), [Pixel Joint tutorial](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- **Dithering.** [pixnote](https://pixnote.net/en/learn/dithering), [divoom](https://divoom.com/blogs/setup-ideas/pixel-art-dithering-when-to-use-and-stop)
- **Smears and attacks.** [Prolific](https://blog.prolificstudio.co/blog/smear-frames/), [penusbmic](https://penusbmic.itch.io/pixel-art-tutorial-smooth-stylish-attack), [penusbmic explosions](https://penusbmic.itch.io/pixel-art-tutorial-understanding-explosions/purchase)
- **Not found.** Specific write-ups by Brandon James Greer, MortMort, Adam C. Younis and ansimuz did not surface in search (all four mainly publish on YouTube or Patreon). An X/Twitter `site:` search returned no posts. Their core advice matches the value-first, hue-shift, silhouette-first guidance above ([bugnet](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly), [pixnote](https://pixnote.net/en/learn/shading)). ansimuz's packs show a 3-layer parallax structure ([OGA](https://opengameart.org/content/cyberpunk-street-environment)).

**Juice**
- **"Juice it or lose it"** (Jonasson and Purho, 2012). Tweens, better spacing and timing, particles, shaders, screenshake on collision, shown by adding them to a plain Breakout. [GDQuest](https://school.gdquest.com/glossary/juicing)
- **"The Art of Screenshake"** (Nijman, Vlambeer, INDIGO 2013). About 30 tweaks: more enemies, bigger and faster bullets, muzzle flash, less accuracy, impact effects, hit pause, knockback, kick opposite to fire, camera lerp, permanence. [YouTube](https://www.youtube.com/watch?v=AJdEqssNZ-U), [archive.org](https://archive.org/details/the-art-of-screenshake), [Game Developer](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-), [recreation](https://github.com/colinbellino/screenshake)
- **Eiserloh, "Juicing your cameras with math"** (GDC 2016). Trauma, with shake = trauma² driven by Perlin/simplex noise. Use translation plus rotation in 2D and rotation only in 3D. [Game Developer](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math), [JCCC notes](https://blogs.jccc.edu/dpatter/tag/mathematics)
- **Hit-stop numbers.** [IEICE](https://ken.ieice.org/ken/paper/20230315OCSt/eng/) (0.1–0.2 s hit-stop, 0.2–0.4 s slow-mo), [Capcom](https://game.capcom.com/cfn/sfv/column/131545) (8/12/16 f), [SmashWiki hitlag](https://www.ssbwiki.com/Hitlag) (scales with damage)

**Virality and retention (section 3 of the brief)**
- **Wordle share grid.** Spoiler-free and visual, pasteable anywhere. A player invented it and Wardle built it in. Growth went from 90 to over 2M players. Each share works as a peer recommendation. **We ship:** a daily-seed run plus a spoiler-free emoji share card (e.g. `13 🔴🔴🟠⭐🟢 · Lv7 · 0:58 · deltaco.app/d/123`) and an OG image of the final frame. [Smithsonian](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/), [BuzzFeed](https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy)
- **Balatro "one more run".** A combo you set up and then watch pay out, with hidden values until you play, plus a visible sense of improving. **We ship:** a run of 60–180 s, a restart under 1 s from the results screen with retry as the default focused button, and an end screen that shows "best" next to "this run". [errorandexp](https://errorandexp.substack.com/p/unpacking-balatros-addicting-game), [feedme.design](https://www.feedme.design/how-balatro-took-over-my-evenings)
- **Vampire Survivors power curve.** Galante prioritised "as much stuff on-screen as possible" over balance, and the player feels overpowered. **We ship:** the visible effect count roughly doubles every level-up tier (Q/W/E/R upgrades add rings, sparkles and particles). The final 20 s of a run should be visually maximal, within budget. [PC Gamer](https://www.pcgamer.com/uk/vampire-survivors-creator-didnt-have-a-vision-when-he-started-making-the-game-that-allowed-him-to-quit-his-job/), [The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)
- **Streaks.** Loss aversion drives them. Duolingo decoupled the streak from the daily goal, so 1 lesson keeps it alive. **We ship:** 1 daily run keeps the streak, a free "freeze" every 7 days, and the streak shown in the share card. No punitive withering. [WeWard](https://www.wewardapp.com/blog/how-we-built-the-streak-feature-to-boost-user-retention-and-create-healthy-habits), [UX Mag](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design)

---

## 4. What the reference does that we must match (checklist)

**Scene**
- [ ] Near-black sky (`--void`/`--night`) covering at least 45% of the frame, with a subtle staggered-dither gradient toward `--dusk` at the horizon.
- [ ] Eclipse moon: a dark disc with a 1-px `--red-hot` limb, a red corona falling off in 3–4 rings through `--red` to `--crimson` to dithered `--crimson-deep`, and a slow 4 s pulse of ±1 px radius.
- [ ] Red-lit clouds: bright tops facing the moon and rings (`--crimson`/`--red`), bodies `--crimson-deep`, undersides `--blood-0`. Two layers drifting in opposite directions.
- [ ] Rio skyline readable as a silhouette in `--haze-dark` at 1x: Sugarloaf's dome, Corcovado with a small lit Christ (`--gold-hi` core, `--sparkle` halo), and the bay with a city-light strip (`--ember`/`--gold` dots, every 3rd one twinkling) plus vertical reflections in the water.
- [ ] Hill in the foreground with green vines (`--vine-0..2`, highlight `--leaf-hi`) and a Brazilian flag (green field, `--gold` rhombus, `--blue-0/1` globe). The flag waves as a 4–6-frame cloth loop at 10 fps.
- [ ] The "13" monument in cracked white stone. It must read as 3D (the 4–5-band toon ramp `--stone-0..hi` is visible), cracks are dark `--stone-0` lines with a 1-px `--stone-hi` lip on the lit side, it has a red rim on the edge facing the rings, and it is palette-quantized.
- [ ] Glowing red energy rings around the monument: 2–3 tilted rings with front/back occlusion, a white-hot core, a red halo, additive bloom, flicker and rotation. They are the dominant light source and colour the stone and grass near them red.
- [ ] Gold crown with 4-point white sparkles appearing and disappearing on a 6-frame lifecycle.
- [ ] Ember particles rising from the ring area along the age ramp.
- [ ] The whole frame passes the desaturation test (rule 9) and the palette CI gate (rule 5).

**HUD**
- [ ] Top-left: a portrait in a 9-slice bevelled frame, "LEVEL n" in `--gold`, and a red XP bar (`--crimson-deep` track, `--red` fill, 1-px `--red-glow` top highlight) that ticks up.
- [ ] Top-right: pixel hearts (about 9x8 px) with full, half and empty states. Losing a heart flashes it white for 2 frames, shakes it ±1 px for 150 ms and pops it out.
- [ ] Right: segmented stat bars, each segment 4–6 px wide with 1 px gaps, filling one segment at a time.
- [ ] Bottom-left: the command menu in an opaque `--night` panel. The selected item gets a `--red` bar and a bobbing `▶` cursor. Other items are `--stone-3`.
- [ ] Bottom-centre: 4 skill icons, each with a Q/W/E/R keycap. Cooldown shows as a radial or vertical sweep in `--blood-1`. When ready, the icon gets a 1-frame white flash and a sparkle. On touch these become ≥44 px buttons.
- [ ] Bottom-right: a minimap in a bevelled frame. The player dot pulses in `--red-hot` and the monument shows in `--gold`.
- [ ] Every HUD element is pixel-aligned at integer scale, uses palette colours only and has text contrast ≥4.5:1.

**Feel**
- [ ] Hit-stop, trauma shake, white→red hit flash, knockback and a particle burst on every hit (rules 28–30).
- [ ] Squash and stretch on landing and pickups. Smear frames on attacks.
- [ ] Scores and XP count up. Level-up triggers a burst and a HUD hit-stop.
- [ ] Reduced-motion mode verified, and flash rate ≤3 per second.
- [ ] Daily seed, share card, a 1-tap retry under 1 s, and a streak.
