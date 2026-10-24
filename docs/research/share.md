# Sharing a mobile-first web game to Instagram and WhatsApp: implementation guide

Research date: 2026-10-24. Target: a short Brazilian casual web game (React + PixiJS, pixel art) opened mostly from WhatsApp links on Android and iPhone. Shareable moments: daily Fact-or-Fake grid, level-13 victory (crown on the stone "13"), tax-savings result, "I will vote" card.

How reliable the sources are: Meta does not publish one official spec for organic Instagram sizes and safe zones. Most numbers below come from third-party guides, and those guides don't fully agree. Each section labels its numbers as **official**, **browser data** (MDN browser-compat-data, Chromium source), or **community**. Some pages could not be fetched from this environment: developers.facebook.com, webkit.org, caniuse, faq.whatsapp.com. For those, the facts come from search-result extracts of the pages, and the URLs are listed so they can be re-checked.

---

## 0. Spec we will implement

### 0.1 Canvas sizes (pixel art: render at a logical size, then scale up by a whole number with nearest-neighbour)

| Asset | Output px | Logical px × scale | Format | Use |
|---|---|---|---|---|
| Story / Status card | **1080×1920** (9:16) | 180×320 × 6 | PNG-24 (no alpha), target < 1 MB, hard cap 8 MB | IG Story, WhatsApp Status, Reels cover |
| Feed post | **1080×1350** (4:5) | 180×225 × 6 | PNG | IG feed, WhatsApp chat image |
| Square (optional) | 1080×1080 | 180×180 × 6 | PNG | Legacy feed, chat |
| Clip (Reel/Story/Status) | **1080×1920**, 30 fps, 6–10 s | 180×320 × 6 (or 720×1280 = ×4 for the live ring buffer) | **MP4: H.264 High (avc1.640028) yuv420p ~8 Mbps + AAC-LC 128 kbps 48 kHz stereo**, moov at front | IG Reels/Story, WhatsApp Status |
| Link preview (OG) | **1200×630** (1.91:1) | 200×105 × 6 | PNG-8 (palette) or JPG q≈80, **≤ 300 KB** | WhatsApp/iMessage/Telegram previews |

Pixel art at ×6 survives Instagram's JPEG/H.264 re-encode much better than ×2 or ×3 assets that Instagram upscales itself, because its bilinear upscaling blurs the pixels. Turn off smoothing everywhere: `ctx.imageSmoothingEnabled = false`, Pixi `scaleMode: 'nearest'`, and CSS `image-rendering: pixelated` in the preview.

### 0.2 Safe zones on the 1080×1920 canvas (one layout for Story, Reel, Status and Reel cover)

Design to the tightest combined zone, so one file works as a Story, a Reel, a WhatsApp Status and a Reel cover:

```
y 0     ┌──────────────────────────┐
        │  TOP UI: 270 px (14 %)   │  profile/name/progress bars. Background art only
y 270   ├──────────────────────────┤
        │  ★ CORE ZONE ★           │  x 65..1015 (6 % side margins)
        │  title, result, grid,    │  y 270..1250. Everything that must be read
        │  crown/13 hero art       │  (980 px tall)
y 1250  ├──────────────────────────┤
        │  SOFT ZONE y 1250..1540  │  visible in Stories (bottom ~380 px / 20 % is reply bar)
        │  → short URL / logo      │  partly covered in Reels (caption + buttons)
y 1540  ├──────────────────────────┤
        │  BOTTOM UI (Stories)     │  reply bar / Reels: caption, audio, like/comment
y 1920  └──────────────────────────┘  Reels: keep bottom 35 % (≈670 px) free of essentials
```

- Reel cover / profile grid: the grid shows a 3:4 crop, which is 1080×1440 = y 240..1680. The core zone (y 270..1250) sits inside it, so the cover needs no separate layout.
- Right edge in Reels: the like/comment/share buttons sit on the right, around x > 900 in the lower half. Keep text in the lower half left of x ≈ 900.
- Feed 1080×1350: the profile grid crops 4:5 posts to 3:4, which removes about 34 px per side. Keep side margins ≥ 60 px.
- For the Stories-only PNG, the "soft zone" is fine for the short URL `jogo.com.br`. Draw the URL as text in the art, because the web cannot attach a link sticker (see 2.4).

### 0.3 Durations and limits we design to

- Clip length: **6–10 s** (victory), ≥ 3 s (the Reels minimum). That fits every limit: IG Story segment ≤ 60 s, Meta's Stories-share API background video ≤ 20 s, WhatsApp Status ≤ 60 s, Reels ≤ 3 min in-app.
- Clip file size: **< 15 MB** (8 Mbps × 10 s ≈ 10 MB). Chrome refuses Web Share payloads over **50 MiB** or more than **10 files**.
- Share **one file per share** (one PNG or one MP4).

### 0.4 Share flow per platform (decision table)

Detect capabilities at runtime. Do not sniff the user agent for anything except the in-app-browser hints.

