# POTA Stats // GoldSrc Edition

A POTA stats widget themed after the Half-Life GoldSource engine. Embed it on your QRZ page.

Inspired by [WD4DAN's POTA Stats](https://pota-stats.wd4dan.net/?help).

## Embed on QRZ

1. Go to your QRZ page → **Edit Biography**
2. Click the **Source** button in the editor
3. Copy/paste the line below, replacing `YOURCALL` with your callsign

```html
<p><iframe src="https://potastats.brimbis.workers.dev/?call=YOURCALL" height="500" width="960" frameborder="0" scrolling="no"></iframe></p>
```

That's it. You may need to adjust the `height` value for your page.

## Options

Add `&options=` to the URL for different views:

| Embed | Code |
|-------|------|
| **Condensed** | `?call=YOURCALL&options=condensed` |
| **Hunter Only** | `?call=YOURCALL&options=hunteronly` |
| **Activator Only** | `?call=YOURCALL&options=activatoronly` |
| **Activator Condensed** | `?call=YOURCALL&options=activatoronly,condensed` |

## Source

Built with Cloudflare Workers. Data from [pota.app](https://pota.app). [MIT License](LICENSE).
