# POTA Stats // GoldSrc Edition

A self-hosted, open-source [Parks on the Air](https://pota.app) stats widget themed after the Half-Life GoldSource engine UI. Embeddable on QRZ pages via iframe.

Inspired by [WD4DAN's POTA Stats widget](https://pota-stats.wd4dan.net/?help).

![GoldSrc Theme](https://img.shields.io/badge/theme-GoldSource-orange) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Single HTML file** — no build tools, no dependencies, no server-side code
- **Live data** from `api.pota.app` (client-side fetch, nothing stored)
- **GoldSource engine aesthetic** — scanlines, beveled panels, amber/green HUD text, lambda branding
- **QRZ-embeddable** via iframe
- **URL parameters** for callsign, display options (condensed, hunter-only, activator-only)
- **Demo mode** for testing without hitting the API

## Deployment

Drop `index.html` on any static host. That's it.

```
bremblo.github.io/potastats/index.html
```

### Quick options

| Host | How |
|------|-----|
| **Apache/Nginx** | Copy `index.html` into your web root |
| **GitHub Pages** | Push to a repo, enable Pages |
| **Cloudflare Pages** | Connect repo or drag-and-drop |
| **Netlify** | Drag the folder into the dashboard |

### Configuration

Edit the `WIDGET_HOST` variable near the top of the `<script>` block to match your domain:

```javascript
const WIDGET_HOST = 'bremblo.github.io/potastats';
```

This controls the links shown in the footer and help page.

## Usage

### URL Parameters

| Param | Description | Example |
|-------|-------------|---------|
| `call` | Callsign to look up (required) | `?call=W1AW` |
| `options` | Comma-separated display options | `&options=condensed` |
| `help` | Show the help/embedding guide | `?help` |
| `demo` | Show demo data (no API call) | `?demo` |

### Display Options

- `condensed` — Compact layout, fewer details
- `hunteronly` — Show only hunter stats
- `activatoronly` — Show only activator stats

Combine them: `?call=W1AW&options=activatoronly,condensed`

## Embedding on QRZ

1. Go to your QRZ page → Edit Biography
2. Click the **Source** button in the editor toolbar
3. Paste one of these snippets (replace `YOURCALL`):

**Normal:**
```html
<p><iframe src="https://bremblo.github.io/potastats/?call=YOURCALL" height="600" width="960" frameborder="0" scrolling="no"></iframe></p>
```

**Condensed:**
```html
<p><iframe src="https://bremblo.github.io/potastats/?call=YOURCALL&options=condensed" height="320" width="960" frameborder="0" scrolling="no"></iframe></p>
```

You may need to adjust `height` depending on your data and layout.

## API

This widget calls the public POTA API endpoint:

```
GET https://api.pota.app/stats/user/{CALLSIGN}
```

No authentication required. No data is stored or proxied — the request goes directly from the visitor's browser to `api.pota.app`.

The widget also attempts to fetch awards from:

```
GET https://api.pota.app/profile/awards/{CALLSIGN}
```

If this endpoint doesn't exist or returns an error, awards are silently skipped.

## Development

It's one HTML file. Open it in a browser with query params:

```
file:///path/to/index.html?demo
file:///path/to/index.html?call=W1AW
```

Demo mode uses fake data so you can iterate on the theme without API calls.

## License

MIT — do whatever you want with it.

73 de Conor
