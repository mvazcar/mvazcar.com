# Miguel Vázquez-Carrero — personal website

This repository contains the deployable static files for
[mvazcar.com](https://mvazcar.com/). The site is based on
[Hugo Bear Blog](https://github.com/janraasch/hugo-bearblog).

## Hosting, deployment, and domain

| Responsibility | Service | Configuration |
| --- | --- | --- |
| Repository | GitHub | [`mvazcar/mvazcar.com`](https://github.com/mvazcar/mvazcar.com) |
| Production hosting | GitHub Pages | Serves the static files in this repository |
| Deployment | GitHub Pages | Automatically publishes the root of `main` after every push |
| Public domain | `mvazcar.com` | Configured as the GitHub Pages custom domain through `CNAME` |
| DNS provider | Cloudflare | Authoritative DNS only; Cloudflare does not host the website |

**Netlify is not used for production hosting or deployment.**

The default GitHub Pages URL is
<https://mvazcar.github.io/mvazcar.com/>; while the custom domain is configured,
GitHub redirects it to `mvazcar.com`.

## DNS configuration

Cloudflare routes the domain to GitHub Pages using DNS-only records:

- `mvazcar.com` → GitHub Pages A records `185.199.108.153` through
  `185.199.111.153`
- `www.mvazcar.com` → CNAME `mvazcar.github.io`
- HTTPS certificates and redirects are managed by GitHub Pages

## Publishing flow

1. Update the static site files in the repository root.
2. Commit the changes.
3. Push `main` to GitHub.
4. GitHub Pages automatically deploys the new commit to `mvazcar.com`.

No separate Netlify deployment or build command is required.

## Local preview

From the repository root:

```sh
python -m http.server 1314
```

Then open <http://localhost:1314/>.

This repository contains the generated static output, not the local Hugo source
project. Third-party licensing is documented in `THIRD_PARTY_LICENSES.md`.

## Light and dark mode

The homepage and 404 page follow the browser's light or dark preference. Both
palettes live in `assets/theme.css`: white by default, and Material Design's
dark theme (surface `#121212`) when the browser asks for dark. There is
no toggle or saved preference. Printing always uses the light palette.

Dark Reader gets the same dark theme, even while the browser is light. When
the extension marks the page as dark (`data-darkreader-scheme="dark"` on
`<html>`), a short inline script in each page's `<head>` sets
`data-theme="dark"`, switches the plot to its dark version, and adds
`<meta name="darkreader-lock">`, which makes Dark Reader remove its own
recolouring. Only Dark Reader's default Dynamic mode marks the page this way.

The Teaching plot has a transparent version for each mode. A `<picture>`
element in `index.html` shows `assets/indifference-curves-dark.png` in dark
mode and `assets/indifference-curves.png` otherwise. Both are made from the
Day 3 slide rendered on white:

```sh
python scripts/make_plot_variants.py
```

The script needs NumPy and Pillow. It overwrites `indifference-curves.png`
with the transparent light version, which looks identical on white, and
writes the dark version next to it with lighter inks of the same hues. To
use a new slide image, copy the white render over `indifference-curves.png`
and rerun it; rerunning on its own output gives the same files.

If rebuilding from Hugo, carry the shared stylesheet link, the `light dark`
color-scheme and theme-color metadata, the Dark Reader script, and the
`<picture>` element into the source templates.
