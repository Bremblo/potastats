// POTA Stats // GoldSrc Edition — Cloudflare Worker
// Server-side rendered. Zero client-side fetch calls.
// https://github.com/Bremblo/potastats

const API = 'https://api.pota.app';
const MAX_ROWS = 10;
const WIDGET_HOST = 'potastats.brimbis.workers.dev'; // Update to your worker URL

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const params = url.searchParams;

    const callsign = (params.get('call') || params.get('callsign') || '').toUpperCase().trim();
    const optionsRaw = (params.get('options') || '').toLowerCase();
    const options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
    const isCondensed = options.includes('condensed');
    const isHunterOnly = options.includes('hunteronly');
    const isActivatorOnly = options.includes('activatoronly');
    const showHelp = params.has('help');

    // Help page or no callsign
    if (showHelp || !callsign) {
      return htmlResponse(renderPage(helpContent(), isCondensed));
    }

    // Fetch data server-side
    let stats = null;
    let activations = null;
    let hunterQsos = null;

    // 1. User stats
    try {
      const r = await fetch(`${API}/stats/user/${encodeURIComponent(callsign)}`);
      if (r.ok) stats = await r.json();
    } catch (e) { /* fail gracefully */ }

    if (!stats) {
      return htmlResponse(renderPage(errorContent(callsign, 'Could not retrieve stats. Verify callsign is registered at pota.app'), isCondensed));
    }

    // 2. Recent activations — probe endpoints
    const actEndpoints = [
      `${API}/profile/activations/${encodeURIComponent(callsign)}`,
      `${API}/profile/${encodeURIComponent(callsign)}/activations`,
      `${API}/user/activations/${encodeURIComponent(callsign)}`,
    ];
    for (const ep of actEndpoints) {
      try {
        const r = await fetch(ep);
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d) && d.length > 0) { activations = d; break; }
        }
      } catch (e) { /* try next */ }
    }

    // 3. Recent hunter QSOs — probe endpoints
    const huntEndpoints = [
      `${API}/profile/hunter/qsos/${encodeURIComponent(callsign)}`,
      `${API}/profile/${encodeURIComponent(callsign)}/hunter/qsos`,
      `${API}/user/hunter/${encodeURIComponent(callsign)}`,
    ];
    for (const ep of huntEndpoints) {
      try {
        const r = await fetch(ep);
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d) && d.length > 0) { hunterQsos = d; break; }
        }
      } catch (e) { /* try next */ }
    }

    // Build body
    const body = buildBody(callsign, stats, activations, hunterQsos, { isCondensed, isHunterOnly, isActivatorOnly });
    return htmlResponse(renderPage(body, isCondensed));
  }
};

