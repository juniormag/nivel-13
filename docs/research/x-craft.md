# X (Twitter) craft research: closing the gap to `referencia.png`

Scope: visual craft (pixel FX, 3D→pixel, stone, vines, energy, light) and interaction design (menus, HUD, touch, sound, haptics), sourced from posts on X. This document adds to `docs/research/visual.md` and does not repeat it. Where a rule there already covers something (sparkle lifecycle, hit-stop numbers, trauma shake, count-up), this file only adds what X contributed on top.

## 0. How this was researched, and how far to trust it

- **Search worked, reading did not.** `WebSearch` limited to `x.com`/`twitter.com` returned roughly 150 distinct X posts. A plain `site:x.com` query returned nothing, so every hit here came from `allowed_domains`. Reading posts in full failed through every route in this sandbox:
  - `WebFetch` got DNS `ENOTFOUND` for api.fxtwitter.com, api.vxtwitter.com, xcancel.com, threadreaderapp.com, publish.twitter.com, cdn.syndication.twimg.com, x.com, saint11.art and even en.wikipedia.org.
  - `curl` through the proxy got `CONNECT 403` for fxtwitter, pbs.twimg.com, video.twimg.com, nitter and xcancel.
  - So **no post was read in full, and no image or GIF was seen.** `scratchpad/x-refs/` stayed empty.
- **What each source gives us.** For every post we have the search engine's copy of the tweet text. Sometimes that is the whole tweet, sometimes only its first line, sometimes a summary of a thread's first replies. Each technique is tagged:
  - **[X-text]** the numbers or claims are in the indexed tweet text.
  - **[X-title]** the post only shows the topic exists (for example "saint11 electricity arcs tutorial"). The recipe is ours, derived from the topic and common practice.
  - **[house]** our own parameters, to tune in playtest.
- **One non-X primary source was read in full:** the local three.js `node_modules/three/examples/jsm/postprocessing/RenderPixelatedPass.js`, for the edge-detection numbers.
- **Codebase observations** (read, not changed) drive the "apply in our game" lines:
  - `src/scene/monument.ts` lights voxels with `MeshLambertMaterial` per face. It has no toon ramp, no palette-quantize pass and no outline pass.
  - The rings are 1-px `LineLoop`s, which have no width, so there is nowhere to draw a white core.
  - Ring dots (`#ff3b3b`, `#ffd6c8`, `#ff7a3d`), crown and flag colours (`0xc9b48a`, `0xf5c04a`), backdrop sky stops and city lights (`#ffcf6a`, `#ff9a3d`, `#fff1c4`, `#ffb35a`) are **off-palette**. This breaks `visual.md` rule 5.
  - `PixelButton` scales to 0.92 and plays `sfx('tap')` on `click` (release). There is no haptics code anywhere (`navigator.vibrate` appears 0 times). `sfx()` has no pitch variation.

### Gap to the reference, ranked by visual impact
1. **Energy ribbons.** The reference has thick, tapered, comet-like swooshes with a white-hot core, a red halo and sparks shedding off them. Ours are thin, closed, uniform 1-px hoops.
2. **Monument material.** The reference has big bevelled slabs: warm cream stone faces, red speckled side faces, cracks with lit lips and dark 3D edge outlines. Ours are Lambert-lit cubes, with no quantization and no edges.
3. **Light accents.** The reference has thin vertical light beams with 4-point star nodes, glints and the crown glow. We have none.
4. **Vegetation.** The reference has dense vine clumps at every ledge and spilling over edges. We have scattered leaf voxels.
5. **Palette discipline.** The reference reads as one palette. Our layers use free hex values.
6. **Background.** The reference has red-rimmed clouds and dense city light clusters with water reflections. Ours are close, but off-palette.

---

## 1. Top 25 techniques to apply now

Palette keys refer to `src/lib/palette.ts`. "vpx" means one virtual pixel.

### A. Energy, light and FX (the biggest gap)

**1. Energy ribbon with a white-hot core (replaces the `LineLoop` rings)**
- *What.* Each ring becomes a camera-facing ribbon (a triangle strip along the ellipse) 4–6 vpx wide at the head and tapering to 1 vpx at the tail. The visible arc covers only 200–300° of the ellipse, so it reads as a swoosh rather than a hoop. The reference's rings visibly start and end.
- *Why.* An additive line has no width, so it cannot hold the core→halo bands that make light read as "hot". The banded core is the standard pixel FX glow structure, used in saint11's electricity and shine tutorials and in Mirru's flame tutorial.
- *Recipe.* In the fragment shader take `v = abs(uvAcross*2-1)` and band it:
  - `v<0.18` → `white`
  - `<0.34` → `sparkle`
  - `<0.55` → `redGlow`
  - `<0.8` → `redHot`
  - `<1.0` → `red`
  - Outer halo: one extra 1-vpx band of `crimson`, drawn only where `bayer4(gl_FragCoord.xy) < 0.5`. This is a screen-space checker, so it stays on-grid.
  - Taper: `width *= pow(1.0 - s, 0.6)`, with `s` = 0 at the head and 1 at the tail. The core bands vanish over the last 40% of the length, leaving `red`→`crimson`.
  - Keep depth test on with depth write off, so the monument occludes the back half.
  - Spin 0.15–0.4 rev/s (`visual.md` rule 20). Swap the core between `white` and `sparkle` every 3 frames.
- *Apply.* Monument rings (title world), Final screen and share-card hero. A 2D version as a Pixi `MeshRope` with the same band shader works for level backdrops and the DASH icon.
- *Source.* [X-title] saint11 electricity arcs and sparks, saint11 shine, mirrutatep flame, GestaltGame weapon trails. Band numbers: [house].

**2. Sparks shed from the ribbon head**
- *What.* 1-px sparks (and an occasional 3-px `+`) emitted from the ribbon head. They inherit tangent velocity and decay along the fire ramp.
- *Why.* Sparks give scale and speed cues, and they are the grainy "hot dust" visible all around the reference's rings.
- *Recipe.*
  - Emit 25–40 sparks/s per ribbon on desktop and 10–15 on mobile (fits `useCanvasBudget` 300/120).
  - Velocity = 0.3×tangent + random 6–14 vpx/s, with gravity +4 vpx/s² downward. Life 0.25–0.6 s.
  - Colour by age: `white` → `goldHi` → `redGlow` → `red` → `crimsonDeep` → dead. Position is rounded to integer vpx.
  - 10% of sparks are 3×3 `+` crosses at birth that shrink to a dot after 2 frames.