| Environment (how they got here) | `navigator.share` | `canShare({files})` | What we do |
|---|---|---|---|
| Chrome Android (WhatsApp opens the default browser today) | yes (61+) | yes (76+) | **Primary: share the file.** The sheet lists Instagram (Feed / Stories / Chats), WhatsApp (incl. "My status"), and so on |
| Samsung Internet | yes | yes (11+) | Same as Chrome |
| iOS Safari (WhatsApp opens Safari/default browser today) | yes (12.1+) | yes; works in practice from **iOS 15** (14.x was broken) | **Primary: share the file.** The sheet lists Instagram (Reels/Feed/Story/Message), WhatsApp, Save Image/Video |
| iOS in-app browsers built on WKWebView (Instagram IAB, a possible future WhatsApp IAB) | mirrors Safari per MDN; **verify on device** | probably | Try the share; if `canShare` is false, use the fallback |
| Android WebView IABs (Instagram, Facebook on Android) | **no** (MDN: webview_android = false) | no | Fallback: preview image + long-press/Download + "Open in Chrome" `intent://` link |
| Desktop | mixed | mixed | Download buttons + copy text |

Fallback chain, in order:
1. `navigator.share({ files: [file] })` if `navigator.canShare?.({ files: [file] })`.
2. If files are unsupported but text sharing works, still offer `navigator.share({ text })` for the text result (daily grid).
3. **Save**: Android or desktop gets `<a download="fato-ou-fake-123.png" href=blobURL>`. iOS gets a full-screen `<img src=blobURL>` with the hint "Toque e segure a imagem → Salvar em Fotos". On iOS, the share sheet's own "Salvar imagem/vídeo" row is the best save path when share works. A `download` link on iOS saves to Files, not Photos.
4. **WhatsApp text**: `https://wa.me/?text=${encodeURIComponent(text)}` (opens the contact picker; the first URL in the text gets a link preview).
5. **Escape the IAB** (Android WebView only): `intent://jogo.com.br/r/abc#Intent;scheme=https;package=com.android.chrome;end`. iOS: show "⋯ → Abrir no navegador". `x-safari-https://` is reported to work on iOS 17+ but is unverified, so only offer it as an extra link.
6. Never depend on `instagram-stories://share`. It needs a native app with a Facebook App ID and the iOS pasteboard, and a page can't provide either (see 2.4).

### 0.5 Code-level approach

**Rule 1: pre-render before the tap.** `navigator.share` needs transient user activation, and Safari loses it across awaits such as fetch or encode. Build the `File` when the moment starts (while the celebration animation plays). In the click handler, make `navigator.share` the first async call.

```ts
// share/capabilities.ts
export function shareCaps(sample?: File) {
  const ua = navigator.userAgent;
  return {
    share: typeof navigator.share === 'function',
    files: !!sample && typeof navigator.canShare === 'function' && navigator.canShare({ files: [sample] }),
    ios: /iP(hone|ad|od)/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document),
    android: /Android/.test(ua),
    igApp: /Instagram/i.test(ua),          // hint only
    fbApp: /FBAN|FBAV|FB_IAB/i.test(ua),   // hint only
    androidWebView: /Android/.test(ua) && /; wv\)/.test(ua),
  };
}
```

```ts
// share/shareMoment.ts — call synchronously from onClick
export async function shareFile(file: File, fallbackText: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      // Files only. Many targets (Instagram) ignore text, and on iOS mixing text+files
      // can make some targets drop the file. The URL is drawn in the art instead.
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'aborted';   // user closed sheet: no nagging
      // NotAllowedError = activation lost or type blocked → fall through to save UI
    }
  }
  openSaveSheet(file, fallbackText); // <img> long-press (iOS) / <a download> (Android) + wa.me + copy
  return 'fallback';
}
```

**Rendering cards.** Use a dedicated off-screen Pixi `Container` (or a plain 2D canvas compositing pixel sprites) at the logical size. Draw it into a 1080×1920 canvas with `imageSmoothingEnabled=false`, then call `canvas.toBlob(cb, 'image/png')` → `new File([blob], 'fato-ou-fake-123.png', { type: 'image/png' })`. Before drawing, `await document.fonts.ready`. Free large canvases afterwards (`canvas.width = 0`), because iOS has a total canvas-memory budget. Follow the repo's `useCanvasBudget`.

**Rendering clips (three tiers, best first).**

1. **Deterministic offline render (default for the level-13 victory).** The crown-on-13 finale is scripted, so the game can re-render it at any time with no live recording. Drive a second Pixi `Application` (`autoStart: false`, 1080×1920 or logical × 6 via a render texture) frame by frame with a fixed `dt = 1/30`. After each `renderer.render()`, push the frame with Mediabunny `CanvasSource` (codec `'avc'`). Render the clip's music and SFX with an `OfflineAudioContext` and push them through `AudioBufferSource` (codec `'aac'`). Output `Mp4OutputFormat({ fastStart: 'in-memory' })` + `BufferTarget`. This doesn't depend on frame rate, has no dropped frames, and stays sharp.
   - Gate it with `await canEncodeVideo('avc', { width: 1080, height: 1920 })` and `canEncodeAudio('aac')`. If AAC is not encodable (Safari < 26 has no `AudioEncoder`; some Android builds lack AAC), register `@mediabunny/aac-encoder` (a WASM polyfill), or ship silent video.
   - WebCodecs `VideoEncoder`: Chrome Android 94+, iOS Safari 16.4+ (full support listed from 26). `AudioEncoder`: Chrome 94+, Safari 26+.
   - Set `preserveDrawingBuffer: true` on the recording renderer only, or capture in the same task right after `render()`.
