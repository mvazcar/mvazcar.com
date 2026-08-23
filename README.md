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
