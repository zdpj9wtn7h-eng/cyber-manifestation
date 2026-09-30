# CYBER MANIFESTATION™

把「龍鳳寶寶」掛畫的許願邏輯，搬到手機桌布上。

Upload two things you REALLY REALLY want. The machine picks one of the four artworks, then
stamps that same image over and over on top of it — one shared angle per wallpaper, a pile that
overlaps itself, marching in a chain — and gives you a wallpaper at the artwork's own ratio.
Every stamp is then *printed* rather than pasted: it is screened into a colour halftone — the
four rotated dot screens of cyan, magenta, yellow and black — and finished with a little grain,
so two completely unrelated pictures end up looking like they came off the same cheap press
without losing their colour.

**The user provides the desire. The website decides what the manifestation looks like.**

The finished image contains exactly two things: **one of the four background artworks** and
**repeated copies of the two uploaded images**. No clip art, no flowers or hearts, no stickers,
no text, no watermark, no film grain.

Three rules are enforced by the generator:

- **The top quarter of the screen stays empty** — that is where the phone's clock, date and
  notifications live.
- **At most 4 copies of one image.**
- **One image, one treatment** — every copy shares the same angle, the same distortion and the
  same orientation (nothing is mirrored or turned). Only the size (±7 %) and the exact spacing
  wobble a little, so the pile looks stacked by a person rather than by a photocopier.
- **Nothing arrives as a photo** — the uploads are halftoned and grained, so they sit inside the
  artwork as print instead of shouting over it. The colour stays; only the medium changes.

---

## 跑起來 · Run it locally

A normal Vite + React + TypeScript app. Dependencies are already installed in `node_modules/`,
so you only need Node.js on your PATH once.

```sh
cd ~/Desktop/cyber-manifestation

# 1) development server (hot reload) → http://localhost:5173
./node_modules/.bin/vite dev

# 2) or build + preview the production bundle → http://localhost:4173
./node_modules/.bin/vite build && ./node_modules/.bin/vite preview
```