// ─── HTML Response Helper ───
function htmlResponse(html) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 min cache
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ─── Build the main stats body ───
function buildBody(call, stats, activations, hunterQsos, opts) {
  const act = stats.activator || {};
  const hunt = stats.hunter || {};
  const name = stats.name || '';

  let html = '';

  // Header
  html += `
    <div class="gs-panel gs-header"><div class="gs-panel-inner">
      <div class="lambda">λ</div>
      <div class="header-text">
        <div class="header-title">POTA STATS</div>
        <div class="header-sub">GOLDSRC EDITION // PARKS ON THE AIR${name ? ' // ' + esc(name) : ''}</div>
      </div>
      <div class="header-callsign">${esc(call)}</div>
    </div></div>
  `;

  // ── ACTIVATOR ──
  if (!opts.isHunterOnly) {
    const a_act = v(act, 'activations', 'activation_count', 'activationCount');
    const a_parks = v(act, 'parks', 'park_count', 'parkCount', 'uniqueParks');
    const a_qsos = v(act, 'qsos', 'qso_count', 'qsoCount', 'totalQsos');

    html += `
      <div class="gs-panel"><div class="gs-panel-inner">
        <div class="section-title">ACTIVATOR STATS</div>
        <div class="stat-bar stat-bar-header">
          <div class="stat-bar-cell">Activations</div>
          <div class="stat-bar-cell">Parks</div>
          <div class="stat-bar-cell">QSOs</div>
        </div>
        <div class="stat-bar stat-bar-values">
          <div class="stat-bar-cell">${num(a_act)}</div>
          <div class="stat-bar-cell">${num(a_parks)}</div>
          <div class="stat-bar-cell">${num(a_qsos)}</div>
        </div>
      </div></div>
    `;

    if (activations && activations.length > 0) {
      html += renderActivationsTable(activations);
    }
  }

  // ── HUNTER ──
  if (!opts.isActivatorOnly) {
    const h_parks = v(hunt, 'parks', 'park_count', 'parkCount', 'uniqueParks');
    const h_qsos = v(hunt, 'qsos', 'qso_count', 'qsoCount', 'totalQsos');

    html += `
      <div class="gs-panel"><div class="gs-panel-inner">
        <div class="section-title">HUNTER STATS</div>
        <div class="stat-bar stat-bar-header">
          <div class="stat-bar-cell">Parks</div>
          <div class="stat-bar-cell">QSOs</div>
        </div>
        <div class="stat-bar stat-bar-values">
          <div class="stat-bar-cell">${num(h_parks)}</div>
          <div class="stat-bar-cell">${num(h_qsos)}</div>
        </div>
      </div></div>
    `;

    if (hunterQsos && hunterQsos.length > 0) {
      html += renderHunterTable(hunterQsos);
    }
  }

  // Footer
  html += `
    <div class="gs-footer">
      DATA FROM <a href="https://pota.app/#/profile/${esc(call)}" target="_blank" rel="noopener">POTA.APP</a>
      &middot; GOLDSRC THEME &middot;
      <a href="https://github.com/Bremblo/potastats" target="_blank" rel="noopener">SOURCE</a>
      &middot; <a href="?help">HELP</a>
    </div>
  `;

  return html;
}

// ─── Recent Activations Table ───
function renderActivationsTable(rows) {
  const limited = rows.slice(0, MAX_ROWS);
  let trs = '';
  for (const r of limited) {
    const date  = v(r, 'date', 'qso_date', 'activation_date', 'activeDate') || '';
    const ref   = v(r, 'reference', 'ref', 'parkReference', 'park_reference') || '';
    const loc   = v(r, 'locationDesc', 'location', 'loc', 'locationName', 'grid') || '';
    const pname = v(r, 'name', 'parkName', 'park_name', 'parkname', 'title') || '';
    const cw    = v(r, 'cw', 'qso_cw', 'cwQsos', 'cw_contacts');
    const dt    = v(r, 'data', 'digital', 'qso_data', 'dataQsos', 'data_contacts');
    const ph    = v(r, 'phone', 'ssb', 'qso_phone', 'phoneQsos', 'phone_contacts');
    const total = v(r, 'total', 'totalQsos', 'total_contacts', 'qsos', 'qso_count');

    trs += `<tr>
      <td>${esc(fmtDate(date))}</td>
      <td><a href="https://pota.app/#/park/${esc(ref)}" target="_blank" rel="noopener">${esc(ref)}</a></td>
      <td>${esc(loc)}</td>
      <td class="park-name">${esc(pname)}</td>
      <td class="num mode-cw">${dash(cw)}</td>
      <td class="num mode-data">${dash(dt)}</td>
      <td class="num mode-phone">${dash(ph)}</td>
      <td class="num">${dash(total)}</td>
    </tr>`;
  }

  return `
    <div class="gs-panel"><div class="gs-panel-inner">
      <div class="section-title">RECENT ACTIVATIONS</div>
      <table class="gs-table">
        <thead><tr>
          <th>Date</th><th>Ref</th><th>Loc</th><th>Park Name</th>
          <th class="right">CW</th><th class="right">Data</th><th class="right">Phone</th><th class="right">Total</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div></div>
  `;
}

