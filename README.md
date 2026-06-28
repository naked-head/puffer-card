# Puffer Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/naked-head/puffer-card.svg)](https://github.com/naked-head/puffer-card/releases)
[![Validate](https://github.com/naked-head/puffer-card/actions/workflows/validate.yml/badge.svg)](https://github.com/naked-head/puffer-card/actions/workflows/validate.yml)
[![License](https://img.shields.io/github/license/naked-head/puffer-card.svg)](LICENSE)

A custom [Home Assistant](https://www.home-assistant.io/) **Lovelace card** that
visually represents a **buffer tank / hot-water cylinder** (a "puffer") used for
heating and domestic hot water. It shows up to three temperatures at different
heights and colors the tank according to the real thermal stratification.

<img src="https://raw.githubusercontent.com/naked-head/puffer-card/main/images/standard.png" alt="Puffer Card – standard layout" width="420">

## Features

- Shows **1 to 3 temperatures**; with fewer than three values they are spread
  evenly over the tank height.
- **Color-coded stratification**: each level is colored from blue (cold) to red
  (hot), based on configurable `min`/`max` temperatures.
- **Customizable labels**, with sensible localized defaults.
- **Two layouts**: `normal` (full tank) and `compact` (mini tank + value list).
- **Option to hide labels** and show values only.
- Click any value to open the entity's **more-info** dialog.
- Built-in **graphical editor** — no YAML required.
- **Multilingual** UI (English / Italian) following Home Assistant's language.
- Adapts to Home Assistant **themes**.

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=naked-head&repository=puffer-card&category=plugin)

### HACS (recommended)

1. Open **HACS** → top-right menu → **Custom repositories**.
2. Add `https://github.com/naked-head/puffer-card` with category **Dashboard**.
3. Search for **Puffer Card**, install it, and reload.
4. The Lovelace resource is registered automatically.

### Manual

1. Copy the `dist/` content so that `puffer-card.js` and the `translations/`
   folder stay together, e.g. `/config/www/puffer-card/`:
   ```
   /config/www/puffer-card/
   ├── puffer-card.js
   └── translations/
       ├── en.json
       └── it.json
   ```
2. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**:
   - URL: `/local/puffer-card/puffer-card.js`
   - Type: **JavaScript Module**
3. Reload the page.

> Keep the folder structure intact: the card loads its translation files
> relative to its own URL. The Lit framework is loaded from a CDN on first run
> and then cached by the browser.

##  Configuration

Add a card to your dashboard, search for **Puffer Card**, and use the visual
editor — or configure it in YAML:

```yaml
type: custom:puffer-card
name: Heating buffer
layout: normal          # "normal" or "compact"
show_labels: true       # set to false to show values only
min_temp: 20            # temperature mapped to the cold color
max_temp: 80            # temperature mapped to the hot color
top:
  entity: sensor.buffer_top
  label: Flow
middle:
  entity: sensor.buffer_middle
  label: Storage
bottom:
  entity: sensor.buffer_bottom
  label: Return
```

To show **fewer than three values**, simply omit the positions you don't need
(for example only `top` and `bottom`). The displayed values are then
distributed evenly over the tank.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | string | – | `custom:puffer-card` (required) |
| `name` | string | localized | Card title; leave empty to hide it |
| `layout` | string | `normal` | `normal` (full tank) or `compact` (mini tank + list) |
| `show_labels` | boolean | `true` | Show or hide the labels next to each value |
| `min_temp` | number | `20` | Temperature mapped to the cold color |
| `max_temp` | number | `80` | Temperature mapped to the hot color |
| `top` / `middle` / `bottom` | object | – | A measuring point: `{ entity, label }` |
| `*.entity` | string | – | Temperature entity (`sensor`, `number` or `input_number`) |
| `*.label` | string | localized | Label shown next to the value |
| `unit` | string | from entity / `°C` | Force the unit of measurement |

## Layouts

### Normal

The full tank with value badges on the side.

<iMITmg src="https://raw.githubusercontent.com/naked-head/puffer-card/main/images/standard.png" alt="Normal layout" width="420">

### Compact

A small tank next to a compact list of values — ideal for dense dashboards.

<img src="https://raw.githubusercontent.com/naked-head/puffer-card/main/images/compact.png" alt="Compact layout" width="420">

### Values only (labels hidden)

With `show_labels: false` the labels are removed. In the compact layout the
values move next to the tank.

<img src="https://raw.githubusercontent.com/naked-head/puffer-card/main/images/compact-no-labels.png" alt="Compact layout without labels" width="420">

### Even distribution

When you configure one or two values, they are evenly distributed over the tank
height instead of staying at the extremes.

<img src="https://raw.githubusercontent.com/naked-head/puffer-card/main/images/two-sensors.png" alt="Two values evenly distributed" width="420">

## Color scale

Each temperature is mapped to a color between `min_temp` (blue) and `max_temp`
(red), passing through cyan, amber and orange. Tune `min_temp` / `max_temp` to
match your system so the colors are meaningful for your typical operating range.

## License

MIT — see [LICENSE](LICENSE)

## Acknowledgements

Built with the assistance of [Claude](https://claude.ai) by Anthropic.