**If the terminal says `node: command not found`**, this Mac has no Node.js on the PATH yet.
Either install it (`brew install node`, or the installer at <https://nodejs.org>) — or use the
Node that ships with Codex:

```sh
export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

There is also a double-clickable **`start.command`** in this folder that finds a usable Node
automatically, starts the dev server and opens the browser.

---

## 四張背景圖放這裡 · Where the four artworks go

```
public/templates/template-1.png     rainbow gradient + blue orbit + stars      (chaotic, diagonal)
public/templates/template-2.png     blue-noise night + glowing lotus           (dreamy, centred)
public/templates/template-3.png     cyan sky + clouds + green ground           (floating, vertical)
public/templates/template-4.png     red/pink gradient + lime & blue shapes     (commercial, oversized)
```

They are already in place. To swap them, just replace those four files with the same names —
no code changes needed. Keep them portrait (the current files are 402 × 874).

**The exported image always uses the artwork's own aspect ratio.** The canvas is sized from
whatever PNG is picked (for the 402 × 874 artworks that means **1080 × 2348**), so the artwork
is drawn edge to edge — never cropped, never stretched, and with no letterbox bands.

If a file is missing, the site still works: that template is left out of the random pool, a
plain gradient stand-in is used instead, and the missing paths are listed in the status bar and
on the result screen.

---

## 流程 · The flow

1. **HOME** — drop / click / paste two images into `THING I WANT #1` and `#2`.
   PNG, JPG, JPEG, WEBP, GIF, AVIF. Transparency is detected and preserved; a JPG is used
   exactly as it is (no background removal).
2. **✨ MANIFEST ✨** — unlocks only when both boxes are full.
3. **Loading** — a short fake `MANIFESTING.EXE` window with an ASCII progress bar.
4. **YOUR MANIFESTATION** — the wallpaper plus a report of exactly what the machine decided.
   - `✨ MANIFEST AGAIN` — new roll of the dice, same two images.
   - `⤓ DOWNLOAD PNG` — exports the real PNG at the artwork's ratio (⌘S works too).
   - `← START OVER` — back to the home screen, uploads kept.

Everything is client-side. No upload, no server, no account, no network call.

---

## 生成邏輯 · How the generation works

`src/generation/` is the machine; `src/components/` is only the shop window.

1. **Seed** — every generation starts from one random 32-bit seed, so a run is reproducible
   (`mulberry32` in `random.ts`).
2. **Template** — one of the four artworks is picked at random, and the output canvas is sized
   from that artwork (`plan.ts`).
3. **Repeat pattern** — one of four arrangements, weighted per template (`compositions.ts`):

   | | pattern | what it does |
   |---|---|---|
   | A | `CENTERED STACK` | 1–2 big stamps, nearly on top of each other |
   | B | `CASCADE REPEAT` | 3–4 stamps marching diagonally, each one overlapping the last — the reference pile |
   | C | `STAMP GRID` | a 2 × 2 block of stamps, slightly overlapping |
   | D | `COLUMN REPEAT` | 3–4 stamps marching straight down, or across |

4. **Lanes** — the two desires never fight over the same space. Either *side by side* (one chain
   upper-left, the other lower-right — the reference layout) or *stacked* (one chain in the
   upper band, one in the lower band), and which desire takes which lane is part of the roll.
5. **One shared lean** — the generation picks a single tilt, and every stamp of both piles uses
   exactly that angle (mirrored when a pile marches to the left). Grid patterns stay straight.
   Each pile also gets one shared distortion (stretch ×0.96–1.06), so no single copy looks
   melted compared with its siblings.
6. **The pile** — the step between stamps is measured *in stamp sizes* (about 0.6 of the stamp's
   own height for a cascade), so the stamps always overlap the same way no matter how wide or
   tall the uploaded image is. Stamp size and spacing carry a small wobble; the stamp itself is
   large — a cascade stamp is about 46 % of the canvas width.
7. **The clock zone** — the pile is fitted into `y = 0.26 … 0.935` of the canvas, the spacing is
   compressed if the pile would not fit, and nothing is ever drawn above that line.
8. **Colour halftone** — every stamp is screened before it is placed. The picture is averaged
   into a grid of cells (the screen is 4–12 px coarse, rolled per generation), converted to
   C/M/Y/K, and each ink is drawn as one path of dots at the classic screen angles (cyan 15°,
   magenta 75°, yellow 0°, black 45°), multiplied onto white paper. A hair of misregistration
   between the screens keeps it looking like a press that needed servicing. The screened result
   is masked back to the picture's own alpha, so a transparent PNG stays transparent, then
   finished with a light grain. Halftones are cached per uploaded picture, so the second and
   third stamp of the same desire cost nothing.
9. **Render** — background artwork (cover-fit, so it fills the canvas at its own ratio), then
   the stamps in order so later ones overlap earlier ones like a shuffled deck; exported with
   `toBlob` as a PNG.

Each template carries its own behaviour, so the same desire looks different on each artwork:
template 2 is calm and centred, template 1 chaotic and diagonal, template 3 spreads copies
vertically into the sky, template 4 uses big overlapping shapes. All of it lives in the
`TEMPLATES` table at the top of `src/generation/templates.ts`.

---

## 檔案 · Files

```
cyber-manifestation/
├── index.html                    the document shell
├── public/templates/             the four background artworks  ← drop replacements here
├── start.command                 double-click launcher (finds Node, starts the dev server)
└── src/
    ├── App.tsx                   state machine: home → loading → result, uploads, downloads
    ├── main.tsx                  React entry point
    ├── components/
    │   ├── UploadPanel.tsx        the machine box: two slots + the big button
    │   ├── UploadSlot.tsx         drag & drop, file picker, preview, replace / remove
    │   ├── LoadingScreen.tsx      MANIFESTING.EXE + fake ASCII progress
    │   ├── ResultScreen.tsx       phone frame, buttons, render effect
    │   ├── ManifestReport.tsx     what the machine decided (template, rule set, seed…)
    │   ├── Ticker.tsx             the scrolling top banner
    │   ├── VisitorCounter.tsx     fake 2003 hit counter
    │   ├── Webring.tsx            dead webring links (they toast you back)
    │   └── Footer.tsx             badges + the concept note
    ├── hooks/                    useTemplateShelf (loads the 4 PNGs), useToast
    ├── generation/
    │   ├── types.ts              the vocabulary of a "plan"
    │   ├── random.ts             seeded RNG + bounded helpers
    │   ├── templates.ts          ← the four artworks and all their behaviour knobs
    │   ├── compositions.ts       the four rule sets, anchors, transforms
    │   ├── plan.ts               decides everything before painting (incl. output ratio)
    │   ├── render.ts             paints the plan, exports the PNG
    │   └── imageLoading.ts       decode / downscale uploads, load the templates
    └── styles/                   base.css, home.css, loading.css, result.css
```

**Tuning knobs**: copy counts and scale live in `compositions.ts`; how loud or calm each artwork
is (glow-free, just layout) lives in `templates.ts`.

---

## 作品說明 · Concept

龍鳳寶寶掛畫 is a very ordinary Chinese internet picture: a chubby baby, toys, flowers, hearts
and extremely auspicious ornaments, hung in a bedroom as a wish for a wedding, a child, a
family. That logic is exactly what "manifestation" does today — first you make the future
visible, then you live inside the picture.

So what do we want to manifest now? This machine moves that visual language onto the screen we
actually stare at, and hands the arranging over to an algorithm. You bring the desire; the
website decides how many copies of it you get, at what size, at what angle. Repetition is the
point: if you want money, the wallpaper may contain money, money, money, money.

Built for a course on Cyber-Shanzhai Aesthetics / Post-Internet Media Art.
