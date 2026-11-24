# Nūs — marketing site

The public site for Nūs: a single static page, no build step, no dependencies,
no trackers. It mirrors the pitch of the product in this repo — the Companion
on Windows and Mac beta, the voice actions, the Knot's pointing and the
semester map — and links straight to the release assets.

## Preview locally

```sh
cd site
python3 -m http.server 4173
# open http://localhost:4173
```

Any static file server works; the page is plain HTML, CSS and one script.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole page: hero, how it helps, the way in, pricing, setup, now/next, questions, download + feedback |
| `styles.css` | Design system: ink/paper/blue palette from the app, serif display type, responsive layout |
| `main.js` | Sticky header, mobile nav, scroll reveals, the animated Knot demo, setup tabs and steps, FAQ search/filter, feedback form |
| `assets/bust.webp`, `assets/bust.jpg` | The statue mark from `renderer/assets/nus-statue-mark.png`, resized for the web |
| `assets/favicon.png` | 128 px favicon from the same mark |

## Deploy

Two supported shapes, both already in the repo:

1. **GitHub Actions (preferred).** Settings → Pages → Source = **GitHub
   Actions**. Then `.github/workflows/pages.yml` publishes `site/` as the site
   root on every push to `main` that touches `site/`, and smoke-tests the
   published URL (it fails the run if the URL doesn't return the site).
2. **Branch publishing (what this repo is set to today).** Settings → Pages →
   Source = **Deploy from a branch**, `main` / `/`. With that setting Pages
   serves the repository root, so the tiny root `index.html` forwards to
   `./site/` and carries the query string along (Instagram `?utm_source=…` and
   `?aid=…` labels survive). Never delete that file while this setting is in
   use — it is the only thing preventing a 404.

Other hosts (Netlify, Cloudflare Pages, any bucket) should publish `site/`
directly; `.nojekyll` is included so Pages serves the folder verbatim.

### Checking it is actually up

The URL is only healthy if it answers 200 **and** contains the word NŪS:

```sh
curl -s -o /tmp/i.html -w '%{http_code}\n' https://geohot0199.github.io/NUS/ && grep -c NŪS /tmp/i.html
```

A 404 here while `main` has `index.html` means the Pages source is wrong
(root must be the branch the file lives on) or the last Pages build failed —
check Actions → **pages build and deployment**.

## Things to update

- **Download links** — they point at `github.com/geohot0199/Cord` releases.
  Change the four URLs in the `#download` section and the pricing cards if the
  release repo moves.
- **Feedback address** — `main.js` and the footer use
  `pranavfromthegrowth@gmail.com`. Swap it for a support inbox if you prefer.
- **Copy that ships vs. copy that is coming** — anything not built yet is
  labelled "Where it's heading". Keep that honest as features land.
- **Free caps and Pro** — the pricing section, the FAQ and the fine print state
  the free-plan caps (3 syllabus imports, 10 questions/day, 1 connected account,
  1 automation rule, 20 Companion minutes/day, 7 days of history, 512 MB) and
  that a BYO key does not lift them, since `src/limits.js` gates on
  `license.isPro` alone. `src/limits.js` is the source of truth: if the numbers
  change there, change them in `site/index.html` (free plan card, "What are the
  free limits?" answer, fine print).

The feedback form has no backend: it opens the visitor's mail app with the note
filled in, or copies it to the clipboard. If you want it to POST instead, point
`form.addEventListener("submit", …)` in `main.js` at your endpoint.
