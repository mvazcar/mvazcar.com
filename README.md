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

## Hidden Kaiju dark theme

The homepage and 404 page load `assets/theme.css`. The normal light appearance
stays the same; a device or browser that requests dark mode reveals a pure black
background (`#000000`) and turquoise headings and links (`#10FFDC`), inspired by
the Kaiju No. 8 credits. Body text is a soft mint-white (`#D1E5E1`), and the
coauthor line uses a muted mint (`#91B6AF`).

The theme follows `prefers-color-scheme` automatically, including preference
changes while the page is open. There is no visible switch or JavaScript, and
printed pages use the light palette. The separate labor dashboard has its own
stylesheet and is unchanged.

Windows, macOS, and mobile system dark modes work when the browser passes that
preference to the page. A browser's explicit website appearance preference can
override the OS setting; a dark browser toolbar alone does not guarantee dark
web content.

Dark-mode extensions have no universal detection API. A best-effort CSS hook
also recognizes Dark Reader's Dynamic-mode `data-darkreader-scheme="dark"`
marker when the OS is light. Dark Reader may still recolor the page, and its
automatic dark-site detection can remove that marker. Filter modes and other
extensions are not guaranteed to reveal or preserve the custom palette.
For the exact palette, use the system/browser dark preference and exclude the
site from extension recoloring (or use the extension's native-dark-site
detection). The site does not disable extensions or change visitors' settings.

To preview it, run the local server above and switch your device/browser to dark
mode, or emulate `prefers-color-scheme: dark` in the browser's developer tools.
Switch back to light mode to compare. Both HTML pages also declare matching
light/dark browser toolbar colors for browsers that support `theme-color`.

To publish, commit `index.html`, `404.html`, and `assets/theme.css` and follow the
publishing flow above. If regenerating the site with Hugo, carry the stylesheet
link and theme-color metadata into the source head template, remove the old
forced-light override, and retain the variable-based byline and image-border
colors so the generated files preserve the theme.