2. **Live "last 6 seconds" ring buffer (optional, for unscripted highlights).** WebCodecs path: during the level, encode every rendered frame at 720×1280 (×4) with `VideoEncoder` (`avc1.64001F`, `latencyMode: 'realtime'`, a keyframe every 30 frames). Keep `EncodedVideoChunk`s in a deque and drop whole GOPs older than 7 s. Audio goes through an `AudioWorklet` tap into a PCM ring, or AAC packets kept in their own ring. On trigger, start at the first keyframe ≥ now − 6 s, rebase timestamps, and mux with `EncodedVideoPacketSource` / `EncodedAudioPacketSource` into MP4. Memory ≈ 6 s × 5 Mbps ≈ 4 MB. Turn the ring off when `navigator.hardwareConcurrency ≤ 4 || (navigator.deviceMemory ?? 4) ≤ 3`, when the page is hidden, or when `useCanvasBudget` reports pressure.
3. **MediaRecorder fallback (no WebCodecs).** `canvas.captureStream(30)` + an audio track from `audioCtx.createMediaStreamDestination()` (connect the game's master gain to it). Always include an audio track: there are reports of empty or black Safari output from canvas-only streams. Choose the mimeType from: `video/mp4;codecs=avc1.640028,mp4a.40.2` → `video/mp4;codecs=avc1,mp4a.40.2` → `video/mp4` → `video/webm;codecs=vp9,opus` → `video/webm`. Safari 14.3+ records MP4/H.264/AAC. Chrome **126+** records MP4. Older Chrome produces WebM: convert it to MP4 with Mediabunny `Conversion` when WebCodecs is available, or else share the PNG. MediaRecorder output can't be trimmed to "last N seconds", because only the first chunk carries the init segment. So start recording when the scripted finale begins and stop 1–2 s after the crown lands. Don't try a ring buffer here.

Reduced motion (`prefers-reduced-motion: reduce`): the preview shows the PNG, not an autoplaying clip. The clip remains an explicit option.

### 0.6 Moments → assets → buttons

| Moment | When the share UI appears | Asset(s) | Buttons (PT-BR copy suggestion) |
|---|---|---|---|
| Daily Fact-or-Fake result | After the last answer is revealed (+~800 ms) | **Text** emoji grid (primary) + 1080×1920 card | `Compartilhar resultado` (text share / wa.me), `Story` (PNG), `Copiar` |
| Level-13 victory | After the crown lands and the camera holds (~1.5 s). Never during the animation | 1080×1920 PNG + 6–8 s MP4 clip (crown fall) | `Postar no Story` (PNG), `Gravar clipe` → preview → `Compartilhar vídeo`, `Salvar` |
| Tax-savings result | On the result screen, beside the number | 1080×1920 + 1080×1350 PNG. User toggle: show exact R$ or a rounded range | `Compartilhar`, `Salvar imagem`, format toggle Story/Post |
| "I will vote" card | Immediately after the user commits (identity moment) | 1080×1920 PNG; optional transparent "sticker" PNG | `Compartilhar`, `Salvar`, `Enviar no WhatsApp` |
| Daily streak 3/7/30 | Same screen as the daily result | Streak badge drawn on the daily card | (part of the daily share) |
| Normal levels 1–12 | Never prompt. Small share icon in the pause menu only | none | — |

UX rules:
- **Non-blocking**: the share panel slides up under the celebration and never covers it. "Continuar" is always visible. Never show a modal before the next level.
- **Show the asset first**: a live thumbnail of the exact PNG/clip being shared (WYSIWYG). It is the strongest cue that tapping will produce something nice.
- **Separate "Compartilhar" (system sheet) from "Salvar"**: in IABs and on iOS the user often needs the save path.
- **No prompt after a loss.** On the daily, the share text is spoiler-free, and losing grids are still shareable (Wordle's "X/6" grids get shared too).
- Put the URL in the art and in the text, and use per-surface links: `?s=ig_story`, `?s=wa`, `?s=wa_status`, and so on.
- Track: `share_open`, `share_target_resolved` (promise resolved), `share_abort`, `fallback_shown`, `save_click`, `wa_text_click`, plus landing `?s=` attribution. These give the K-factor per moment.

### 0.7 WhatsApp

- **Per-share URLs with server-rendered OG tags** (no JS execution by crawlers): `/d/{n}` for daily #n and `/r/{id}` for results, each with its own `og:image` generated at the edge. Use the Next.js `ImageResponse`/`next/og` route if the site uses Next.
- Tags: `og:title`, `og:description`, `og:url`, `og:image` (**absolute https**), `og:image:secure_url`, `og:image:type`, `og:image:width=1200`, `og:image:height=630`, `og:site_name`, `og:locale=pt_BR`, `twitter:card=summary_large_image`. Put them early in `<head>`, once each.
- Image: **1200×630, ≤ 300 KB** (PNG-8 palette suits pixel art), ≥ 300 px wide. Keep the key art in the centre, because WhatsApp sometimes shows a small square crop.
- Caching: WhatsApp caches previews per URL with no documented TTL, sometimes for weeks. To change a preview, change the URL: content-hash the image URL `og.png?v=abc123` and use a new page URL per result. The Facebook Sharing Debugger can re-scrape Facebook's cache, but it does not reliably reset WhatsApp's.
- Text share: `https://wa.me/?text=` + `encodeURIComponent(text)`. Put the URL on its own last line so the preview attaches. Encode with `encodeURIComponent` (handles `+`, `%0A`).
- Status: sharing an image or MP4 file through the system sheet to WhatsApp offers "Meu status". The 1080×1920 card is the right asset. Status video ≤ 60 s (a 90 s limit was in Android beta in 2025).

Daily share text template:
```
Fato ou Fake #123 🇧🇷 4/5
🟩🟩🟥🟩🟩
🔥 6 dias seguidos
jogo.com.br/d/123
```

---

## 1. Instagram formats and safe zones (2025–2026)

**Story**: 1080×1920, 9:16. Instagram crops or letterboxes other ratios. Instagram does not publish official safe zones (community consensus).
- Older and organic guidance: keep ~250 px top and ~250–340 px bottom clear. Make Tech Easier quotes Meta's ad guidance as "approximately 14 % (250 px) at the top and 20 % (340 px) at the bottom". [MakeTechEasier](https://maketecheasier.com/instagram-story-reel-safe-zone), [Growthscribe 2026](https://growthscribe.com/instagram-story-size/), [Argil](https://argil.ai/blog/instagram-story-dimensions), [Moonb 2026](https://www.moonb.io/blog/instagram-story-specs)
- 2026 ad-industry guidance: Meta reportedly unified the Stories and Reels 9:16 safe zone in **March 2026**. Top 14 % (~270 px), sides 6 % (~65 px), bottom 20 % (Stories, ~380 px) to **35 % (Reels, ~670 px)**. Ads Manager shows it as a "Safe Zone Guardrail" overlay. These are third-party sources, not a Meta page. [Billo 2026](https://billo.app/blog/meta-ads-safe-zones), [Superscale, May 17 2026](https://superscale.ai/learn/meta-ad-sizes), [AdNabu](https://blog.adnabu.com/meta-ads/meta-safe-zones/), [House of Marketers](https://houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories-reels/)
- Story video: 60 s per segment since about late 2022; longer uploads are split or trimmed (sources disagree). [Kapwing](https://www.kapwing.com/resources/how-to-post-60-second-instagram-story/), [Descript](https://descript.com/blog/article/how-long-can-instagram-stories-be)

**Feed**: 4:5 **1080×1350** is the standard tall post. Since **late May 2025**, Instagram also shows **3:4 (1080×1440)** uncropped (Mosseri on Threads). 1:1 1080×1080 and landscape still work. [Social Media Today](https://www.socialmediatoday.com/news/instagram-adds-support-phone-camera-aspect-ratio-images/749205/), [Lindsey Gamble](https://www.lindseygamble.com/blog/instagram-now-supports-34-aspect-ratio-for-photos-and-carousel-posts)
- Profile grid became **3:4 tiles in January 2025**. 4:5 posts lose a little at the sides, and 9:16 Reel covers lose 240 px top and bottom (the crop is 1080×1440). [Hopper HQ](https://www.hopperhq.com/blog/instagram-reel-size/), [Hopper grid help](https://help.hopperhq.com/en/articles/10907941-instagram-s-vertical-grid), [Oktopost 2026](https://www.oktopost.com/blog/instagram-grid-size-guide/)

**Reels**: 1080×1920, 9:16, 30 fps recommended, minimum ~3 s. The **3-minute** limit became the norm from January 2025; some tools report uploads up to 15 min. File size is usually given as up to ~4 GB, though other figures (1 GB, 250 MB for ads) also circulate. Use MP4 (or MOV) with **H.264 + AAC**, and avoid HEVC for compatibility. Community sources only. [SocialPilot 2026](https://www.socialpilot.co/instagram-marketing/instagram-video-size), [Postfa.st](https://postfa.st/sizes/instagram/reels), [Fliki](https://fliki.ai/blog/instagram-reel-dimensions-and-size-guide), [Argil](https://argil.ai/blog/instagram-reel-size-e350f), [Postpone](https://help.postpone.app/platforms/instagram/media-limits)

**Images**: JPG or PNG. Instagram re-encodes everything to JPEG, so pixel art should be uploaded at 1080 wide (integer-scaled) to avoid Instagram's own resampling. No official image size cap was found; keep files well under 8 MB.

**Meta's "Sharing to Stories" API specs** (native apps only, but useful as a sanity check): background image ≥ **720×1280**, 9:16 or 9:18. Sticker PNG/JPG, recommended **640×480**. Background video up to **1080p, ≤ 20 s**, **< 50 MB** recommended. [Meta docs](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories), [Meta docs (new URL)](https://developers.facebook.com/documentation/instagram-platform/sharing-to-stories)

## 2. Getting content from a mobile web page into Instagram

### 2.1 Web Share API Level 2 (files) support (MDN browser-compat-data, fetched 2026-10-24)
Source: [mdn/browser-compat-data api/Navigator.json](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json), [MDN navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)

| Browser | `share()` | `share({files})` | `canShare()` |
|---|---|---|---|
| Chrome Android | 61 | **76** | 75 |
| Samsung Internet | yes | 11.0 | yes |
| Safari / iOS Safari | 12.1 | listed 14, but **WebKit says file sharing did not work on iOS 14.x. Treat iOS 15+ as the floor** ([WebKit bug 234187](https://bugs.webkit.org/show_bug.cgi?id=234187)) | 14 |
| iOS WKWebView (in-app browsers) | mirrors Safari | mirrors Safari | mirrors Safari |
| **Android WebView** | **not supported** ([crbug 40540400](https://crbug.com/40540400)) | no | no |
| Firefox Android | 79 (no files) | no | 96 |
| Chrome desktop | 128 (89–127 only Windows/ChromeOS) | 89 | 128 |

- Requirements: HTTPS, the `web-share` Permissions Policy (matters in iframes), and **transient activation**. A successful share consumes the activation (one share per tap). Safari can lose activation across an `await fetch` before `share()` ([WebKit bug 197779](https://bugs.webkit.org/show_bug.cgi?id=197779), [WebKit User Activation API, 2023](https://webkit.org/blog/13862/the-user-activation-api/), [MDN transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation)). Pre-render the file.
- Shareable file types include `.png`, `.jpg`, `.webp`, `.mp4`. Chromium blocks unlisted extensions. Chromium limits: `kMaxSharedFileCount = 10`, `kMaxSharedFileBytes = 50 MiB`; over the limit, the call fails with permission denied. [Chromium share_service_impl.h](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/webshare/share_service_impl.h), [share_service_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/webshare/share_service_impl.cc)
- Android in-app WebViews, including Instagram's, don't expose `navigator.share`. [B4X forum](https://www.b4x.com/android/forum/threads/web-share-api-not-support-in-webview.149006/), [OutSystems](https://www.outsystems.com/forge/component-overview/21053/share-o11). Blob downloads are also unreliable in Android WebView. [ProAndroidDev](https://proandroiddev.com/blob-downloads-not-working-in-android-web-view-heres-the-real-fix-243144a2a426)

### 2.2 Does Instagram appear in the share sheet for image/video files?
- **Android**: yes. Instagram registers share targets (Feed / Stories / Chats). Developers report sharing a 1080×1920 PNG via `navigator.share({files})` → Instagram → Stories "works reliably on Android with Chrome" (GitHub issue dated 2026-10-18). [armando-blog #109](https://github.com/armandomonteir-o/armando-blog/issues/109), [Sudolabs](https://sudolabs.com/insights/share-visual-content-from-web-to-social-media-without-api-or-sdk)
- **iOS**: Instagram's share extension appears. A Meta developer-community report says that sharing from a web page via Web Share on iOS offered **Reels, Feed and Direct**. Feed failed with a generic error while Reels worked; on Android, both worked. [Meta dev community thread](https://developers.secure.facebook.com/community/threads/1094504835445267/). Device-test the Story/Feed options on current iOS + Instagram versions. Fallback: Save to Photos → user opens Instagram.

### 2.3 Instagram in-app browser
- Android: a WebView-based container (some describe it as built on Custom Tabs) that is sandboxed from the system browser and injects its own JS. Its share button opens Instagram's own sheet. [u2l.ai](https://u2l.ai/blog/instagram-in-app-browser), [link.boo](https://link.boo/guides/instagram-in-app-browser)
- Escape hatches: on Android, an `intent://…#Intent;scheme=https;package=com.android.chrome;end` link. On iOS, `x-safari-https://` is reported to work on iOS 17+ but is unverified, so fall back to "⋯ → Open in browser". [Short.io](https://help.short.io/en/articles/12292046-how-to-use-mobile-targeting-to-escape-redirecting-links-to-in-app-browser), [Christian Tietze, updated Jun 2024](https://forum.christiantietze.de/posts/2023/05/safari-for-mac-url-scheme/)

### 2.4 `instagram-stories://share`: not usable from the web
- Since **January 2023**, a **Facebook App ID** is mandatory (`source_application=<AppID>`); without it Instagram shows "app doesn't support sharing to Stories". [Meta update blog, 2022-10-10](https://developers.facebook.com/blog/post/2022/10/10/introducing-important-update-to-Instagram-sharing-to-stories/), [Meta docs](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories)
- On iOS, the asset goes through `UIPasteboard` with Instagram-specific keys (`com.instagram.sharedSticker.backgroundImage` and others). On Android, it uses the `com.instagram.share.ADD_TO_STORY` intent with a **content:// URI** owned by the sending app. A web page can't write custom pasteboard types or grant content URIs, so this path needs a native or Capacitor wrapper. Capacitor users report the App ID error. [Ionic forum](https://forum.ionicframework.com/t/share-to-instagram-story/243146), [react-native-story-share](https://github.com/winecombr/react-native-story-share), [armando-blog #109](https://github.com/armandomonteir-o/armando-blog/issues/109)
- Link stickers can't be preset from outside Instagram; users add them by hand. That is why the URL goes in the art.
- `instagram://story-camera` (cited by marketing sources, unconfirmed) only opens the camera and can't pass an asset. At most, use it as an "Abrir Instagram" button after Save.

### 2.5 Fallbacks
- iOS: the share sheet's own "Save Image/Video" row is the cleanest. Without share, show `<img>` and the long-press hint (WKWebView and Safari offer "Add to Photos"). `<a download>` saves to Files, which is less useful.
- Android: `<a download>` in Chrome. In a WebView, show the `<img>` for long-press plus "Open in Chrome".
- Clipboard image (`navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`) lets iOS users paste a sticker in the Story editor. This is untested here; treat it as an experiment.

## 3. Recording gameplay clips in the browser

### 3.1 MediaRecorder + canvas.captureStream
- Support (MDN BCD): MediaRecorder on iOS Safari **14** (desktop 14.1) and Chrome 47. `captureStream` on Chrome 51 and Safari 11. [BCD MediaRecorder](https://github.com/mdn/browser-compat-data/blob/main/api/MediaRecorder.json)
- Safari enabled MediaRecorder by default in **iOS 14.3**, recording **MP4 / H.264 / AAC**. A canvas track is a valid input. [WebKit blog: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/), [addpipe demo table](https://addpipe.com/media-recorder-api-demo/)
- Safari **18.4** (released 2025-03-31) reportedly added WebM (VP8/VP9/Opus), fragmented MP4, HEVC and AV1. A 18.4-beta bug showed rotated WebM. Keep MP4 as the first choice on Safari. [Safari 18.4 notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes), [TestMu guide](https://www.testmuai.com/web-technologies/mediarecorder/), [WebKit bug 290223](https://auto-bugs.webkit.org/show_bug.cgi?id=290223)
- Chrome **126 (June 2024)** added **MP4** recording (H.264/VP9/AV1 + AAC/Opus). It accepts exact strings like `video/mp4;codecs=avc1,mp4a.40.2` but no wildcards. Chrome 136 added HEVC where the OS supports it. Earlier Chrome is WebM only. [Chrome blog](https://developer.chrome.com/blog/mediarecorder), [blink-dev H26x intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/YJ1QijNiHeM/m/3EhMjMVwAgAJ), [W3C log 2025-07](https://lists.w3.org/Archives/Public/public-webrtc-logs/2025Jul/0111.html), [Chromium muxers README](https://chromium.googlesource.com/chromium/src/media/+/refs/heads/main/muxers/README.md)
- Audio: `canvas.captureStream()` is video-only. Route the WebAudio master into `createMediaStreamDestination()` and add its track. A muted `<audio>` element produces a silent track; use a gain node instead. There are anecdotal reports that Safari behaves differently or produces empty or black output without an audio track, so always add one. [DEV: AudioContext + gain](https://dev.to/nareshipme/why-your-browser-video-export-has-no-audio-and-the-fix-using-audiocontext-gain-node-5b80), [DEV: captureStream is video-only](https://dev.to/robert_corn_2c1ef7ffc084b/til-canvascapturestream-is-video-only-heres-how-i-mixed-voiceover-music-into-a-1c2d), [WebKit bug 229611](https://bugs.webkit.org/show_bug.cgi?id=229611)
- Frames are only captured when the canvas repaints. `captureStream(0)` + `track.requestFrame()` gives manual control. Capture is expensive, and PixiJS users report low quality or freezes with MediaRecorder. [Chrome capture-stream blog](https://developer.chrome.com/blog/capture-stream), [MDN captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream), [html5gamedevs Pixi thread](https://html5gamedevs.com/topic/47405-record-video-from-pixi-canvas-with-ccapturejs)

### 3.2 WebCodecs + Mediabunny (successor to mp4-muxer by the same author)
- Mediabunny **1.62.1** (npm, published 2026-10-22). It has `CanvasSource` (you call `add(timestamp, duration)` per frame), `MediaStreamVideoTrackSource` / `MediaStreamAudioTrackSource` (live, auto-synced), `AudioBufferSource` (WebAudio buffers), `EncodedVideoPacketSource` / `EncodedAudioPacketSource` (bring your own `VideoEncoder` chunks, which is what a ring buffer needs), `canEncodeVideo`/`canEncodeAudio`/`getFirstEncodableVideoCodec`, `BufferTarget` (fine below 100 MB), `Mp4OutputFormat({fastStart})`, and backpressure through the promises `add()` returns. AAC can be polyfilled with `@mediabunny/aac-encoder` where WebCodecs lacks it. [mediabunny.dev](https://mediabunny.dev/), [Media sources guide](https://github.com/Vanilagy/mediabunny/blob/main/docs/guide/media-sources.md), [Writing media files](https://mediabunny.dev/guide/writing-media-files), [Supported codecs](https://github.com/Vanilagy/mediabunny/blob/main/docs/guide/supported-formats-and-codecs.md), [npm](https://www.npmjs.com/package/mediabunny)
- WebCodecs support (MDN BCD + caniuse): `VideoEncoder` on Chrome/Android 94 and Safari **16.4** (caniuse: partial 16.4–18.7, full **26.0+**). `AudioEncoder` on Chrome 94 and Safari **26**. Firefox Android: none. [caniuse WebCodecs](https://caniuse.com/webcodecs), [BCD VideoEncoder](https://github.com/mdn/browser-compat-data/blob/main/api/VideoEncoder.json), [BCD AudioEncoder](https://github.com/mdn/browser-compat-data/blob/main/api/AudioEncoder.json)
- The `canvas-record` library wraps WebCodecs + Mediabunny for canvases and is a reference implementation. [canvas-record WebCodecsEncoder](https://app.unpkg.com/canvas-record@5.5.1/files/src/encoders/WebCodecsEncoder.js)

### 3.3 Performance tips
- Record at 30 fps, not 60. Use 720×1280 for live capture and 1080×1920 for offline renders. Use H.264 with `hardwareAcceleration: 'prefer-hardware'`. Use about 8 Mbps at 1080p, because pixel-art edges need bitrate and Instagram re-encodes anyway.
- Respect backpressure (`await source.add()`), and check `VideoEncoder.encodeQueueSize` in the live path, dropping frames rather than stalling the game.
- Prefer offline deterministic rendering for scripted moments: the device's frame rate doesn't matter and nothing records during play.
- For WebGL capture, grab the frame right after `render()` or use `preserveDrawingBuffer` only on the export renderer, since it costs performance.
- Stop the ring buffer on `visibilitychange` → hidden, and on low-end devices. Keep everything under the repo's `useCanvasBudget`.

### 3.4 "Last 6 seconds" ring buffer
- WebCodecs: a keyframe every 1 s. Keep a deque of GOPs and drop GOPs older than 7 s. On trigger, cut at the first keyframe ≥ T − 6 s, subtract the base timestamp, feed `EncodedVideoPacketSource` (+ audio packets) → MP4. Cost ≈ 4 MB RAM.
- MediaRecorder can't do this cleanly, because later chunks lack the init segment. The options are two staggered recorders restarted every N seconds, or (recommended) starting the recorder when the finale begins.
- Best for this game: **state replay**. Log seed + inputs (or per-frame entity snapshots) for the last 6 s, then re-render offline at 1080×1920 through tier 1. Quality is best and live cost is zero.

## 4. When and how to prompt sharing

Evidence:
- **Wordle**: Wardle built the copyable, spoiler-free emoji grid in mid-December 2021 after seeing New Zealand players type it by hand. The game had about 90 daily players (Nov 2021), passed 300,000 by Jan 3 2022 (per the NYT, via Know Your Meme), and reached ~2 M within weeks (TechCrunch) and ~10 M daily by Feb 2022. The lesson: a **daily, identical-for-everyone puzzle + a compact, spoiler-free text artifact** that pastes into group chats, which is WhatsApp in Brazil. [Boston.com/AP, 2022-01-04](https://www.boston.com/news/national-news/2022/01/04/he-made-wordle-for-his-partner-now-its-an-online-hit/), [Know Your Meme](https://knowyourmeme.com/memes/subcultures/wordle), [TechCrunch](https://techcrunch.com/?p=2256733)
- **Spotify Wrapped 2025**: 200 M engaged users in 24 h (2024 took 62 h) and **500 M+ shares on day one, +41 % YoY**, counting native shares, screenshots and downloads. The lesson: **personal stat + pre-rendered 9:16 story cards + a share button on every card**. This maps to the tax-savings result. [TechCrunch, 2025-12-04](https://techcrunch.com/2025/12/04/spotify-says-wrapped-2025-is-its-biggest-yet-with-200m-users-in-its-first-day), [Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase), [IBTimes](https://www.ibtimes.com/record-breaking-spotify-wrapped-2025-sees-200m-engage-500m-shares-day-3792059)
- **Duolingo**: streak milestones come with a share card for save/post/share, and "thousands share streaks every day". Learners with a Friend Streak are 22 % more likely to finish their daily lesson. The lesson: **milestone celebration → share card**, plus social commitment. This maps to daily streaks and the "I will vote" commitment. [Duolingo blog: streak milestone design](https://blog.duolingo.com/streak-milestone-design-animation), [Duolingo: how the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit), [Duolingo friends](https://blog.duolingo.com/friends-social-features/)
- **Strava**: a "Stats Sticker" opens Instagram Stories with a ready sticker over the user's own photo, or saves it to the camera roll. The lesson: **a sticker-like asset the user can personalise**. Strava gets the auto-sticker through the native Stories API, which the web can't use; we can only offer a transparent PNG via Save. [remove.bg guide](https://www.remove.bg/b/strava-overlay-for-instagram-stories-and-posts)
- **Balatro**: 8-character seeds are a shareable "currency", so a code lets others replay your run. The analogue for us is daily number #n. [GameSkinny](https://www.gameskinny.com/tips/top-best-balatro-seeds-to-win-games-faster/), [speedrun.com forum](https://www.speedrun.com/ru-RU/Balatro/forums/8zl5g)
- **Peak-end rule**: in casual games, players remember the peak and the end. Design the victory as the peak, end on it, and don't follow a peak with admin friction like modals. [Gutwin et al., CHI 2016 (PDF)](https://www.cs.mcgill.ca/~jeromew/data/COMP766/CHI2016/p5608-gutwin.pdf), [Game design peak-end audit](https://www.agensi.io/skills/game-design-peak-end-audit)

Patterns applied (section 0.6): prompt only at peaks, non-blocking panel, preview of the exact asset, separate Share and Save, text-first for daily, per-surface attribution, no prompt on failure or every level, and a reduced-motion static preview.

## 5. WhatsApp

- **Link preview**: no official WhatsApp spec was found. Community consensus: `og:image` must be an absolute HTTPS URL, **≤ ~300 KB** (larger images often get no preview; one Shopify answer says 600 KB), ≥ 300 px wide, 1200×630 is the de facto size, and add `og:image:secure_url`. Avoid duplicate tags. Crawlers don't run JS, so a React SPA must server-render tags per URL. [Wix og:image](https://support.wix.com/en/article/wix-editor-recommended-ogimage-size), [WordPress thread](https://wordpress.org/support/?p=13296439), [Flarum](https://discuss.flarum.org/d/39207/5), [Shopify 1](https://community.shopify.com/t/no-preview-picture-when-sharing-the-link-of-website/575088), [Shopify 2](https://community.shopify.com/t/shared-rich-link-on-whatsapp-doesnt-show-og-image/221251), [DEV: link preview fixes](https://dev.to/ctrlzed/link-preview-not-showing-fix-it-on-whatsapp-x-linkedin-1l25), [htmlcsstoimage](https://htmlcsstoimage.com/features/og-images-for-whatsapp)
- **Caching**: WhatsApp keeps cached previews for a long time, sometimes weeks. Bust the cache with new URLs and versioned image URLs. [DEV](https://dev.to/ctrlzed/link-preview-not-showing-fix-it-on-whatsapp-x-linkedin-1l25)
- **wa.me**: `https://wa.me/<number>?text=<urlencoded>`. Without a number, it opens the contact picker and pre-fills the editable text. Encode with `encodeURIComponent` (`%20`, `%0A`, `%2B`). [Unipile guide](https://www.unipile.com/br/?p=275019), [Dotdigital](https://support.dotdigital.com/en/articles/11331301-click-to-chat-for-whatsapp). Official FAQ: [faq.whatsapp.com/5913398998672934](https://faq.whatsapp.com/5913398998672934) (not fetchable here).
- **Status**: there is no web API. Share an image or video file via the system sheet → WhatsApp → "My status". Video Status went from 30 s to **60 s** (Android beta in March 2024, then rolled out), and a 90 s limit was tested in beta 2.25.12.9 (2025). [Android Authority](https://androidauthority.com/whatsapp-video-status-3427340), [SamMobile, 2024-03-20](https://www.sammobile.com/news/whatsapp-soon-share-longer-videos-status-updates/), [Green-API 2025](https://green-api.com/blog/2025/whatsapp-increases-status-length-to-90-seconds/)
- **WhatsApp in-app browser (news this week)**: on **2026-10-19/21**, WABetaInfo found an optional "In-app browser" for all chat links in an iOS TestFlight build. It is still in development, not testable, and controlled by a setting under Chats. A narrower business-link version was tested on Android first. Today, links open in the default browser, but this may change, which is one more reason for feature detection over UA rules. [WABetaInfo](https://wabetainfo.com/whatsapp-is-testing-an-in-app-browser-for-chats-on-ios/), [MacRumors 2026-10-21](https://www.macrumors.com/2026/10/21/whatsapp-developing-browser-for-chat-links/), [9to5Mac 2026-10-19](https://9to5mac.com/2026/10/19/whatsapp-may-soon-let-iphone-users-open-any-link-in-an-in-app-browser/), [onlinemarketing.de](https://onlinemarketing.de/?p=392729)

## 6. Open questions to verify on devices before shipping

1. iOS 18/26 Safari: does `navigator.share({files:[png]})` → Instagram offer **Story**, and does Feed still error? Same for MP4.
2. Instagram iOS IAB: is `navigator.canShare({files})` true?
3. Safari MediaRecorder with a canvas track + WebAudio track at 1080×1920: is the output non-empty and A/V-synced? Run it only as tier 3.
4. Does `canEncodeAudio('aac')` hold on target Android Chrome builds? If not, ship the AAC polyfill.
5. WhatsApp preview on Android and iOS for a 1200×630 PNG-8 under 300 KB, plus how a new `/r/{id}` URL appears in chats.
6. Whether the iOS clipboard-sticker flow (copying a transparent PNG and pasting it into the Story editor) is worth exposing.
7. Product/legal: the "I will vote" card and tax content might be read as political content (Brazilian electoral rules apply to boosting and campaign periods). Get a review before paid amplification. This is outside this guide's scope.
