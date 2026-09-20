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

## Hidden Kaiju edition

The main homepage and 404 page stay light, regardless of the device's dark-mode
preference. Only [mvazcar.com/kaijuu8/](https://mvazcar.com/kaijuu8/) opts into the
Kaiju No. 8 palette: pure black (`#000000`), turquoise headings and links
(`#10FFDC`), soft mint-white body text (`#D1E5E1`), and muted mint secondary text
(`#91B6AF`). Both editions use `assets/theme.css`.

The hidden edition has the same content as the homepage. Its Home, Research,
and Teaching links stay under `/kaijuu8/`. Opening `/` always returns to the
normal white edition; there is no saved preference or automatic dark-mode
activation. Printing uses the light palette. Browser extensions can still
apply their own appearance changes, but do not activate this site's theme.

The hidden URL is deliberately absent from the main navigation and sitemap.
It has a canonical link to the homepage and a noindex directive to avoid a
second search result for the same content.

After editing `index.html`, regenerate the hidden edition before publishing:

```sh
node scripts/build-kaijuu8.mjs
```

Commit both HTML pages along with any stylesheet changes. GitHub Pages serves
`kaijuu8/index.html` directly; it does not need a Node runtime. If rebuilding
from Hugo, carry the shared stylesheet link and light-only metadata into the
source templates, then regenerate the hidden edition from the new homepage.