// ─── Recent Hunter QSOs Table ───
function renderHunterTable(rows) {
  const limited = rows.slice(0, MAX_ROWS);
  let trs = '';
  for (const r of limited) {
    const date  = v(r, 'date', 'qso_date', 'qsoDate') || '';
    const call  = v(r, 'callsign', 'activator', 'stationCallsign', 'station_callsign', 'call') || '';
    const ref   = v(r, 'reference', 'ref', 'parkReference', 'park_reference') || '';
    const loc   = v(r, 'locationDesc', 'location', 'loc', 'locationName') || '';
    const pname = v(r, 'name', 'parkName', 'park_name', 'parkname', 'title') || '';
    const band  = v(r, 'band', 'qso_band') || '';
    const mode  = v(r, 'mode', 'qso_mode') || '';

    trs += `<tr>
      <td>${esc(fmtDate(date))}</td>
      <td>${esc(call)}</td>
      <td><a href="https://pota.app/#/park/${esc(ref)}" target="_blank" rel="noopener">${esc(ref)}</a></td>
      <td>${esc(loc)}</td>
      <td class="park-name">${esc(pname)}</td>
      <td>${esc(band)}</td>
      <td>${esc(mode)}</td>
    </tr>`;
  }

  return `
    <div class="gs-panel"><div class="gs-panel-inner">
      <div class="section-title">RECENT HUNTER QSOs</div>
      <table class="gs-table">
        <thead><tr>
          <th>Date</th><th>Callsign</th><th>Ref</th><th>Loc</th><th>Park Name</th><th>Band</th><th>Mode</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div></div>
  `;
}

// ─── Help Content ───
function helpContent() {
  const h = WIDGET_HOST;
  return `
    <div class="gs-panel gs-header"><div class="gs-panel-inner">
      <div class="lambda">λ</div>
      <div class="header-text">
        <div class="header-title">POTA STATS // GOLDSRC</div>
        <div class="header-sub">HELP &amp; EMBEDDING GUIDE</div>
      </div>
    </div></div>
    <div class="gs-panel"><div class="gs-panel-inner help-section">
      <h2>► EMBED ON YOUR QRZ PAGE</h2>
      <p>Edit your QRZ biography, click "Source" in the editor, and paste a snippet below.
      Replace <code>YOURCALL</code> with your callsign.</p>

      <p style="color:var(--text-amber);">NORMAL</p>
      <div class="code-block">&lt;p&gt;&lt;iframe src="https://${esc(h)}/?call=YOURCALL" height="1200" width="960" frameborder="0" scrolling="no"&gt;&lt;/iframe&gt;&lt;/p&gt;</div>

      <p style="color:var(--text-amber);">CONDENSED</p>
      <div class="code-block">&lt;p&gt;&lt;iframe src="https://${esc(h)}/?call=YOURCALL&amp;options=condensed" height="1000" width="960" frameborder="0" scrolling="no"&gt;&lt;/iframe&gt;&lt;/p&gt;</div>

      <p style="color:var(--text-amber);">HUNTER ONLY</p>
      <div class="code-block">&lt;p&gt;&lt;iframe src="https://${esc(h)}/?call=YOURCALL&amp;options=hunteronly" height="600" width="960" frameborder="0" scrolling="no"&gt;&lt;/iframe&gt;&lt;/p&gt;</div>

      <p style="color:var(--text-amber);">ACTIVATOR ONLY</p>
      <div class="code-block">&lt;p&gt;&lt;iframe src="https://${esc(h)}/?call=YOURCALL&amp;options=activatoronly" height="700" width="960" frameborder="0" scrolling="no"&gt;&lt;/iframe&gt;&lt;/p&gt;</div>

      <div class="gs-sep" style="margin:16px 0;"></div>

      <h2>► URL PARAMETERS</h2>
      <ul>
        <li><code>call</code> — Your callsign (required)</li>
        <li><code>options</code> — Comma-separated: <code>condensed</code>, <code>hunteronly</code>, <code>activatoronly</code></li>
        <li><code>help</code> — This page</li>
      </ul>

      <div class="gs-sep" style="margin:16px 0;"></div>

      <h2>► ABOUT</h2>
      <p>Open-source POTA stats widget with a GoldSource engine theme.<br>
      Data fetched server-side via Cloudflare Worker. No client-side API calls.<br>
      Works in any iframe, including QRZ.com.<br>
      Inspired by <a href="https://pota-stats.wd4dan.net/?help" target="_blank" rel="noopener" style="color:var(--text-amber);">WD4DAN's POTA Stats</a>.</p>
      <p style="color:var(--text-gray);font-size:11px;margin-top:12px;">
        Source: <a href="https://github.com/Bremblo/potastats" target="_blank" rel="noopener" style="color:var(--text-amber-dim);">github.com/Bremblo/potastats</a>
        &middot; 73 de Conor, KF8CNK
      </p>
    </div></div>
    <div class="gs-footer">GOLDSRC POTA STATS &middot; <a href="https://${esc(h)}" target="_blank" rel="noopener">${esc(h)}</a></div>
  `;
}

