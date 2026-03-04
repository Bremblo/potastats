# POTA Stats // GoldSrc Edition

A server-side rendered [Parks on the Air](https://pota.app) stats widget themed after the Half-Life GoldSource engine UI. Runs on Cloudflare Workers. Embeddable via iframe on QRZ pages.

Inspired by [WD4DAN's POTA Stats widget](https://pota-stats.wd4dan.net/?help).

## How It Works

Unlike the previous client-side version, this runs as a **Cloudflare Worker**. When someone loads `?call=KF8CNK`:

1. The Worker receives the request
2. It fetches your stats from `api.pota.app` **server-side**
3. It returns fully rendered HTML — no client-side JavaScript needed
4. Works inside any iframe, including QRZ.com (no CORS issues)

## Embedding on QRZ

1. Go to your QRZ page → Edit Biography
2. Click the **Source** button in the editor toolbar
3. Paste (replace `YOURCALL` and `YOUR-WORKER-URL`):

```html
<p><iframe src="https://YOUR-WORKER-URL/?call=YOURCALL" height="1200" width="960" frameborder="0" scrolling="no"></iframe></p>
```

Adjust `height` as needed. Add `&options=condensed` for a shorter version.

## URL Parameters

| Param | Description | Example |
|-------|-------------|---------|
| `call` | Callsign (required) | `?call=KF8CNK` |
| `options` | Display options (comma-separated) | `&options=condensed` |
| `help` | Show embedding guide | `?help` |

**Options:** `condensed`, `hunteronly`, `activatoronly` — combinable.

## Deploy Your Own

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Node.js](https://nodejs.org/) installed locally

### Steps

```bash
# Clone the repo
git clone https://github.com/Bremblo/potastats.git
cd potastats

# Install wrangler
npm install

# Login to Cloudflare
npx wrangler login

# Test locally
npm run dev

# Deploy
npm run deploy
```

After deploying, Wrangler will give you a URL like `potastats.YOUR-SUBDOMAIN.workers.dev`. That's your widget URL.

### Custom Domain (Optional)

To use a custom domain like `potastats.conorschall.com`:

1. Add your domain to Cloudflare DNS
2. Uncomment and edit the `routes` section in `wrangler.toml`
3. Redeploy with `npm run deploy`

### Configuration

Edit the `WIDGET_HOST` constant at the top of `src/index.js` to match your final URL. This only affects the help page embed snippets.

## Project Structure

```
potastats/
├── src/
│   └── index.js        # Cloudflare Worker — all logic + HTML template
├── wrangler.toml        # Worker config
├── package.json
└── README.md
```

The entire widget is a single `src/index.js` file. No build step, no bundler, no frameworks.

## API Endpoints Used

- `GET https://api.pota.app/stats/user/{CALLSIGN}` — summary stats (activator + hunter)
- `GET https://api.pota.app/profile/activations/{CALLSIGN}` — recent activations
- `GET https://api.pota.app/profile/hunter/qsos/{CALLSIGN}` — recent hunter QSOs

The POTA API isn't formally documented, so the worker probes multiple endpoint patterns and uses whichever returns data.

## License

MIT

73 de Conor, KF8CNK
