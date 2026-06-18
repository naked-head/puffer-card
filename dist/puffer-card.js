/**
 * Puffer Card
 * Custom Lovelace card that visually represents a buffer tank / hot-water
 * cylinder with 1 to 3 temperatures placed at different heights.
 *
 * Repo: https://github.com/naked-head/puffer-card
 * License: MIT
 */

import {
  LitElement,
  html,
  css,
  svg,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js";

const VERSION = "1.0.0";

/* -------------------------------------------------------------------------- */
/*  Localization                                                              */
/*  Translations live in external files: ./translations/<lang>.json           */
/* -------------------------------------------------------------------------- */

const _i18n = {}; // lang -> dict | null
const _i18nPromise = {}; // lang -> Promise (de-duplicates concurrent loads)

function i18nUrl(lang) {
  return new URL(`./translations/${lang}.json`, import.meta.url);
}

function loadLanguage(lang) {
  if (_i18nPromise[lang]) return _i18nPromise[lang];
  _i18nPromise[lang] = fetch(i18nUrl(lang))
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((data) => {
      _i18n[lang] = data;
      return data;
    });
  return _i18nPromise[lang];
}

/** Candidate languages, from most specific to the English fallback. */
function langCandidates(hass) {
  const raw = (hass && (hass.locale?.language || hass.language)) || "en";
  const base = raw.split("-")[0];
  return [...new Set([raw, base, "en"])];
}

/**
 * Built-in English fallback. Used only when the external language file has not
 * loaded yet (or could not be fetched), so the UI never shows raw keys.
 * The external files in ./translations/ remain the source of truth and the
 * place to add or edit languages.
 */
const FALLBACK_EN = {
  name: "Card title",
  min_temp: "Min temperature (cold color)",
  max_temp: "Max temperature (hot color)",
  entity: "Temperature entity",
  label: "Label",
  pos_top: "Top position",
  pos_middle: "Middle position",
  pos_bottom: "Bottom position",
  layout: "Layout",
  layout_normal: "Standard",
  layout_compact: "Compact",
  show_labels: "Show labels",
  default_title: "Buffer tank",
  label_top: "Flow",
  label_middle: "Storage",
  label_bottom: "Return",
};

/** Translate a key for the active language, with graceful fallback. */
function localize(hass, key) {
  for (const l of langCandidates(hass)) {
    const dict = _i18n[l];
    if (dict && dict[key] != null) return dict[key];
  }
  return FALLBACK_EN[key] ?? key;
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

// Logical slots, ordered from top to bottom.
const POSITIONS = [
  { key: "top", labelKey: "label_top" },
  { key: "middle", labelKey: "label_middle" },
  { key: "bottom", labelKey: "label_bottom" },
];

/** Evenly distributed vertical offsets (0 = top, 1 = bottom) for n values. */
function evenOffsets(n) {
  if (n <= 1) return [0.5];
  if (n === 2) return [0.3, 0.7];
  return [0.12, 0.5, 0.88];
}

const fireEvent = (node, type, detail = {}) => {
  const event = new Event(type, { bubbles: true, composed: true, cancelable: false });
  event.detail = detail;
  node.dispatchEvent(event);
};

/** Linear interpolation between two hex colors. */
function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = ah >> 16,
    ag = (ah >> 8) & 255,
    ab = ah & 255;
  const br = bh >> 16,
    bg = (bh >> 8) & 255,
    bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Cold -> hot color ramp: blue, cyan, amber, orange, red. */
const TEMP_RAMP = [
  [0.0, "#1565c0"],
  [0.3, "#29b6f6"],
  [0.55, "#ffca28"],
  [0.78, "#fb8c00"],
  [1.0, "#e53935"],
];

/** Map a temperature to a ramp color, clamped between min and max. */
function tempColor(t, min, max) {
  if (t === null || isNaN(t)) return "#9e9e9e";
  let f = (t - min) / (max - min);
  f = Math.max(0, Math.min(1, f));
  for (let i = 1; i < TEMP_RAMP.length; i++) {
    const [p0, c0] = TEMP_RAMP[i - 1];
    const [p1, c1] = TEMP_RAMP[i];
    if (f <= p1) return lerpColor(c0, c1, (f - p0) / (p1 - p0));
  }
  return TEMP_RAMP[TEMP_RAMP.length - 1][1];
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

class PufferCard extends LitElement {
  static get properties() {
    return {
      hass: { attribute: false },
      _config: { state: true },
    };
  }

  static getConfigElement() {
    return document.createElement("puffer-card-editor");
  }

  static async getStubConfig(hass) {
    // Make sure the active language is available so defaults are localized.
    await Promise.all(langCandidates(hass).map(loadLanguage));
    const temps = hass
      ? Object.keys(hass.states).filter(
          (e) =>
            e.startsWith("sensor.") &&
            hass.states[e].attributes.device_class === "temperature"
        )
      : [];
    return {
      type: "custom:puffer-card",
      name: localize(hass, "default_title"),
      layout: "normal",
      show_labels: true,
      min_temp: 20,
      max_temp: 80,
      top: { entity: temps[0] || "", label: localize(hass, "label_top") },
      middle: { entity: temps[1] || "", label: localize(hass, "label_middle") },
      bottom: { entity: temps[2] || "", label: localize(hass, "label_bottom") },
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { min_temp: 20, max_temp: 80, layout: "normal", show_labels: true, ...config };
  }

  getCardSize() {
    return this._config && this._config.layout === "compact" ? 2 : 5;
  }

  /* ---- i18n ------------------------------------------------------------- */

  _loadI18n() {
    this._reqLangs = this._reqLangs || new Set();
    langCandidates(this.hass).forEach((l) => {
      if (this._reqLangs.has(l)) return;
      this._reqLangs.add(l);
      loadLanguage(l).then(() => this.requestUpdate());
    });
  }

  /* ---- data ------------------------------------------------------------- */

  _stateOf(cfg) {
    if (!cfg || !cfg.entity || !this.hass) return null;
    return this.hass.states[cfg.entity] || null;
  }

  /** Configured positions, with evenly distributed offsets and resolved labels. */
  _data() {
    const present = POSITIONS.map((p) => {
      const cfg = this._config[p.key];
      if (!cfg || !cfg.entity) return null;
      const st = this._stateOf(cfg);
      const raw = st ? Number(st.state) : NaN;
      const available =
        st && st.state !== "unavailable" && st.state !== "unknown";
      const unit =
        (st && st.attributes && st.attributes.unit_of_measurement) ||
        this._config.unit ||
        "°C";
      const label =
        (cfg.label && cfg.label.toString()) || localize(this.hass, p.labelKey);
      return {
        ...p,
        cfg,
        unit,
        label,
        available,
        temp: available && !isNaN(raw) ? raw : null,
      };
    }).filter(Boolean);

    const offs = evenOffsets(present.length);
    return present.map((p, i) => ({ ...p, off: offs[i] }));
  }

  _format(t) {
    const r = Math.round(t * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    fireEvent(this, "hass-more-info", { entityId });
  }

  /** Build gradient stops + bottom color from the configured temperatures. */
  _gradient(data, min, max) {
    let stops = data
      .filter((p) => p.temp !== null)
      .map((p) => ({ off: p.off, color: tempColor(p.temp, min, max) }))
      .sort((a, b) => a.off - b.off);

    if (stops.length === 0) {
      stops = [
        { off: 0, color: "#1565c0" },
        { off: 1, color: "#e53935" },
      ];
    } else {
      if (stops[0].off > 0) stops = [{ off: 0, color: stops[0].color }, ...stops];
      const last = stops[stops.length - 1];
      if (last.off < 1) stops = [...stops, { off: 1, color: last.color }];
    }
    return { stops, bottomColor: stops[stops.length - 1].color };
  }

  /* ---- render: shared defs --------------------------------------------- */

  _defs(stops, gradId) {
    return svg`
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          ${stops.map(
            (s) =>
              svg`<stop offset="${s.off * 100}%" stop-color="${s.color}"></stop>`
          )}
        </linearGradient>
        <linearGradient id="lidGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#cfd8dc"></stop>
          <stop offset="50%" stop-color="#eceff1"></stop>
          <stop offset="100%" stop-color="#b0bec5"></stop>
        </linearGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(255,255,255,0.40)"></stop>
          <stop offset="35%" stop-color="rgba(255,255,255,0.06)"></stop>
          <stop offset="100%" stop-color="rgba(0,0,0,0.14)"></stop>
        </linearGradient>
        <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4"
                        flood-color="rgba(0,0,0,0.25)"></feDropShadow>
        </filter>
      </defs>`;
  }

  /* ---- render: normal layout ------------------------------------------- */

  _y(off) {
    // Liquid area spans y 48 -> 252 (height 204).
    return 48 + off * 204;
  }

  _badge(p, min, max, showLabels) {
    const y = this._y(p.off);
    const color = tempColor(p.temp, min, max);
    const val = p.temp === null ? "—" : this._format(p.temp);
    const valY = showLabels ? y + 16 : y + 8;
    return svg`
      <g class="badge" @click=${() => this._moreInfo(p.cfg.entity)}>
        <line x1="46" y1="${y}" x2="174" y2="${y}"
              stroke="rgba(255,255,255,0.55)" stroke-width="1.5"
              stroke-dasharray="4 4"></line>
        <line x1="180" y1="${y}" x2="212" y2="${y}"
              stroke="var(--divider-color, #cfd8dc)" stroke-width="2"></line>
        <circle cx="180" cy="${y}" r="4.5" fill="${color}"></circle>
        <rect x="212" y="${y - 25}" width="156" height="50" rx="13"
              fill="var(--card-background-color, #fff)"
              stroke="var(--divider-color, #cfd8dc)" stroke-width="1"></rect>
        <circle cx="226" cy="${showLabels ? y - 9 : y}" r="4" fill="${color}"></circle>
        ${showLabels
          ? svg`<text x="237" y="${y - 5}" class="lbl">${p.label}</text>`
          : ""}
        <text x="${showLabels ? 226 : 240}" y="${valY}" class="val" fill="${color}">${val}<tspan class="unit" dx="3">${p.unit}</tspan></text>
      </g>`;
  }

  _renderNormal(data, min, max, showLabels) {
    const { stops, bottomColor } = this._gradient(data, min, max);
    return html`
      <svg viewBox="0 0 380 300" width="100%" preserveAspectRatio="xMidYMid meet">
        ${this._defs(stops, "liquidGrad")}
        <rect x="101" y="18" width="18" height="34" rx="3" fill="#9fb0b8"></rect>
        <rect x="101" y="250" width="18" height="28" rx="3" fill="#9fb0b8"></rect>
        <rect x="176" y="92" width="34" height="11" rx="3" fill="#9fb0b8"></rect>
        <rect x="176" y="200" width="34" height="11" rx="3" fill="#9fb0b8"></rect>
        <g filter="url(#ds)">
          <ellipse cx="110" cy="252" rx="70" ry="15" fill="${bottomColor}"></ellipse>
          <rect x="40" y="48" width="140" height="204" fill="url(#liquidGrad)"></rect>
          <rect x="40" y="48" width="140" height="204" fill="url(#sheen)"></rect>
          <path d="M40,252 A70,15 0 0 0 180,252"
                fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2"></path>
          <line x1="40" y1="48" x2="40" y2="252" stroke="rgba(0,0,0,0.18)" stroke-width="2"></line>
          <line x1="180" y1="48" x2="180" y2="252" stroke="rgba(0,0,0,0.18)" stroke-width="2"></line>
          <line x1="42" y1="120" x2="178" y2="120" stroke="rgba(255,255,255,0.18)" stroke-width="3"></line>
          <line x1="42" y1="184" x2="178" y2="184" stroke="rgba(255,255,255,0.18)" stroke-width="3"></line>
          <ellipse cx="110" cy="48" rx="70" ry="15" fill="url(#lidGrad)"
                   stroke="rgba(0,0,0,0.18)" stroke-width="1.5"></ellipse>
        </g>
        ${data.map((p) => this._badge(p, min, max, showLabels))}
      </svg>
    `;
  }

  /* ---- render: compact layout ------------------------------------------ */

  _miniTank(data, min, max) {
    const { stops, bottomColor } = this._gradient(data, min, max);
    const y = (off) => 14 + off * 96; // liquid area 14 -> 110
    return svg`
      <svg viewBox="0 0 84 124" width="64" preserveAspectRatio="xMidYMid meet">
        ${this._defs(stops, "liquidGrad")}
        <g filter="url(#ds)">
          <ellipse cx="42" cy="110" rx="26" ry="7" fill="${bottomColor}"></ellipse>
          <rect x="16" y="14" width="52" height="96" fill="url(#liquidGrad)"></rect>
          <rect x="16" y="14" width="52" height="96" fill="url(#sheen)"></rect>
          <line x1="16" y1="14" x2="16" y2="110" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"></line>
          <line x1="68" y1="14" x2="68" y2="110" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"></line>
          <path d="M16,110 A26,7 0 0 0 68,110" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"></path>
          <ellipse cx="42" cy="14" rx="26" ry="7" fill="url(#lidGrad)"
                   stroke="rgba(0,0,0,0.18)" stroke-width="1"></ellipse>
        </g>
        ${data.map(
          (p) => svg`<circle cx="68" cy="${y(p.off)}" r="3.5"
                       fill="${tempColor(p.temp, min, max)}"
                       stroke="#fff" stroke-width="1"></circle>`
        )}
      </svg>
    `;
  }

  _renderCompact(data, min, max, showLabels) {
    return html`
      <div class="compact">
        <div class="mini">${this._miniTank(data, min, max)}</div>
        <div class="rows">
          ${data.map((p) => {
            const color = tempColor(p.temp, min, max);
            const val = p.temp === null ? "—" : this._format(p.temp);
            return html`
              <div class="row ${showLabels ? "" : "no-labels"}"
                   @click=${() => this._moreInfo(p.cfg.entity)}>
                ${showLabels
                  ? html`<span class="dot" style="background:${color}"></span>
                         <span class="rlabel">${p.label}</span>`
                  : ""}
                <span class="rval" style="color:${color}">${val}<span class="runit">${p.unit}</span></span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  /* ---- render ----------------------------------------------------------- */

  render() {
    if (!this._config) return html``;
    this._loadI18n();

    const min = Number(this._config.min_temp);
    const max =
      Number(this._config.max_temp) > min ? Number(this._config.max_temp) : min + 1;
    const data = this._data();
    const compact = this._config.layout === "compact";
    const showLabels = this._config.show_labels !== false;

    return html`
      <ha-card class=${compact ? "is-compact" : ""}>
        ${this._config.name
          ? html`<div class="title">${this._config.name}</div>`
          : ""}
        <div class="container">
          ${compact
            ? this._renderCompact(data, min, max, showLabels)
            : this._renderNormal(data, min, max, showLabels)}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        padding: 12px 12px 8px;
        overflow: hidden;
      }
      ha-card.is-compact {
        padding: 10px 14px;
      }
      .title {
        font-size: 1.15rem;
        font-weight: 600;
        color: var(--primary-text-color);
        padding: 4px 4px 0;
      }
      .is-compact .title {
        font-size: 1rem;
        padding: 0 0 6px;
      }
      .container {
        width: 100%;
      }
      svg {
        display: block;
        max-height: 360px;
      }
      /* normal layout badges */
      .badge {
        cursor: pointer;
      }
      .badge:hover rect {
        stroke: var(--primary-color);
      }
      .lbl {
        fill: var(--secondary-text-color, #727272);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .val {
        font-size: 21px;
        font-weight: 700;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .unit {
        font-size: 11px;
        font-weight: 600;
      }
      /* compact layout */
      .compact {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .compact .mini {
        flex: 0 0 auto;
      }
      .compact .mini svg {
        max-height: 124px;
      }
      .rows {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 8px;
      }
      .row:hover {
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      }
      .dot {
        flex: 0 0 auto;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .rlabel {
        flex: 1 1 auto;
        color: var(--primary-text-color);
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rval {
        flex: 0 0 auto;
        margin-left: auto;
        font-weight: 700;
        font-size: 1.15rem;
      }
      .row.no-labels .rval {
        margin-left: 0;
      }
      .runit {
        font-size: 0.75rem;
        font-weight: 600;
        margin-left: 2px;
      }
    `;
  }
}

/* -------------------------------------------------------------------------- */
/*  Editor (graphical configuration UI)                                       */
/* -------------------------------------------------------------------------- */

class PufferCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { attribute: false },
      _config: { state: true },
    };
  }

  setConfig(config) {
    this._config = config;
  }

  _loadI18n() {
    this._reqLangs = this._reqLangs || new Set();
    langCandidates(this.hass).forEach((l) => {
      if (this._reqLangs.has(l)) return;
      this._reqLangs.add(l);
      loadLanguage(l).then(() => this.requestUpdate());
    });
  }

  /** Build the ha-form schema with localized titles and options. */
  _schema() {
    const sub = [
      {
        name: "entity",
        selector: { entity: { domain: ["sensor", "number", "input_number"] } },
      },
      { name: "label", selector: { text: {} } },
    ];
    return [
      { name: "name", selector: { text: {} } },
      {
        name: "layout",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "normal", label: localize(this.hass, "layout_normal") },
              { value: "compact", label: localize(this.hass, "layout_compact") },
            ],
          },
        },
      },
      { name: "show_labels", selector: { boolean: {} } },
      {
        type: "grid",
        schema: [
          { name: "min_temp", selector: { number: { mode: "box", step: 1, unit_of_measurement: "°C" } } },
          { name: "max_temp", selector: { number: { mode: "box", step: 1, unit_of_measurement: "°C" } } },
        ],
      },
      { name: "top", type: "expandable", title: localize(this.hass, "pos_top"), expanded: true, schema: sub },
      { name: "middle", type: "expandable", title: localize(this.hass, "pos_middle"), schema: sub },
      { name: "bottom", type: "expandable", title: localize(this.hass, "pos_bottom"), schema: sub },
    ];
  }

  _computeLabel = (schema) => {
    const keys = ["name", "layout", "show_labels", "min_temp", "max_temp", "entity", "label"];
    return keys.includes(schema.name)
      ? localize(this.hass, schema.name)
      : schema.name;
  };

  _valueChanged(ev) {
    ev.stopPropagation();
    const config = { ...ev.detail.value };
    if (!config.type) config.type = "custom:puffer-card";
    fireEvent(this, "config-changed", { config });
  }

  render() {
    if (!this._config || !this.hass) return html``;
    this._loadI18n();
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema()}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

/* -------------------------------------------------------------------------- */
/*  Registration                                                              */
/* -------------------------------------------------------------------------- */

customElements.define("puffer-card", PufferCard);
customElements.define("puffer-card-editor", PufferCardEditor);

// Preload English so labels are available for the card picker / first paint.
loadLanguage("en");

window.customCards = window.customCards || [];
window.customCards.push({
  type: "puffer-card",
  name: "Puffer Card",
  description:
    "Represents a buffer tank / boiler with 1-3 temperatures at different heights.",
  preview: true,
  documentationURL: "https://github.com/naked-head/puffer-card",
});

console.info(
  `%c PUFFER-CARD %c v${VERSION} `,
  "color:white;background:#1e88e5;font-weight:700;",
  "color:#1e88e5;background:white;font-weight:700;"
);