// ─── Error Content ───
function errorContent(call, msg) {
  return `
    <div class="gs-panel gs-header"><div class="gs-panel-inner">
      <div class="lambda">λ</div>
      <div class="header-text">
        <div class="header-title">POTA STATS</div>
        <div class="header-sub">GOLDSRC EDITION</div>
      </div>
      <div class="header-callsign">${esc(call)}</div>
    </div></div>
    <div class="gs-panel"><div class="gs-panel-inner">
      <div class="status-msg error">ERROR: ${esc(msg)}</div>
    </div></div>
  `;
}

// ─── Full page wrapper with CSS ───
function renderPage(bodyContent, isCondensed) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>POTA Stats // GoldSrc</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-dark: #0a0a08;
  --bg-panel: #1a1a14;
  --bg-panel-inner: #111110;
  --bg-highlight: #2a2a1a;
  --bg-table-row: #14140f;
  --bg-table-row-alt: #1a1a12;
  --bg-table-header: #222218;
  --border-outer: #3a3a28;
  --border-inner: #222218;
  --border-bevel-light: #4a4a34;
  --border-bevel-dark: #0d0d08;
  --text-amber: #ff8c00;
  --text-amber-dim: #b86800;
  --text-amber-bright: #ffaa22;
  --text-green: #4aff4a;
  --text-green-dim: #2a9a2a;
  --text-white: #ccccaa;
  --text-gray: #666650;
  --accent-lambda: #ff6600;
}

body {
  background: var(--bg-dark);
  color: var(--text-amber);
  font-family: 'Courier New', Consolas, 'Lucida Console', monospace;
  font-size: 13px;
  line-height: 1.4;
  overflow-x: hidden;
  -webkit-font-smoothing: none;
}

body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px);
  pointer-events: none;
  z-index: 9999;
}

body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%);
  pointer-events: none;
  z-index: 9998;
}

#app {
  max-width: 960px;
  margin: 0 auto;
  padding: 8px;
}

.gs-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-outer);
  border-top-color: var(--border-bevel-light);
  border-left-color: var(--border-bevel-light);
  border-bottom-color: var(--border-bevel-dark);
  border-right-color: var(--border-bevel-dark);
  margin-bottom: 6px;
}

.gs-panel-inner {
  background: var(--bg-panel-inner);
  border: 1px solid var(--border-inner);
  border-top-color: var(--border-bevel-dark);
  border-left-color: var(--border-bevel-dark);
  border-bottom-color: var(--border-bevel-light);
  border-right-color: var(--border-bevel-light);
  margin: 3px;
  padding: 10px 14px;
}

.gs-header .gs-panel-inner {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.lambda {
  color: var(--accent-lambda);
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
  text-shadow: 0 0 8px rgba(255,102,0,0.5), 0 0 20px rgba(255,102,0,0.2);
  font-family: Georgia, serif;
}

.header-text { flex: 1; }

.header-title {
  color: var(--text-amber-bright);
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 6px rgba(255,140,0,0.3);
}

.header-sub {
  color: var(--text-gray);
  font-size: 11px;
  letter-spacing: 1px;
  margin-top: 2px;
}

.header-callsign {
  color: var(--text-green);
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(74,255,74,0.3);
}

.section-title {
  color: var(--text-amber-bright);
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-align: center;
  padding: 6px 0;
  background: var(--bg-highlight);
  border-bottom: 1px solid var(--border-outer);
  margin: -10px -14px 10px;
}

.gs-sep {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--text-amber-dim), transparent);
  margin: 8px 0;
  opacity: 0.4;
}

.stat-bar {
  display: flex;
  border: 1px solid var(--border-inner);
}