- *Apply.* Ring heads, the XP bar fill head when XP is gained, the ATAQUE/DASH icons on cast, and share cards (frozen as static dots).
- *Source.* [X-title] saint11 electricity arcs and sparks (https://x.com/saint11/status/790624009427755008).

**3. Vertical light beams with star nodes**
- *What.* The reference has thin vertical light lines, about 1 vpx wide and 60–200 vpx tall, with a 4-point star at a node. They appear at x≈470, 1135 and 1155 of the 1536-px reference, where ribbons cross the monument silhouette.
- *Why.* Thin verticals add "cinematic lens" depth and tie the foreground FX to the sky. They cost almost nothing.
- *Recipe.*
  - Line: `redGlow` core, a 1-vpx `crimson` neighbour on one side only, and ends dithered out over 8 vpx.
  - Star node: a 9×9 4-point star (`white` centre, `sparkle`/`goldHi` arms) plus a 1-vpx horizontal arm of 5–11 vpx.
  - Pulse: the line's alpha steps 100%→60%→100% over 0.6 s in 3 steps, and the star runs `visual.md` rule 26's lifecycle every 2–4 s.
  - At most 3 beams on screen.
- *Apply.* Title world and Final screen. A single beam behind the active menu item works as a "selected" accent.
- *Source.* [X-title] D4NN133L "Test god rays in pixel art", AnasAbdin "Lens_flare.gif", PixelArtJourney 10×11 star tutorial.

**4. Shine sweep on metal and UI**
- *What.* A diagonal glint band crosses a sprite, masked to its pixels.
- *Why.* This is the cheapest "precious" signal, and it is saint11's classic shine tutorial.
- *Recipe.*
  - The band is 2 px of `white` plus 1 px of `goldHi` trailing, at a 45° slope.
  - It moves 3–4 px per frame at 15 fps, so a 24-px crown takes about 8 frames.
  - Repeat every 3–5 s with random jitter, and never on two objects at once.
  - On text, use 1 px only.
- *Apply.* Crown, gold frame edges, the "LEVEL 13" label, a newly earned badge in Colecao, the share-card logo, and the XP bar once per level-up.
- *Source.* [X-text, topic] https://x.com/saint11/status/779020894094168064 ("Simple shine pixel art tutorial (also works in high res)"). Frame numbers: [house].

**5. Smoke-dominant bursts with a single white impact frame**
- *What.* Big moments (level complete, monument piece placed, boss down) open with one white frame, then a short ring, then mostly smoke.
- *Why.* The explosion-tutorial thread says explosions are "90% smoke, 10% flash". The search snippet does not make clear whether the author or a reply said it. Animators note that impact frames run "on 1s", and a single white frame "reads as extra impact".
- *Recipe.*
  - Frame 1: a solid `white` disc of radius r, held 1 frame at 60 Hz (2 at 30 Hz).
  - Frame 2: a 1-px `goldHi` ring at 1.4r plus 6–10 sparks.
  - Frames 3–14 at 15 fps: 5–8 smoke puffs (circles r/3–r/2) in `haze`/`hazeDark` with a `crimsonDeep` underside lit by the fire. They rise 6–10 vpx and shrink, and the last 3 frames dither out (50% → 25% → 0%).
  - Cap: at most 3 white frames per second (WCAG 2.3.1). Under reduced motion, replace the white frame with a 120 ms `sparkle` tint at 30% opacity.
- *Apply.* `JuiceLayer.burst` presets, the level-up moment, and the Result screen star reveal.
- *Source.* [X-text] saint11 explosion tutorial https://x.com/saint11/status/818573977282977792, ARGAtheropodfan on impact frames https://x.com/ARGAtheropodfan/status/1934951478466117906, vashikoo on single white frames https://x.com/vashikoo/status/2042823858772939026.

**6. Flame and "hot number" shader for big scores**
- *What.* A procedural pixel fire that licks upward from big numbers and the selected menu bar. This is the Balatro flame.
- *Why.* LocalThunk calls the tactile, juicy feel of cards and effects "the only reason Balatro exists". He built the flame effect in one night, and it carries the emotional peak.
- *Recipe.*
  - A Pixi `Filter` at virtual resolution: `n = fbm(uv*vec2(6,3) + vec2(0,-t*1.6))`, then `h = n - uv.y*1.2 + intensity`.
  - Threshold `h` into `crimson` / `red` / `ember` / `emberBright` / `goldHi` / `white` (5 steps).
  - Update the noise at 12 fps (stepped), not 60, so it reads as drawn.
  - `intensity` scales with score tier: 0.2 / 0.45 / 0.7.
- *Apply.* Result-screen score, the streak counter at ≥7 days, the selected `EXPLORAR` bar (low intensity), and share card "Lv13" (static frame).
- *Source.* [X-text] https://x.com/LocalThunk/status/1872522822574375049, https://x.com/GenePark/status/1860094646040559914. [X-title] 80Level/andre_mc Balatro-in-Unity breakdown https://x.com/80Level/status/1785888857751183814, Noobytube Balatro background shader port.

### B. Monument: stone, bevels, cracks, vines, crown

**7. Light per voxel, not per face**
- *What.* Light each voxel with one smoothed "shape normal" instead of its face normals.
- *Why.* Tim Soret: per-face lighting "looks too noisy… you want the actual shapes to catch the light & shadows, not the individual voxels." Our monument is `InstancedMesh` cubes lit per face, and that face noise is why it reads as Lego rather than carved slabs.
- *Recipe.*
  - At build time, compute each voxel's normal as `normalize(-gradient(occupancy))` over a 3×3×3 neighbourhood, using `has(x±1,y,z)` etc. that already exist in `buildVoxels`.
  - Store it as an `InstancedBufferAttribute('aShapeN', 3)` and use it for diffuse in a custom shader. Keep the true face normal only for the outline pass (#10).
- *Apply.* `src/scene/monument.ts` stone and leaves.
- *Source.* [X-text] https://x.com/timsoret/status/2062900152126390578.

**8. Ledges and bevels so the geometry reads**
- *What.* Add a 1-voxel step or chamfer along the top and front edges of each glyph slab, and colour it differently.
- *Why.* t3ssel8r: "The little ledges help the geometry read a lot better." The reference's "13" is made of slabs with clear bevels: a top face, a lit lip and a red side.
- *Recipe.*
  - Top faces: `stoneHi` (lit) / `stone3`.
  - Bevel row: `stone3` → `stone2`.
  - Front face: `stone3`/`stone2` with texture (#9).
  - Side and inner faces (the red interior seen in the reference): `crimson`/`red`, speckled 1-px `redHot`/`crimsonDeep` noise at about 25% density.
  - Bottom-facing faces: `blood1`.
  - The glyph strings `GLYPH_1`/`GLYPH_3` gain a "ledge" pass: any top-exposed cell gets a voxel inset half a cell deep.
- *Apply.* Monument, plus the 9-slice UI frames (same bevel logic: 1-px light lip top-left, dark bottom-right).
- *Source.* [X-text] https://x.com/t3ssel8r/status/1416737689911496711, https://twitter.com/t3ssel8r/status/1416737703073251329.

**9. Stone texture: tiling detail plus noise, quantized to 4 colours**
- *What.* Stone surfaces sample a small tiling stone-and-crack texture plus low-frequency noise, and the result is quantized to the stone ramp.
- *Why.* t3ssel8r's terrain shader "takes tiling textures, mixes in a little procedural noise, and quantizes to 4 colors". It hides polygons and voxels while reading as pixel art.
- *Recipe.*
  - Use a 32×32 hand-pixelled stone tile with crack lines and object-space triplanar mapping, at texel = 1 vpx at the default camera distance.
  - `lum = toonRamp(N·L) + 0.12*(tex-0.5) + 0.06*valueNoise(p*0.25)`, then pick from `[stone1, stone2, stone3, stoneHi]`.
  - On red faces the same tile drives `[blood1, crimsonDeep, crimson, red]`.
- *Apply.* Monument faces and the rocky hill base (Pixi side: the same 32×32 tile drawn with 4 palette tones).
- *Source.* [X-text] t3ssel8r terrain thread https://x.com/t3ssel8r/status/1416737689911496711.

**10. Cracks with a lit lip, crisp at any distance**
- *What.* Cracks drawn as 1-px `stone0` lines. The side facing the key light gets a 1-px `stoneHi` lip, and the other side a 1-px `stone1` shadow.
- *Why.* A lip turns a line into a 3D groove, which gives the reference its "carved and broken" look. Oskar Stålberg's "every other texture pixel becomes a pixel-perfect antialiased line" trick (UVs skip every 2nd texel before sampling, with fwidth for zoom-independent crispness) keeps 1-px lines from breaking or doubling when the 3D monument is scaled or slightly rotated.
- *Recipe.*
  - Cracks are polylines with 2–4 px straight runs and 1-px jogs, branching every 6–10 px. They run across slabs, not along edges.
  - Use 3–5 major cracks per slab face. Put chips (a 2×2 `stone1` notch) at slab corners.
  - In the shader: `line = 1.0 - smoothstep(0.0, fwidth(d)*1.0, d)` for a crack distance field baked into the tile's alpha channel.
- *Apply.* Monument and the stone UI frames (a hairline crack on the "broken" state of a locked level in Map).
- *Source.* [X-text] https://x.com/OskSta/status/1174996561526493186, https://x.com/OskSta/status/978211952504852480, https://x.com/OskSta/status/1241097317987557377.

**11. The far side always in shadow**
- *What.* Force faces that point away from the camera-right (the back extrusion of "1" and "3", the far crown points) one ramp step darker, whatever the light says.
- *Why.* t3ssel8r uses this pixel-art trick ("always put the far half of the body in shadow… to make limbs read better"). It guarantees the depth read that toon ramps sometimes flatten.
- *Recipe.* `if (dot(aShapeN, cameraRight) < -0.2) band = max(band-1, 0)`.
- *Apply.* Monument, crown, flagpole, Christ statue silhouette.
- *Source.* [X-text] https://x.com/t3ssel8r/status/1393550048034639873.

**12. A 1-px rim light against the energy**
- *What.* A one-texel rim where the surface turns away from the camera and faces the ring light.
- *Why.* t3ssel8r "updated the pixel-art shader to render sweet rimlights against the sun". On near-black, the rim is the main separator (`visual.md` rule 12). This gives the shader version for 3D.
- *Recipe.*
  - `rim = step(0.55, 1.0 - dot(N,V)) * step(0.15, dot(N, Lring))` gives `redHot`. On the moon side the same test with `Lmoon` gives `emberBright`.
  - Applied after quantization, so it stays exactly 1 band.
- *Apply.* Monument, crown, flag edge, vine tips nearest the rings.
- *Source.* [X-text] https://x.com/t3ssel8r/status/1352227210959065088.

**13. Vine clumps that spill and sway**
- *What.* Dense leaf clumps sit on every top ledge and hang over front edges in 1-px strands with leaves every 2–3 px. Clumps near the rings pick up red.
- *Why.* The reference uses vines to break the stone's silhouette, add a fourth hue and show age. Vegetation tutorials (saint11's 3-part series, tree and grass posts) build leaves from clusters, not single pixels.
- *Recipe.*
  - Leaf blob 3–5 px: `vine0` underside, `vine1` body, `green` top, 1 `leafHi` px on top-lit blobs only.
  - Strands: `vine1`, 6–18 px long, with a 1-px `vine0` shadow on the stone beneath them.
  - Sway: only the bottom third of a strand moves, offset by `round(sin(t*1.3 + x*0.15))` vpx, updated at 8 fps. The pointer or touch within 12 vpx pushes leaves 1–2 vpx away for 300 ms.
  - Ring-side tips get a `redHot` rim (#12).
- *Apply.* Monument (more leaf voxels on top-exposed cells and a hanging-strand billboard pass), the hill foreground, and HUD frame corners (a tiny 3-leaf sprig on Colecao).
- *Source.* [X-title] saint11 vegetation part 3 https://twitter.com/saint11/status/932995384162570241, PixelArtJourney grass. [X-text] GDQuest interactive wind/grass shader https://x.com/NathanGDQuest/status/1359571119292956675, PlayingInCanvas sin/cos vertex wind https://twitter.com/PlayingInCanvas/status/1288411424662999040, t3ssel8r fire/grass/rain interaction https://x.com/t3ssel8r/status/1377977659985063938.

**14. Gold crown as banded metal, reflecting red**
- *What.* Metal is drawn as high-contrast bands with hard jumps, not smooth gradients. The crown's underside reflects the red rings.
- *Why.* Metal reads from abrupt value jumps and environment reflection. A red band on the crown ties it into the scene's light.
- *Recipe.*
  - Ramp `gold0`→`gold1`→`gold`→`goldHi`→`sparkle`, with a hard jump `gold1`→`goldHi` at the horizon line of each point.
  - Underside band: 1–2 px of `crimson` with a `redHot` pixel per jewel.
  - Jewels: `red` with a 1-px `white` spec.
  - Halo: a dithered `gold1` ring 2 px out, at 50%.
  - Bob ±1 vpx over 1.2 s, in steps. Shine sweep (#4) every 4 s.
- *Apply.* Crown (`buildCrown` currently uses off-palette Lambert golds), "LEVEL" text and badges.
- *Source.* [X-title] saint11 metal tutorial https://x.com/saint11/status/877219054674694144, saint11 gems https://x.com/saint11/status/991334747526885376, PixelArtJourney gold bar https://x.com/PixelArtJourney/status/1858496864867225928.

**15. A shaded flag sold by its folds**
- *What.* The flag waves as a 4–6-frame loop of fold bands, not a smooth vertex sine.
- *Why.* saint11's fabric and flags tutorial: cloth reads from moving light and dark fold bands.
- *Recipe.*
  - Wave the mesh at 10 fps (stepped). Shade by fold: crest `leafHi`/`green`, trough `vine1`, gold rhombus `gold`/`gold1`, globe `blue1`/`blue0`, white band 1 px `stoneHi`.
  - Quantize after lighting (#16).
- *Apply.* `buildFlag` in the monument, and the Brazil flag icon in the HUD.
- *Source.* [X-title] https://x.com/saint11/status/889833866713747456.

### C. Rendering discipline (3D → pixel)

**16. Toon ramp plus palette LUT quantization**
- *What.* Lighting goes through a 4–5-step toon ramp, then every pixel is snapped to the 32-colour palette, with optional ordered dither between neighbouring bands.
- *Why.* Lente's 3D-pixel thread: cel shading "reduces the number of shades… [the scene] looks noticeably worse without it". Faraz ported Blender's Color Ramp to three.js as a 256×1 texture. Slow uses a 3D LUT shader so output "will always pick colors from the palette", with a dither texture overlaid. This is the core of matching the reference's posterized look.
- *Recipe.* See section 3 for code. The ramp is a `DataTexture` of 5 texels with `NearestFilter` (`MeshToonMaterial.gradientMap`), and the LUT is a 32³ nearest-palette table.
- *Apply.* The monument render target and the share-card 3D hero. Also run the same LUT in a final Pixi filter, so the backdrop's off-palette hex values are forced on-palette until they are fixed at the source.
- *Source.* [X-text] https://twitter.com/LenteGameDev/status/1599823004094980096, https://x.com/CantBeFaraz/status/1640351567323774976, https://x.com/slugsoft/status/979902752334729216.

**17. Depth edges dark, normal creases light**
- *What.* A 1-px outline where depth jumps, drawn dark (`stone0` on stone, `blood0` on red), plus a 1-px highlight on convex creases where normals change, drawn one band lighter.
- *Why.* This is the signature of t3ssel8r-style and Lente-style 3D pixel art. three.js ships it as `RenderPixelatedPass` (depth-edge strength 0.4 darkens, normal-edge strength 0.3 brightens). The pass is in our `node_modules` and was read in full.
- *Recipe.*
  - Port the pass's `depthEdgeIndicator` / `normalEdgeIndicator` into our post shader.
  - Map the result to palette steps rather than a multiply: dark edge = 2 bands down, crease = 1 band up.
  - Never use pure `#000` (ToronjaGB: "Never use #000000").
- *Apply.* Monument and crown.
- *Source.* [X-text] https://twitter.com/LenteGameDev/status/1599823004094980096, https://twitter.com/ToronjaGB/status/999440041280770049. Local source: three `RenderPixelatedPass.js`.

**18. Camera snapped to the texel grid, motion in 2D**
- *What.* Never move the 3D camera by sub-texel amounts. Do "breathing" and parallax by moving the composited low-res canvas in whole vpx. Any real camera move snaps to texels, and the residual is applied as a screen-space offset.
- *Why.* Texel Splatting (dylan_ebert_): most 3D pixel art techniques "snap pixels to a screen grid, which only works with an orthographic camera". Our monument uses `PerspectiveCamera(30)`, so any motion swims. Tim Soret: sub-texel camera movement causes "wobbly" pixel art and jitter.
- *Recipe.* Switch to an `OrthographicCamera` sized to the virtual canvas, or keep the perspective camera static. See section 3 for the snap code.
- *Apply.* Title world idle, the Map screen fly-in, and the share-card render (static).
- *Source.* [X-text] https://x.com/dylan_ebert_/status/2033315367766884602, https://x.com/timsoret/status/1017676352726687744, https://x.com/timsoret/status/1017674280446971904.

**19. Quantize time as well as colour**
- *What.* Update shading, cloth, vines and the monument's slow rotation at 8–12 fps. Ribbons, sparks and UI stay at 60.
- *Why.* Tim Soret's "graal" list includes "quantized shading update (notice how it doesn't refresh at the same framerate)". Stepped updates read as hand-animated, and they save GPU on mobile.
- *Recipe.* Only re-render the monument RT when `floor(t*12)` changes, unless the user is interacting. Ribbons render to their own layer every frame.
- *Apply.* Monument, flag, vines, clouds (6 fps drift steps).
- *Source.* [X-text] https://x.com/timsoret/status/1431019361838551044.

### D. World and backdrop

**20. Red-rimmed cloud banks**
- *What.* Clouds built from stacked circles, lit from the moon and rings. Their tops are bright, they have a thin bright rim, dark bodies and dithered undersides.
- *Why.* Cloud tutorials on X (saint11, PixelArtJourney's "cloud color", Jubilee's alternate-colour palette, Omel's 4-stage sunset process) agree that the colour logic is a lit rim plus a body plus a shadowed underside, and the process runs rough shapes → refined → base shading → detail.
- *Recipe.*
  - Puff radii 6–14 vpx.
  - Rim: 1 px of `redGlow`/`ember` on edges facing the moon.
  - Top: `red`/`crimson`. Body: `crimsonDeep`. Underside: `blood1` with a 2-row Bayer dither into `blood0`.
  - Two layers drift in opposite directions at 2–6 vpx/s, stepped at 6 fps.
  - Re-tint the sky stops in `backdrop.ts` (currently `#260b10`, `#5e1715`, `#a8361a`, `#d0581f`) to `blood0` / `blood1` / `crimsonDeep` / `emberDark` / `ember`, with a dithered band between each.
- *Apply.* Title and level backdrops, and the share card sky.
- *Source.* [X-title] https://x.com/saint11/status/894948250289139713, https://twitter.com/PixelArtJourney/status/1676352174564016132, https://x.com/OmelPixelaArt/status/1947692560324927805. [X-text] Jubilee palette https://x.com/16pxl/status/1279858416266051584.

**21. City-light clusters and water reflections**
- *What.* Lit windows cluster along hill contours, and the bay shows broken vertical reflections.
- *Why.* RujiK's pixel-water breakdown combines a "distortion shader, parallax for the clouds, mask for reflections, particles for ripples". Dense light clusters give the reference its "big city at night" scale.
- *Recipe.*
  - Lights are 1 px in `sparkle` (10%), `goldHi` (30%), `gold` (35%) and `ember` (25%), replacing the off-palette `cityCols`. 10% twinkle at 0.5–2 Hz (on/off, no fade).
  - Clusters of 6–30 lights follow contour rows 2–3 px apart.
  - Reflections: each light within the bay's x-range gets a 1-px-wide streak of 3–8 px below the shoreline in a colour one step darker. Each row is offset by `round(sin(y*0.7 + t*2))` vpx, updated at 8 fps, and 1 ripple glint per second is `sparkle`.
- *Apply.* Backdrop bay and Christ hill, and the share card.
- *Source.* [X-text] https://x.com/TheRujiK/status/1208035937671884800. [X-title] saint11 water https://twitter.com/saint11/status/798222972326526976.

**22. Silhouette layer plus slight camera follow**
- *What.* A near-black foreground silhouette layer (rocks and leaves at the bottom corners) moves faster than the world. The camera drifts slightly toward the pointer or device tilt.
- *Why.* Jan Willem Nijman (Disc Room): a top layer of black silhouettes that moves at a different rate "gives it a nice spacious feel", and a camera that follows slightly "even though the whole room fits on the screen makes the game feel much more dynamic".
- *Recipe.*
  - Silhouette in `void`/`night` at a 1.2× parallax factor.
  - Camera follow up to ±3 vpx, lerp 0.08/frame, rounded to integer vpx. Use pointer position on desktop and `deviceorientation` gamma/beta clamped ±15° on mobile (iOS needs a permission prompt, so make it opt-in).
  - Under reduced motion: 0.
- *Apply.* Title world, Play backdrops.
- *Source.* [X-text] https://x.com/jwaaaap/status/1321858203529994244 thread (Disc Room game-feel thread; the snippet quotes from several of its posts).

### E. Feel and sound

**23. Directional shake for hits, vertical shake for joy**
- *What.* Damage and heavy impacts push the camera in the hit direction. Good events (combo, level-up) shake only vertically.
- *Why.* Christer Kaitila: "random screenshake feels bad and disorienting, good for taking damage. For 'happy' screenshake, try shaking only up and down… like something heavy hit the ground, not you." Nijman: "Heavy impacts can offset the camera in a direction."
- *Recipe.*
  - Damage: offset 2–4 vpx along the hit vector, decaying to 0 over 150 ms with ease-out (rides on top of `visual.md` rule 29's trauma).
  - Happy: `y = round(A*sin(2π*12t)*exp(-8t))` with A = 2 vpx, about 3 visible bounces.
  - Never rotate pixel layers.
- *Apply.* `JuiceLayer` gets `kick(dx,dy)` and `bounce()`. The HUD hearts panel uses a happy bounce on heal.
- *Source.* [X-text] https://twitter.com/McFunkypants/status/1135565276328497153, Disc Room thread via https://x.com/jwaaaap/status/1321858203529994244.

**24. Forgiveness stretched in time, and the save-moment freeze**
- *What.* Overlap must persist for 3 frames (50 ms) before it counts as a hit against the player. Faster hazards get smaller hitboxes. Commit moments (death, run end) freeze for 1–3 frames.
- *Why.* Disc Room: "collision masks are incredibly generous. Faster discs have smaller masks… you're allowed to be inside a disc for up to 3 frames." Saving on death after the sounds play causes "a nice little freeze frame".
- *Recipe.*
  - Hazard hitbox = sprite box × (1 − 0.25·speed/maxSpeed). Hits register only if overlap ≥ 3 consecutive ticks.
  - At run end: play the sound, hold for 90 ms, then cut to Result.
- *Apply.* `src/games/*` mini-games (swipe/whack/etc.) and the Result transition.
- *Source.* [X-text] Disc Room thread (https://x.com/jwaaaap/status/1321858203529994244 and siblings).

**25. Pitch-varied, layered, tiered sound**
- *What.* Every repeated sound gets a small random pitch, UI sounds layer a transient click with a tonal body, and "big" sounds are reserved for important moments.
- *Why.* GMTK: "randomly change the pitch, just a little, each time. Stops it sounding so repetitive." A reply recommends randomizing in log space. Alex Cornell's UI sounds combine "a soft ding with a hard click": the top-end click cuts through (pocket or phone speaker) and the midrange carries the tune. Nijman: subtle pitch details mattered as much as the big sounds, and big stingers play "whenever we want a moment to feel more important".
- *Recipe.*
  - In `tone()`, add `detune = (Math.random()*2-1)*35` cents (log-uniform by construction), and ±60 cents for `tick`/`tap`.
  - Layer `tap` = a 6 ms highpassed noise click at 4 kHz (vol 0.06) plus the existing 880 Hz square at 40 ms.
  - Menu move `tick` sits 6 dB below confirm. Back/cancel is a descending fourth.
  - Count-up ticks rise by a semitone per step (as in `visual.md` rule 33), and a ring "whoosh" pans with ring x (`StereoPannerNode`, ±0.6).
  - Big stingers (`fanfare`, `level`) play at most once per screen.
- *Apply.* `src/audio/audio.ts`.
- *Source.* [X-text] https://x.com/gamemakerstk/status/1813468015574254004, https://x.com/alexcornell/status/1272572260906225671, Disc Room thread.

---

## 2. Interaction design rules (15)

1. **Feedback fires on pointer-down, the action on pointer-up.** Show the pressed visual, play the sound and fire the haptic on `pointerdown` (within one frame). Commit the action on `pointerup` inside the target. Cancel if the pointer moved more than 8 CSS px, the same threshold that drag gestures use before they activate (Rauno: most drag interactions "wait for you to move a few pixels"). Today `PixelButton` plays `sfx('tap')` on `click`, which fires on release and arrives about 100 ms or more late on touch. [X-text] https://x.com/raunofreiberg/status/1923056929389019314
2. **Press depth on pixel buttons is pixel-native.** On a pixel button, press = translateY(+1 virtual px) plus swapping the bevel (light top-left lip ↔ dark bottom-right), with no transition, so it snaps in one frame. Release returns over 120 ms. If something must scale (non-pixel cards and images), use Emil Kowalski's 0.97–0.98 on `:active` with a ~150 ms transition. Our current 0.92 is far stronger and resamples the pixel font into blur. [X-text] https://x.com/emilkowalski_/status/1952354760637505541
3. **Timing.** UI motion runs 100–250 ms total, with 125–175 ms as the sweet spot (that figure comes from a reply to Emil, not Emil himself). Enter and exit use ease-out. Exit is about 30% faster than enter. Never animate in from `scale(0)`: start at ≥0.93. [X-text] https://x.com/emilkowalski_/status/1970144111261868487, https://x.com/emilkowalski_/status/1954891053032755560
4. **Animation budget scales inversely with frequency.** Things done 100+ times a session (menu cursor moves, keyboard Q/W/E/R, tab switches) get no tween: an instant state change plus a 1-frame `white` flash on the new item. Things done a few times a session (opening a dialog) get 150–200 ms. Rare peaks (level-up, unlocks, Final) get the full show. This reading of the frequency rule comes from a secondary summary of Emil's skills, and shadcn says design engineering is "mostly deciding what not to animate". [X-text, secondary] https://x.com/shao__meng/status/2072484635955900792, https://x.com/shadcn/status/2014318190306750695
5. **Everything is interruptible.** Use transitions, which retarget from the current value, not keyframes, which restart, for toggles, tabs and drawers. A second tap mid-animation must reverse from the current value. Never lock input during a celebration: allow skip on tap after 300 ms. [X-text] https://x.com/emilkowalski/status/2100586238205948164
6. **Focus equals selection.** Keyboard, gamepad and touch share one selection model. The focused item looks exactly like the reference's selected item: a `red` bar, a `white` label and the `▶` cursor bobbing 1 vpx every 400 ms. Arrow and WASD moves are instant. Q/W/E/R trigger skills even when focus is on the menu. Screens are a stack (pushdown automaton): Esc/back pops and restores the previous screen's focused item. Keep `:focus-visible` as a 1-px `goldHi` inner line, so it is never removed. [X-text] Johan Steen screen stack https://x.com/artstorm/status/1542823519523786752
7. **Haptics: short, tiered, synced, optional.**
   - Android/Chrome patterns with `navigator.vibrate`:
     - selection move `8`
     - confirm `12`
     - success `[15,40,25]`
     - error `[30,50,30]`
     - level-up `[20,40,20,40,60]`
     - damage `[40]`
   - Never exceed 100 ms total for UI events.
   - iOS Safari has no Vibration API. A known hack toggles a hidden `<input type="checkbox" switch>` to fire the system haptic. Feature-detect it, keep it behind the setting, and test on a real device.
   - Fire in the same frame as the visual. Haptics have their own toggle, independent of sound and reduced-motion, and the toggle must actually stop them. Avoid haptics during precision drags.
   - [X-text] https://x.com/MoodiSadi/status/2028664713752821963, https://x.com/firt/status/2028807962295230776, https://x.com/mayfer/status/2028628522093494755, https://x.com/Aximoris/status/1641000294959001600, https://x.com/roaakdm/status/1503478442351808528
8. **Every press has a sound, and sounds are tiered.** Pair press with click, move with a soft tick 6 dB lower, confirm with a rising 2-note, back with a falling fourth, and error with a low buzz. Add random pitch (Technique 25). The UI never plays the "big" stinger. [X-text] GMTK and Cornell (above)
9. **Opening a menu enters the world.** Supergiant: "Even the simple act of opening a menu screen… is an opportunity… to draw you into its world."
   - The 3D monument and backdrop stay alive behind every menu. Never cut to black.
   - Screen-to-screen transitions use a palette-only dissolve: a Bayer 4×4 threshold wipe in 8 steps over 160 ms (`visual.md` motion style), or an iris centred on the monument.
   - Direction-aware: forward navigation slides content in from the right by 8 vpx in 4 steps, and back from the left.
   - [X-text] https://x.com/SupergiantGames/status/1319314729580462080, https://x.com/emilkowalski/status/2061426518333571576
10. **Time-to-fun under 60 s, one control at a time.** The first tap on Title starts play. There is no sign-up and no modal before the first round. Teach each mechanic in play, one new button per overlay (the CoD Mobile pattern), and show the skill bar's Q/W/E/R only as each is introduced. [X-text] https://x.com/Tocelot/status/1399752363389296641, https://x.com/RamliJohn/status/1433461651907432455
11. **Touch targets ≥44 CSS px, with invisible hit-area expansion.** The pixel art can be 9 vpx (hearts, `...` menu), but the hit box is padded to 44 px. Only interactive things react to hover or press, so non-interactive HUD never animates on touch. [X-text] https://x.com/vponamariov/status/1421014957110579203
12. **Tooltip and info delay.** The first open waits 400–600 ms. Once one is open, moving to a neighbour opens instantly with no animation (Emil). On touch, long-press for 350 ms opens it, with a light haptic at the threshold. [X-text, secondary] Emil tips summary in https://x.com/emilkowalski/status/1973054048883351612
13. **Reduced motion is a mode, not an off switch.** `prefers-reduced-motion` and in-game settings give separate controls: shake 0–100%, flashes on/off, camera follow on/off, haptics on/off. Under reduced motion, replace movement with colour or opacity steps (a selected item still flashes, the ring still glows but does not spin, and the white impact frame becomes a tint). Raven, Roblox and Monster Train all expose shake as its own accessibility setting. [X-text] https://x.com/RavenSoftware/status/1553129145709826050, https://x.com/Bloxy_News/status/1719460780406448144, https://x.com/TheMonsterTrain/status/1274742173016211465
14. **Forgive inputs in time.** Buffer taps for 100 ms (`visual.md` rule 31), and use 3-frame overlap grace with speed-scaled hitboxes (Technique 24). On a near miss of a target, snap to it if within 6 CSS px. [X-text] Disc Room thread
15. **Make the tactile layer the product.** LocalThunk's obsession was the "tactile and juicy feel of the cards/effects". Treat result cards, share cards and badges as physical objects:
    - Hover or press tilts them ±4° (DOM 3D, not on pixel canvases).
    - The score steps pop to 1.15×, then 1.0 over 120 ms, each with a pitch step.
    - A drag moves a card with lag (lerp 0.25) and a 2° lean in the drag direction.
    - [X-text] https://x.com/LocalThunk/status/1872522822574375049, https://x.com/GenePark/status/1860094646040559914

---

## 3. Pipeline ideas (three.js monument + Pixi composite)

### 3.1 How the reference X posts do 3D→pixel
- **t3ssel8r** ([X-text] "a 3D game engine… that renders 3D geometry into pixel art").
  - The topics his posts show:
    - rim lights against the sun
    - deferred shading with raymarched shadows (Fireflies)
    - terrain tiling textures plus noise quantized to 4 colours
    - ledges for readability
    - the far half in shadow
    - an automatically generated smear effect
    - Cascadeur-animated characters.
  - Tim Soret says t3ssel8r's video is "the same solution I developed solo… perfectly smooth, yet perfectly crisp 3D pixel art". What X confirms about that solution is only this:
    - Soret's snippets: render to a low-res buffer, upscale by an integer factor, then downscale to the screen, using fwidth-based filtering plus TAA.
    - The Texel Splatting post: t3ssel8r snaps to the screen grid with an orthographic camera.
  - We did not see the video. The "apply the sub-texel camera remainder as a screen offset" step in 3.2 is our reconstruction of the widely described method, not something read on X.
- **Lente** ([X-text]): two cameras. One renders the scene into a small texture ("gives the chunky pixel look"), plus cel shading.
- **Texel Splatting** (dylan_ebert_, [X-text]): grid snapping only works with an orthographic camera. For perspective, the origin snaps to a world-space grid, and the method blends from the previous cubemap with ordered dithering. Seb Aaltonen called it "the most over-engineered way of rendering pixel art". We do not need it unless the monument camera must orbit with perspective.
- **Ciberman texel-space lighting** ([X-title]) and Tim Soret's "per-texel lighting" goal: light per texture texel, not per screen pixel, so shadows stay on the art's grid. A full implementation is out of scope. Our cheap equivalent is to quantize in the RT at texel = vpx.
- **DreamMix Blender→pixel pipeline** ([X-text]): use Blender to preview how lighting falls on a rotated object, then hand-pixel over it. We use this for authoring: render the "13" and crown at the target camera in Blender with a toon ramp and use the result as the paint-over guide for the hand-painted crack and stone tile.
- **Acerola** ([X-text]): Oklab gives better palette gradients and nearest-colour matching than HSL/HSV, especially for blues. Use Oklab distance when building the LUT.

### 3.2 Recipe adapted to `src/scene/monument.ts`

Steps 4 and 5 run together in one post shader.

1. **Render target.**
   - A `WebGLRenderTarget(W, H)` at virtual resolution (the same `PixelFit` as Pixi) with `minFilter = magFilter = NearestFilter`, `generateMipmaps = false`, and a `DepthTexture`. Renderer `antialias:false`, `setPixelRatio(1)` (already set).
   - The final blit uses an integer scale. On screens where integer fit wastes too much, use Tim Soret's route: nearest-upscale ×N to the first integer size ≥ the viewport, then one linear downscale to the viewport.
2. **Camera.**
   - `OrthographicCamera(-W/2/k, W/2/k, H/2/k, -H/2/k)` with k = world units per vpx.
   - Snap each frame:
     ```js
     const p = camPos.clone().applyMatrix4(viewRot.invert())
     const snapped = p.clone().divideScalar(1/k).round().multiplyScalar(1/k)
     residual = (p - snapped) * k  // in vpx
     ```
   - Render from `snapped`, then offset the blit by `round(residual * scale)` screen px.
   - Idle "breathing" happens only in the 2D composite (integer vpx).
3. **Materials.**
   - Replace `MeshLambertMaterial` with `MeshToonMaterial({ gradientMap })`, where the gradient map is a 5×1 `DataTexture` (values 0.18, 0.38, 0.6, 0.82, 1.0) with `NearestFilter`.
   - Better: an `onBeforeCompile` patch that uses `aShapeN` (Technique 7), the far-side darkening (11) and the rim test (12), and outputs a **band index plus a material id**, not a colour, to an RGBA8 target (R = band 0–4, G = material: 0 stone, 1 red face, 2 leaf, 3 gold, 4 flag-green, 5 flag-gold, 6 flag-blue, B = flags such as rim or crease, A = coverage).
   - Writing indices makes palette mapping exact and removes the need for a LUT on the 3D layer.
   - Add the stone tile and noise from Technique 9 to the band value before flooring it.
4. **Edges.** In the post shader, run `RenderPixelatedPass`'s depth and normal edge logic with a 1-texel neighbourhood:
   - depth edge → band −2 (min 0) with the material's outline colour (stone → `stone0`, red → `blood0`, leaf → `vine0`, gold → `gold0`)
   - normal crease → band +1.
   - A second MRT or override pass writes view-space normals (as RenderPixelatedPass does with `MeshNormalMaterial`). Use the face normal there, not `aShapeN`, so slab edges still outline.
5. **Palette map.**
   - `color = RAMP[material][band]`, with ramps taken from `RAMPS` in `palette.ts`:
     - stone: `stone0..stoneHi`
     - red face: `blood1, crimsonDeep, crimson, red, redHot`
     - leaf: `vine0..leafHi`
     - gold: `gold0..sparkle`.
   - For the share card, or any layer that is not index-based, fall back to an Oklab nearest-colour LUT: a 32³ `Data3DTexture`, built once from `PALETTE`. Add ordered dither by biasing the lookup with `(bayer4(fragCoord)-0.5)*0.06` before rounding the band.
6. **Ribbons and sparks.** Render in the same RT, after the opaque pass, with depth test on, depth write off and additive blending, using the band shader from Technique 1. They write final palette colours directly, never band indices, because additive red on red clips. Clamp to `white`.
7. **Bloom, palette-safe.**
   - Instead of `UnrealBloomPass` (which produces off-palette gradients), draw a **pixel halo**: dilate the ribbon mask by 1 vpx into `crimson` and by a further 1 vpx at 50% Bayer into `crimsonDeep`.
   - If real bloom is wanted (desktop high tier only), do it last in the Pixi composite at virtual resolution with threshold 0.8, 2 passes and intensity ≤0.6, accepting that it is the only allowed off-palette layer (`visual.md` rule 15c).
8. **Time.** Re-render the monument opaque pass at 12 fps (`floor(t*12)` changed), or every frame while the user drags, scrubs or the build animation runs. Ribbons and sparks render every frame and composite over the cached opaque RT plus its depth. This roughly halves GPU cost on mobile.
9. **Composite order (Pixi).**
   1. sky
   2. moon and corona
   3. clouds (2 layers)
   4. skyline and Christ
   5. bay and city lights with reflections
   6. hill
   7. **monument RT sprite** (`scaleMode:'nearest'`)
   8. vertical beams
   9. foreground silhouettes and vines
   10. sparks
   11. HUD (DOM)
   - Then a final Pixi palette-LUT filter over layers 1–10, as a safety net while the backdrop hex values are migrated.
10. **Smear frames for fast things** (t3ssel8r's auto smear, [X-title]). For any object moving more than 6 vpx/frame (dash, ribbon head, swipe), draw the previous position, the current position and the strip between them as one frame in the object's halo colour, for 1 frame only. In 2D that is a `MeshRope` from the last 3 positions.

### 3.3 Verification hooks
- Add a dev-only `?palcheck` that reads back the composite and counts off-palette pixels (expect 0, or >0 only in the bloom layer).
- Use Playwright screenshots of Title at 480×270×3 before and after, and pass them through the `taste_score`/`taste_compare` MCP as the studio CLAUDE.md requires for visual work.

---

## 4. Every X post used

Status key:
- **snippet**: the search index exposed tweet text (full or partial) that was used.
- **title**: only the topic or headline was visible, and the technique is ours.

No post was opened directly, and no image or video was viewed.

### Pixel craft and FX
| URL | Author | Summary | Status |
|---|---|---|---|
| https://x.com/saint11/status/779020894094168064 | @saint11 | Simple shine tutorial ("also works in high res") | snippet (text), media unseen |
| https://x.com/saint11/status/780407410372538368 | @saint11 | Smoke effects tutorial | title |
| https://x.com/saint11/status/818573977282977792 | @saint11 | Explosion tutorial; snippet mentions "90% smoke 10% flash" (attribution ambiguous) | snippet |
| https://x.com/saint11/status/790624009427755008 | @saint11 | Electricity arcs and sparks tutorial | title |
| https://x.com/saint11/status/800671352260874240 | @saint11 | Fire animation tutorial | title |
| https://x.com/saint11/status/846789856395247616 | @saint11 | Dark magic tutorial | title |
| https://x.com/saint11/status/920252666273509376 | @saint11 | Darkness tutorial | title |
| https://x.com/saint11/status/981261938737995777 | @saint11 | Holograms and ghost effects | title |
| https://x.com/saint11/status/894948250289139713 | @saint11 | Cloud tutorial | title |
| https://twitter.com/saint11/status/932995384162570241 | @saint11 | Vegetation tutorial part 3 | title |
| https://x.com/saint11/status/877219054674694144 | @saint11 | Metal tutorial | title |
| https://x.com/saint11/status/991334747526885376 | @saint11 | Gems (draw and animate) | title |
| https://x.com/saint11/status/889833866713747456 | @saint11 | Fabric and flags | title |
| https://twitter.com/saint11/status/798222972326526976 | @saint11 | Animating water | title |
| https://x.com/saint11/status/907631057427726336 | @saint11 | Space and stars | title |
| https://x.com/saint11/status/872098481057517568 | @saint11 | Motion blur tutorial | title |
| https://x.com/saint11/status/976118046564679682 | @saint11 | Taking/defending hits | title |
| https://x.com/saint11/status/779430773858369536 | @saint11 | Minimal attack animation | title |
| https://x.com/saint11/status/1004050613326376960 | @saint11 | Resizing pixel art (#71) | title |
| https://x.com/mirrutatep/status/1774089207230951794 | @mirrutatep | Quick flame tutorial | title |
| https://x.com/mirrutatep/status/1992261792144527481 | @mirrutatep | Blue flame mini-tutorial | title |
| https://twitter.com/GestaltGame/status/930497354406404096 | @GestaltGame | Weapon trail effects | title |
| https://x.com/D4NN133L/status/1921259981594083738 | @D4NN133L | God rays test in pixel art | title |
| https://x.com/AnasAbdin/status/1883914515492094070 | @AnasAbdin | Pixel lens flare GIF | title |
| https://x.com/PixelArtJourney/status/1766484303918043533 | @PixelArtJourney | 10×11 star tutorial | snippet |
| https://twitter.com/PixelArtJourney/status/1676352174564016132 | @PixelArtJourney | Cloud colour tutorial | title |
| https://x.com/PixelArtJourney/status/1858496864867225928 | @PixelArtJourney | Gold bar tutorial | title |
| https://x.com/16pxl/status/1279858416266051584 | @16pxl (Jubilee) | Cloud tutorial with alternate palette (hexes listed) | snippet |
| https://x.com/OmelPixelaArt/status/1947692560324927805 | @OmelPixelaArt | Sunset sky, 4-stage process | snippet |
| https://x.com/TheRujiK/status/1208035937671884800 | @TheRujiK | Pixel water: distortion, reflection mask, ripple particles | snippet |
| https://x.com/OskSta/status/1174996561526493186 | @OskSta | Every other texel becomes an AA line (bricks, tiles) | snippet |
| https://x.com/OskSta/status/978211952504852480 | @OskSta | fwidth/ddx/ddy for crisp zoom-independent lines | snippet |
| https://x.com/OskSta/status/1241097317987557377 | @OskSta | Can stretch and skew UVs and vary texel size | snippet |
| https://twitter.com/ToronjaGB/status/999440041280770049 | @ToronjaGB | Outline tip: never use #000000 | snippet |
| https://x.com/hypnobius/status/1988698409713426704 | @hypnobius | Stone floor mini-tutorial | title |
| https://x.com/JasperBoerstra/status/902165190338367489 | @JasperBoerstra | Banding definition | snippet |
| https://x.com/ARGAtheropodfan/status/1934951478466117906 | @ARGAtheropodfan | Impact frames animated on 1s, scratchy | snippet |
| https://x.com/vashikoo/status/2042823858772939026 | @vashikoo | A single white frame reads as impact | snippet |
| https://x.com/rayslynyrd/status/1592180260799655936 | @rayslynyrd | "Puffy pixels" | title |

### 3D→pixel and shaders
| URL | Author | Summary | Status |
|---|---|---|---|
| https://x.com/t3ssel8r/status/1403690617528487942 | @t3ssel8r | Video: 3D→pixel animation process | snippet (video unseen) |
| https://x.com/t3ssel8r/status/1353163600408371200 | @t3ssel8r | Engine renders 3D geometry into pixel art | snippet |
| https://x.com/t3ssel8r/status/1352227210959065088 | @t3ssel8r | Pixel shader with rim lights against the sun | snippet |
| https://x.com/t3ssel8r/status/1416737689911496711 | @t3ssel8r | Ledges help geometry read; tiling textures + noise quantized to 4 colours | snippet |
| https://twitter.com/t3ssel8r/status/1416737703073251329 | @t3ssel8r | Remaining straight edges from low mesh resolution | snippet |
| https://x.com/t3ssel8r/status/1393550048034639873 | @t3ssel8r | Far half of body always in shadow | snippet |
| https://x.com/t3ssel8r/status/1399217555605102592 | @t3ssel8r | Auto-generated pixel smear effect | snippet |
| https://x.com/t3ssel8r/status/1355668114873040898 | @t3ssel8r | Fireflies: deferred shading + raymarched shadows | snippet |
| https://x.com/t3ssel8r/status/1377977659985063938 | @t3ssel8r | Fire/grass/rain interaction | title |
| https://x.com/t3ssel8r/status/1528378668334350336 | @t3ssel8r | Decal fake shadow interacts with pixel grass | snippet |
| https://x.com/timsoret/status/1662112715848949762 | @timsoret | t3ssel8r's video = his own smooth+crisp solution | snippet |
| https://x.com/timsoret/status/1017674280446971904 | @timsoret | Jitter fixed with fwidth filtering + TAA | snippet |
| https://x.com/timsoret/status/1017676352726687744 | @timsoret | Keep pixel art sharp but smoothly interpolated; pipeline | snippet |
| https://x.com/timsoret/status/1017708600502947840 | @timsoret | Bilinear = mushy | snippet |
| https://x.com/timsoret/status/1431019361838551044 | @timsoret | "Graal": per-texel lighting, quantized lighting, quantized update rate | snippet |
| https://x.com/timsoret/status/2062900152126390578 | @timsoret | Light voxels with one normal per voxel, not per face | snippet |
| https://x.com/timsoret/status/1283051395600580623 | @timsoret | 160,000 hand-painted px per 10×10 m; procedural pixel R&D | snippet |
| https://x.com/timsoret/status/1111583546068619264 | @timsoret | All custom shaders; fwidth pixel-art AA | snippet |
| https://twitter.com/LenteGameDev/status/1599823004094980096 | @LenteGameDev | Thread: 3D pixel look (two cameras, small RT, cel shading) | snippet (thread partial) |
| https://x.com/DreamMixGames/status/1949191214344843438 | @DreamMixGames | Blender→pixel art pipeline tutorial | snippet |
| https://x.com/CantBeFaraz/status/1640351567323774976 | @CantBeFaraz | Blender colour ramp → three.js (256×1 texture) | snippet |
| https://x.com/slugsoft/status/979902752334729216 | @slugsoft | 3D LUT palette shader + dither overlay | snippet |
| https://x.com/dylan_ebert_/status/2033315367766884602 | @dylan_ebert_ | Texel Splatting: perspective-stable 3D pixel art | snippet |
| https://x.com/SebAaltonen/status/2033464868158726435 | @SebAaltonen | "Most over-engineered way of rendering pixel art" | snippet |
| https://x.com/cibermandev/status/1265563378778587137 | @cibermandev | Texel-space lighting shader | title |
| https://x.com/Acerola_t/status/1525265436698353664 | @Acerola_t | Video: faking pixel art with shaders | title (video unseen) |
| https://x.com/Acerola_t/status/1700400325193015421 | @Acerola_t | Oklab beats HSL/HSV for palette gradients | snippet |
| https://x.com/OskSta/status/793557992931266561 | @OskSta | Flat → up normal → voxel AO → SSAO → directional AO | snippet |

### Wind, grass and particles
| URL | Author | Summary | Status |
|---|---|---|---|
| https://x.com/NathanGDQuest/status/1359571119292956675 | @NathanGDQuest | Interactive wind/grass shader (open source) | snippet |
| https://twitter.com/PlayingInCanvas/status/1288411424662999040 | @PlayingInCanvas | Wind via sin/cos vertex offset | snippet |
| https://x.com/CobraCodeDev/status/1950528049117647359 | @CobraCodeDev | Pixel art grass with vertex-painted wind (UE5) | snippet |
| https://x.com/therujik/status/1204111577349263365 | @therujik | Grass-in-wind illusion on a floor texture | snippet |

### Game feel, juice and sound
| URL | Author | Summary | Status |
|---|---|---|---|
| https://x.com/jwaaaap/status/1321858203529994244 | @jwaaaap | Disc Room game-feel thread (generous masks, 3-frame grace, parallax silhouettes, camera follow, directional shake, freeze on death, pitch details, big stingers) | snippet (several posts of the thread) |
| https://twitter.com/McFunkypants/status/1135565276328497153 | @McFunkypants | Random shake for damage; vertical-only shake for happy events | snippet |
| https://twitter.com/nukefist/status/1501650153677234177 | @nukefist | More hitstop on strong hits | title |
| https://x.com/Stayd3D/status/1380623080070909953 | @Stayd3D | Hit-shake exaggerated for testing, subtle in final | snippet |
| https://x.com/LocalThunk/status/1872522822574375049 | @LocalThunk | Built Balatro's flame effect in one night | snippet |
| https://x.com/GenePark/status/1860094646040559914 | @GenePark | Balatro as an example of UI and feedback making a game | snippet |
| https://x.com/80Level/status/1785888857751183814 | @80Level | Balatro card movement and shaders recreated in Unity | title |
| https://x.com/Noobytube_/status/1789334692245684612 | @Noobytube_ | Balatro background shader ported to Godot | title |
| https://x.com/gamemakerstk/status/1813468015574254004 | @gamemakerstk | Randomize pitch slightly on repeated sounds | snippet |
| https://x.com/alexcornell/status/1272572260906225671 | @alexcornell | UI sound: soft ding + hard click layering | snippet |
| https://x.com/SupergiantGames/status/1319314729580462080 | @SupergiantGames | Opening a menu draws you into the world (kirbyLFO) | snippet |
| https://twitter.com/richtaur/status/1511358544221650944 | @richtaur | "Juice it or lose it" pointer | title |

### Interaction design and UX
| URL | Author | Summary | Status |
|---|---|---|---|
| https://x.com/emilkowalski_/status/1952354760637505541 | @emilkowalski | Press scale 0.97–0.98, ~150 ms | snippet |
| https://x.com/emilkowalski_/status/1970144111261868487 | @emilkowalski | ease-out for enter/exit | snippet |
| https://x.com/emilkowalski_/status/1954891053032755560 | @emilkowalski | Do not animate from scale(0); start ≥0.9 | snippet |
| https://x.com/emilkowalski/status/1973054048883351612 | @emilkowalski | 7 practical animation tips (list not visible) | title |
| https://x.com/emilkowalski/status/2100586238205948164 | @emilkowalski | Interruptible CSS transitions vs keyframes | snippet |
| https://x.com/emilkowalski/status/2061426518333571576 | @emilkowalski | Motion vocabulary (stagger, direction-aware, spatial consistency) | snippet |
| https://x.com/shao__meng/status/2072484635955900792 | @shao__meng | Summary of Emil's skills: frequency rule, 100–160 ms press | snippet (secondary) |
| https://x.com/shadcn/status/2014318190306750695 | @shadcn | Design engineering is mostly deciding what not to animate | snippet |
| https://x.com/raunofreiberg/status/1678438662399221761 | @raunofreiberg | Essay: Invisible Details of Interaction Design | title |
| https://x.com/raunofreiberg/status/1923056929389019314 | @raunofreiberg | Drag waits for a few px of movement before triggering | snippet |
| https://x.com/raunofreiberg/status/1818253966557512106 | @raunofreiberg | Essay on depth in design, animation and interaction | title |
| https://x.com/artstorm/status/1542823519523786752 | @artstorm | Menu screen stack (pushdown automaton) | snippet |
| https://x.com/MoodiSadi/status/2028664713752821963 | @MoodiSadi | Web haptics: navigator.vibrate, sync with CSS animation | snippet |
| https://x.com/firt/status/2028807962295230776 | @firt | iOS web haptics via hidden `<input type=checkbox switch>` | snippet |
| https://x.com/mayfer/status/2028628522093494755 | @mayfer | Same iOS haptic hack | snippet |
| https://x.com/roaakdm/status/1503478442351808528 | @roaakdm | Medium impact on tile placed, stronger on solve | snippet |
| https://x.com/Aximoris/status/1641000294959001600 | @Aximoris | Strong haptics hurt precision | snippet |
| https://x.com/Tocelot/status/1399752363389296641 | @Tocelot | Time-to-fun under 60 s; one new button at a time | snippet |
| https://x.com/RamliJohn/status/1433461651907432455 | @RamliJohn | Mario onboards through play, not tours | snippet |
| https://x.com/vponamariov/status/1421014957110579203 | @vponamariov | Hover only on actionable items; invisible hit areas | snippet |
| https://x.com/RavenSoftware/status/1553129145709826050 | @RavenSoftware | Separate camera-shake intensity setting | snippet |
| https://x.com/Bloxy_News/status/1719460780406448144 | @Bloxy_News | Roblox "Reduce Motion" setting | snippet |
| https://x.com/TheMonsterTrain/status/1274742173016211465 | @TheMonsterTrain | Shake toggle under accessibility | snippet |

### Searched but thin on X
These topics returned nothing usable on X:
- pixel art stone cracks (only titles)
- crown-specific gold
- HD-2D how-tos
- damage-number pop tutorials
- Balatro score-sound details
- a written t3ssel8r breakdown (it lives in his YouTube video, which was not reachable).

The recipes in those areas are tagged [house] or rely on adjacent posts.
