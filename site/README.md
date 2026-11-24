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

Publish the `site/` folder with GitHub Pages (branch → `/site`), Netlify,
Cloudflare Pages, or any bucket. `.nojekyll` is already here so Pages serves
the folder verbatim.

## Things to update

- **Download links** — they point at `github.com/geohot0199/Cord` releases.
  Change the four URLs in the `#download` section and the pricing cards if the
  release repo moves.
- **Feedback address** — `main.js` and the footer use
  `pranavfromthegrowth@gmail.com`. Swap it for a support inbox if you prefer.
- **Copy that ships vs. copy that is coming** — anything not built yet is
  labelled "Where it's heading". Keep that honest as features land.

The feedback form has no backend: it opens the visitor's mail app with the note
filled in, or copies it to the clipboard. If you want it to POST instead, point
`form.addEventListener("submit", …)` in `main.js` at your endpoint.