.stat-bar-cell {
  flex: 1;
  text-align: center;
  padding: 4px 8px;
  border-right: 1px solid var(--border-inner);
}

.stat-bar-cell:last-child { border-right: none; }

.stat-bar-header {
  background: var(--bg-table-header);
}

.stat-bar-header .stat-bar-cell {
  color: var(--text-amber);
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.stat-bar-values .stat-bar-cell {
  color: var(--text-green);
  font-size: 15px;
  font-weight: bold;
  background: var(--bg-table-row);
  text-shadow: 0 0 4px rgba(74,255,74,0.15);
}

.gs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 8px;
}

.gs-table th {
  background: var(--bg-table-header);
  color: var(--text-amber);
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border-outer);
  white-space: nowrap;
}

.gs-table th.right, .gs-table td.right { text-align: right; }

.gs-table td {
  padding: 4px 8px;
  color: var(--text-white);
  border-bottom: 1px solid rgba(34,34,24,0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-table td.park-name {
  white-space: normal;
  word-break: break-word;
  max-width: 240px;
}

.gs-table tr:nth-child(even) td { background: var(--bg-table-row); }
.gs-table tr:nth-child(odd) td { background: var(--bg-table-row-alt); }
.gs-table tr:hover td { background: var(--bg-highlight); }

.gs-table td.num {
  color: var(--text-green);
  text-align: right;
  font-weight: bold;
}

.gs-table td.mode-cw { color: #66bbff; }
.gs-table td.mode-data { color: #66ff66; }
.gs-table td.mode-phone { color: #ffcc66; }

.gs-table a { color: var(--text-amber-dim); text-decoration: none; }
.gs-table a:hover { color: var(--text-amber-bright); text-decoration: underline; }

.status-msg {
  text-align: center;
  padding: 30px;
  color: var(--text-amber-dim);
  font-size: 14px;
  letter-spacing: 2px;
}
.status-msg.error { color: #ff4444; }

.gs-footer {
  text-align: center;
  padding: 6px;
  color: var(--text-gray);
  font-size: 10px;
  letter-spacing: 1px;
}
.gs-footer a { color: var(--text-amber-dim); text-decoration: none; }
.gs-footer a:hover { color: var(--text-amber); text-decoration: underline; }

.help-section { padding: 16px; }
.help-section h2 { color: var(--text-amber-bright); font-size: 15px; letter-spacing: 2px; margin-bottom: 10px; }
.help-section p, .help-section li { color: var(--text-white); font-size: 12px; line-height: 1.6; margin-bottom: 8px; }
.help-section code { background: var(--bg-dark); color: var(--text-green); padding: 2px 6px; border: 1px solid var(--border-inner); font-size: 11px; word-break: break-all; }
.help-section ul { list-style: none; padding-left: 16px; }
.help-section li::before { content: '► '; color: var(--accent-lambda); font-size: 9px; }
.code-block { background: var(--bg-dark); border: 1px solid var(--border-outer); padding: 10px 14px; margin: 8px 0 14px; overflow-x: auto; font-size: 11px; color: var(--text-green); line-height: 1.5; white-space: pre-wrap; word-break: break-all; }

${isCondensed ? `
.gs-panel-inner { padding: 6px 10px; }
.section-title { margin: -6px -10px 6px; padding: 4px 0; font-size: 11px; }
.gs-table { font-size: 11px; }
.gs-table th, .gs-table td { padding: 3px 6px; }
.stat-bar-values .stat-bar-cell { font-size: 13px; }
.header-title { font-size: 13px; }
.header-callsign { font-size: 18px; }
.lambda { font-size: 24px; }
` : ''}
</style>
</head>
<body>
<div id="app">
${bodyContent}
</div>
</body>
</html>`;
}

// ─── Utilities ───
function v(obj, ...keys) {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

function num(x) {
  if (x === undefined || x === null) return '—';
  const n = Number(x);
  return isNaN(n) ? esc(String(x)) : n.toLocaleString('en-US');
}

function dash(x) { return (x === undefined || x === null) ? '—' : String(x); }
function fmtDate(d) { return d ? String(d).substring(0, 10) : ''; }

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
